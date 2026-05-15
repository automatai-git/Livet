// ... existing imports
import React, { useState, useEffect } from 'react';
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
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
