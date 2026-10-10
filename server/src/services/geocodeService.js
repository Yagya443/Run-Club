export async function geocode(q) {
  const base = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
  const ua = `RunClub/0.1 (${process.env.NOMINATIM_CONTACT || 'contact not set'})`; // Nominatim usage policy requires this
  const res = await fetch(`${base}/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) { const e = new Error('Address search is unavailable. Drop a pin on the map instead.'); e.status = 502; throw e; }
  return (await res.json()).map((p) => ({ label: p.display_name, lat: +p.lat, lng: +p.lon }));
}

// Coarse place name for a point (used for meeting points). Returns null on any failure.
export async function reverseArea(lat, lng) {
  const base = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
  const ua = `RunClub/0.1 (${process.env.NOMINATIM_CONTACT || 'contact not set'})`;
  try {
    const r = await fetch(`${base}/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(6000) });
    const j = await r.json(); const a = j.address || {};
    return a.leisure || a.park || a.road || a.neighbourhood || a.suburb || j.name || null;
  } catch { return null; }
}
