const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchWithRetry = async (
  url: string, 
  options: RequestInit, 
  retries = 3, 
  initialDelay = 1000,
  timeout = 30000
) => {
  const fetchWithTimeout = async (url: string, options: RequestInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Accept': 'application/json',
          'User-Agent': 'DriverAssistant/1.0',
        },
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  let lastError;
  let currentDelay = initialDelay;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      if (response.ok) return response;
      
      if (response.status === 429) {
        console.log(`Rate limited, retrying in ${currentDelay}ms...`);
        await delay(currentDelay);
        currentDelay *= 2; // Exponential backoff
        continue;
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      console.log(`Request failed (attempt ${i + 1}/${retries}), retrying in ${currentDelay}ms...`, error);
      lastError = error;
      
      if (i < retries - 1) {
        await delay(currentDelay);
        currentDelay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError || new Error('All retries failed');
};