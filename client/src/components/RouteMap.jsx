import { MapContainer, TileLayer, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

function Fit({ coords, start }) {
  const map = useMap();
  useEffect(() => { if (coords?.length) map.fitBounds(coords, { padding: [30, 30] }); else if (start) map.setView([start.lat, start.lng], 15); }, [coords, start, map]);
  return null;
}
function Picker({ onPick }) { useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) }); return null; }

export default function RouteMap({ start, coords, onPick, meeting, me }) {
  return (
    <MapContainer center={start ? [start.lat, start.lng] : [20.5937, 78.9629]} zoom={start ? 15 : 5} className="h-[340px] w-full rounded-lg border border-line md:h-[480px]">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {coords && <Polyline positions={coords} pathOptions={{ color: '#2E5B3F', weight: 5, opacity: 0.9 }} />}
      {start && <CircleMarker center={[start.lat, start.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#CF8A3C', fillOpacity: 1 }} />}
      {meeting && <CircleMarker center={[meeting.lat, meeting.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2E5B3F', fillOpacity: 1 }} />}
      {me && <CircleMarker center={[me.lat, me.lng]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#CF8A3C', fillOpacity: 1 }} />}
      <Fit coords={coords} start={start} />
      {onPick && <Picker onPick={onPick} />}
    </MapContainer>
  );
}
