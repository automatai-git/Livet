import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MenuPlanner from './pages/MenuPlanner';
import Timeline from './pages/Timeline';
import Mobility from './pages/Mobility';
import WorkoutFinder from './pages/WorkoutFinder';
import ColourPalette from './pages/ColourPalette';
import BucketList from './pages/BucketList';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/menu" element={<MenuPlanner />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/mobility" element={<Mobility />} />
          <Route path="/workout" element={<WorkoutFinder />} />
          <Route path="/colour" element={<ColourPalette />} />
          <Route path="/bucket" element={<BucketList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
