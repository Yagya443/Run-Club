import { Link, Navigate } from 'react-router-dom';
import { MapPin, Route, Users } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Decorative illustration only: it is not a generated route.
function LoopArt() {
  const loop = 'M150 250 C110 190 140 120 210 100 C290 80 340 140 315 200 C295 250 220 285 150 250Z';
  return (
    <svg viewBox="0 0 420 340" className="w-full" role="img" aria-label="Illustration of a loop route starting and ending at home">
      <rect width="420" height="340" rx="10" fill="#E3EBDC" />
      <g fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round"><path d="M0 250 C120 230 220 290 420 220" /><path d="M110 0 C130 120 90 220 150 340" /><path d="M300 0 C280 90 340 180 310 340" /></g>
      <ellipse cx="250" cy="110" rx="60" ry="38" fill="#B4C5A8" /><ellipse cx="90" cy="90" rx="34" ry="24" fill="#B4C5A8" />
      <path d={loop} fill="none" stroke="#2E5B3F" strokeWidth="5" strokeDasharray="1 11" strokeLinecap="round" />
      <circle cx="150" cy="250" r="9" fill="#CF8A3C" stroke="#fff" strokeWidth="3" />
      <g transform="translate(300 60)"><rect width="104" height="40" rx="8" fill="#fff" /><text x="14" y="26" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="18" fill="#2E5B3F">5.0 km loop</text></g>
    </svg>
  );
}

export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/home" replace />;
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-4xl font-bold leading-[1.05] text-ink sm:text-6xl">Tell us how far. We’ll find the route and the people.</h1>
            <p className="mt-5 max-w-md text-lg text-stone">Pick a distance, a start point and a time. Run Club builds a loop from your door and finds nearby runners who want to go at the same hour.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/register" className="btn-primary">Create your account</Link><Link to="/login" className="btn-ghost">Sign in</Link></div>
          </div>
          <LoopArt />
        </section>
        <section className="grid gap-6 border-t border-line py-12 sm:grid-cols-3">
          {[[MapPin, 'Start from home', 'Your route begins and ends where you choose, on real roads and paths.'],
            [Route, 'A loop that fits', 'Ask for 5 km and get as close to 5 km as the streets allow.'],
            [Users, 'Run with company', 'Match with nearby runners by pace, time and distance. Exact addresses stay private.']].map(([I, t, d]) => (
            <div key={t}><I className="text-forest" size={22} /><h2 className="mt-3 text-lg font-bold">{t}</h2><p className="mt-1 text-stone">{d}</p></div>
          ))}
        </section>
      </main>
    </>
  );
}
