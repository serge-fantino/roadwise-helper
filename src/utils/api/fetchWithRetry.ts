const TIMEOUT = 10000; // Increased to 10 seconds
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
}

export async function fetchWithTimeout(url: string, options: FetchWithRetryOptions = {}): Promise<Response> {
  const { timeout = TIMEOUT, ...fetchOptions } = options;
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutPromise = new Promise<Response>((_, reject) => {
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out after ${timeout}ms`));
    }, timeout);

    // Clean up the timeout if the fetch completes
    signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true });
  });

  try {
    const fetchPromise = fetch(url, {
      ...fetchOptions,
      signal,
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request aborted: ${error.message}`);
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
        { error }
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    console.error('All retry attempts failed:', error);
    throw error;
  }
}