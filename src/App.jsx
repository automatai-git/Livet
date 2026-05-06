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
            <Route path="/" element={<Dashboard />} />
            <Route path="/menu" element={<MenuPlanner />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/mobility" element={<Mobility />} />
            <Route path="/workout/*" element={<WorkoutFinder />} />
            <Route path="/colour" element={<ColourPalette />} />
            <Route path="/bucket" element={<BucketList />} />
            <Route path="/travel" element={<TravelPlanner />} />
            <Route path="/decision" element={<DecisionMatrix />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
