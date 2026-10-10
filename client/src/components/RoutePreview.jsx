// Tiny SVG of a route (already privacy-trimmed by the server). No map tiles, so it's cheap in lists.
export default function RoutePreview({ coords }) {
  if (!coords?.length) return <div className="h-24 rounded-lg bg-sage-light" />;
  const k = Math.cos((coords[0][0] * Math.PI) / 180);
  const pts = coords.map(([la, ln]) => [ln * k, -la]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min(180 / ((x1 - x0) || 1e-6), 76 / ((y1 - y0) || 1e-6));
  const ox = (200 - (x1 - x0) * s) / 2, oy = (88 - (y1 - y0) * s) / 2;
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(ox + (x - x0) * s).toFixed(1)} ${(oy + (y - y0) * s).toFixed(1)}`).join('');
  return <svg viewBox="0 0 200 88" className="h-24 w-full rounded-lg bg-sage-light" role="img" aria-label="Route preview"><path d={d} fill="none" stroke="#2E5B3F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
