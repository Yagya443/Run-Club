// OSRM-compatible router (public FOSSGIS foot server by default; set ROUTING_BASE_URL to self-host).
// waypoints: [[lat,lng],...] -> { distanceM, coords:[[lat,lng],...] }
export async function osrmRoute(waypoints) {
  const base = process.env.ROUTING_BASE_URL || 'https://routing.openstreetmap.de/routed-foot';
  const profile = process.env.ROUTING_PROFILE || 'driving';
  const path = waypoints.map(([la, ln]) => `${ln.toFixed(6)},${la.toFixed(6)}`).join(';');
  const url = `${base}/route/v1/${profile}/${path}?overview=full&geometries=geojson&continue_straight=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'RunClub/0.1' } });
  if (!res.ok) throw new Error(`Routing service responded ${res.status}`);
  const j = await res.json();
  if (j.code !== 'Ok' || !j.routes?.length) throw new Error(`No route: ${j.code}`);
  return { distanceM: j.routes[0].distance, coords: j.routes[0].geometry.coordinates.map(([ln, la]) => [la, ln]) };
}
