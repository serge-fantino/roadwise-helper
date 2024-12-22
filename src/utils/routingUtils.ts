export async function getRoute(start: [number, number], end: [number, number]): Promise<[number, number][]> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
    );
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error('Unable to find route');
    }
    
    // OSRM returns coordinates in [longitude, latitude] format, we need to swap them
    return data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
}