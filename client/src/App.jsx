import { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Protected, ProtectedBare } from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Discover from './pages/Discover.jsx';
import Clubs from './pages/Clubs.jsx';
import ClubDetail from './pages/ClubDetail.jsx';
import History from './pages/History.jsx';
import Profile from './pages/Profile.jsx';
// Map-heavy pages load on demand to keep the first load small.
const Plan = lazy(() => import('./pages/Plan.jsx'));
const RunDetail = lazy(() => import('./pages/RunDetail.jsx'));
const RunSummary = lazy(() => import('./pages/RunSummary.jsx'));
const ActiveRun = lazy(() => import('./pages/ActiveRun.jsx'));

const NotFound = () => <main className="mx-auto max-w-md p-8"><h1 className="text-3xl font-bold">Page not found</h1><p className="mt-2 text-stone">That page doesn’t exist.</p><Link to="/" className="btn-primary mt-4">Go home</Link></main>;

export default function App() {
  return (
    <Suspense fallback={<p className="p-8 text-stone" role="status">Loading…</p>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/runs/:id/active" element={<ProtectedBare><ActiveRun /></ProtectedBare>} />
        <Route element={<Protected />}>
          <Route path="/home" element={<Dashboard />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/runs/:id/summary" element={<RunSummary />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/u/:id" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
