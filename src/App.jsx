import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Today from './pages/Today';
import Apps from './pages/Apps';
import Life from './pages/Life';
import You from './pages/You';
import MenuPlanner from './pages/MenuPlanner';
import Timeline from './pages/Timeline';
import Mobility from './pages/Mobility';
import WorkoutFinder from './pages/WorkoutFinder';
import ColourPalette from './pages/ColourPalette';
import BucketList from './pages/BucketList';
import TravelPlanner from './pages/TravelPlanner';
import DecisionMatrix from './pages/DecisionMatrix';
import Books from './pages/Books';
import { supabase } from './services/supabase';
import { recordOpen } from './lib/appUsage';
import { usageRouteFor } from './data/appRegistry';
import Auth from './components/meal-planner/Auth';
import ErrorBoundary from './components/feedback/ErrorBoundary';

// Records one open per sub-app route mount — feeds the usage-based sorting
// on Today ("Most used") and the Apps directory.
const UsageTracker = () => {
  const { pathname } = useLocation();
  const last = useRef(null);
  useEffect(() => {
    const route = usageRouteFor(pathname);
    if (route && route !== last.current) recordOpen(route);
    last.current = route;
  }, [pathname]);
  return null;
};

// Instant tab switches that keep each screen's scroll position: remember
// scroll continuously per path, restore it when a path is revisited.
const scrollPositions = new Map();
const ScrollMemory = () => {
  const { pathname } = useLocation();
  const current = useRef(pathname);
  useEffect(() => {
    const save = () => scrollPositions.set(current.current, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);
  useEffect(() => {
    current.current = pathname;
    window.scrollTo(0, scrollPositions.get(pathname) ?? 0);
  }, [pathname]);
  return null;
};

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div className="app-container">
        {!session ? (
          <Auth onLogin={(sess) => setSession(sess)} />
        ) : (
          <>
            <UsageTracker />
            <ScrollMemory />
            <Routes>
              <Route path="/" element={<ErrorBoundary key="today"><Today /></ErrorBoundary>} />
              <Route path="/apps" element={<ErrorBoundary key="apps"><Apps /></ErrorBoundary>} />
              <Route path="/life" element={<ErrorBoundary key="life"><Life /></ErrorBoundary>} />
              <Route path="/you" element={<ErrorBoundary key="you"><You /></ErrorBoundary>} />
              <Route path="/menu" element={<ErrorBoundary key="menu"><MenuPlanner /></ErrorBoundary>} />
              <Route path="/timeline" element={<ErrorBoundary key="timeline"><Timeline /></ErrorBoundary>} />
              <Route path="/mobility" element={<ErrorBoundary key="mobility"><Mobility /></ErrorBoundary>} />
              <Route path="/workout/*" element={<ErrorBoundary key="workout"><WorkoutFinder /></ErrorBoundary>} />
              <Route path="/colour" element={<ErrorBoundary key="colour"><ColourPalette /></ErrorBoundary>} />
              <Route path="/bucket" element={<ErrorBoundary key="bucket"><BucketList /></ErrorBoundary>} />
              <Route path="/travel/*" element={<ErrorBoundary key="travel"><TravelPlanner /></ErrorBoundary>} />
              <Route path="/decision" element={<ErrorBoundary key="decision"><DecisionMatrix /></ErrorBoundary>} />
              <Route path="/books" element={<ErrorBoundary key="books"><Books /></ErrorBoundary>} />
            </Routes>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;
