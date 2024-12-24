const TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 3;

export async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      const delay = Math.pow(2, MAX_RETRIES - retries) * 1000;
      console.log(`Request failed (attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`, { error });
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}