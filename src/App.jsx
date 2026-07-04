// ... existing imports
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MenuPlanner from './pages/MenuPlanner';
import Timeline from './pages/Timeline';
import Mobility from './pages/Mobility';
import WorkoutFinder from './pages/WorkoutFinder';
import ColourPalette from './pages/ColourPalette';
import BucketList from './pages/BucketList';
import TravelPlanner from './pages/TravelPlanner';
import DecisionMatrix from './pages/DecisionMatrix';
import { supabase } from './services/supabase';
import Auth from './components/meal-planner/Auth';
import ErrorBoundary from './components/feedback/ErrorBoundary';
import LoadingState from './components/feedback/LoadingState';

// Code-split the Audiobook Prep tool: it pulls in pdf.js + JSZip (~1 MB), which
// no other page needs, so we only load that chunk when the user opens /book.
const BookConverter = lazy(() => import('./pages/BookConverter'));

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
          <Routes>
            <Route path="/" element={<ErrorBoundary key="dashboard"><Dashboard /></ErrorBoundary>} />
            <Route path="/menu" element={<ErrorBoundary key="menu"><MenuPlanner /></ErrorBoundary>} />
            <Route path="/timeline" element={<ErrorBoundary key="timeline"><Timeline /></ErrorBoundary>} />
            <Route path="/mobility" element={<ErrorBoundary key="mobility"><Mobility /></ErrorBoundary>} />
            <Route path="/workout/*" element={<ErrorBoundary key="workout"><WorkoutFinder /></ErrorBoundary>} />
            <Route path="/colour" element={<ErrorBoundary key="colour"><ColourPalette /></ErrorBoundary>} />
            <Route path="/bucket" element={<ErrorBoundary key="bucket"><BucketList /></ErrorBoundary>} />
            <Route path="/travel/*" element={<ErrorBoundary key="travel"><TravelPlanner /></ErrorBoundary>} />
            <Route path="/decision" element={<ErrorBoundary key="decision"><DecisionMatrix /></ErrorBoundary>} />
            <Route path="/book" element={<ErrorBoundary key="book"><Suspense fallback={<LoadingState label="Loading converter…" />}><BookConverter /></Suspense></ErrorBoundary>} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
