import { Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import OfflineBanner from './OfflineBanner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Layout() {
  return <><a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a><Navbar /><OfflineBanner /><main id="main" className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-12"><Outlet /></main></>;
}
export function ProtectedBare({ children }) { // no navbar: the active run screen is full-screen
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-stone">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}
export function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-stone">Loading…</p>;
  return user ? <Layout /> : <Navigate to="/login" replace />;
}
