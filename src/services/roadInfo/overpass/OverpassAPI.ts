const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export const queryOverpass = async (query: string): Promise<any> => {
  console.log('[OverpassAPI] Sending query:', query);
  
  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'DriverAssistant/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[OverpassAPI] Response:', JSON.stringify(data, null, 2));
  return data;
};