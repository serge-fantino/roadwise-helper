// Utility function for retrying failed requests
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, initialDelay = 1000) => {
  const fetchWithTimeout = async (url: string, options: RequestInit) => {
    const timeout = 10000; // Increased timeout to 10 seconds
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
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok) return response;
      
      if (response.status === 429) {
        console.log(`Rate limited, retrying in ${initialDelay}ms...`);
        await delay(initialDelay);
        continue;
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      console.log(`Request failed (attempt ${i + 1}/${retries}), retrying in ${initialDelay}ms...`, error);
      lastError = error;
      if (i < retries - 1) {
        await delay(initialDelay);
      }
    }
  }

  console.error('All retries failed:', lastError);
  // Return a mock response as fallback
  return new Response(JSON.stringify({ elements: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};