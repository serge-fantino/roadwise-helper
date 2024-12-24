const TIMEOUT = 30000; // Increased to 30 seconds for slower connections
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
}

export async function fetchWithTimeout(url: string, options: FetchWithRetryOptions = {}): Promise<Response> {
  const { timeout = TIMEOUT, signal: existingSignal, ...fetchOptions } = options;
  
  // Create a new AbortController that will be used for timeout
  const timeoutController = new AbortController();
  const { signal: timeoutSignal } = timeoutController;

  // Create a combined signal if there's an existing one
  const combinedSignal = existingSignal
    ? new AbortController().signal
    : timeoutSignal;

  if (existingSignal) {
    existingSignal.addEventListener('abort', () => timeoutController.abort());
  }

  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
    }
    throw error;
  }
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    console.log(`Attempting request to ${url} (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
    const response = await fetchWithTimeout(url, options);
    
    if (!response.ok) {
      // Handle rate limiting specifically
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_DELAY;
        throw new Error(`Rate limited. Retry after ${delay}ms`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      const delay = Math.min(
        Math.pow(2, MAX_RETRIES - retries) * INITIAL_DELAY,
        30000 // Max 30 seconds delay
      );
      
      console.log(
        `Request failed (attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}), ` +
        `retrying in ${delay}ms...`,
        error
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    console.error('All retry attempts failed:', error);
    throw error;
  }
}