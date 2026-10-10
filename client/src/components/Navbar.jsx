import { Link, NavLink } from 'react-router-dom';
import { Home, Compass, Users, User, LogOut, History } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/clubs', label: 'Clubs', icon: Users },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: User },
];
const cls = ({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-sage-light text-forest' : 'text-stone hover:text-ink'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to={user ? '/home' : '/'} aria-label="Run Club home"><Logo /></Link>
          {user ? (
            <>
              <nav className="hidden gap-1 md:flex" aria-label="Main">{links.map((l) => <NavLink key={l.to} to={l.to} className={cls}>{l.label}</NavLink>)}</nav>
              <button onClick={logout} className="btn-ghost !px-3 !py-2" aria-label="Sign out"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
            </>
          ) : (
            <div className="flex gap-2"><Link to="/login" className="btn-ghost !py-2">Sign in</Link><Link to="/register" className="btn-primary !py-2">Join</Link></div>
          )}
        </div>
      </header>
      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
          {links.map(({ to, label, icon: I }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${isActive ? 'text-forest' : 'text-stone'}`}><I size={20} />{label}</NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
