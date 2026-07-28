import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import WeeklyMenu from '../components/meal-planner/WeeklyMenu';
import MealDatabase from '../components/meal-planner/MealDatabase';
import AppShell from '../components/AppShell';

const MenuPlanner = () => {
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' or 'database'
  const [databaseMeals, setDatabaseMeals] = useState([]);

  // Fetch all meals so they can be passed to the weekly menu dropdowns;
  // re-fetch on tab switch so edits in the database tab show up in weekly.
  useEffect(() => {
    let cancelled = false;
    supabase.from('meals').select('*').order('name').then(({ data, error }) => {
      if (!cancelled && !error && data) setDatabaseMeals(data);
    });
    return () => { cancelled = true; };
  }, [activeTab]);

  const tabBtn = (id, label) => (
    <button
      role="tab"
      aria-selected={activeTab === id}
      aria-controls={`menu-panel-${id}`}
      id={`menu-tab-${id}`}
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', minHeight: 44,
        background: activeTab === id ? 'var(--app-accent)' : 'var(--card)',
        color: activeTab === id ? '#fff' : 'var(--text)', border: 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <AppShell title="Meal Planner" accent="var(--accent-menu)">
      <div role="tablist" aria-label="Menu sections" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('weekly', 'Weekly Menu')}
        {tabBtn('database', 'Meal Database')}
      </div>
      <div role="tabpanel" id="menu-panel-weekly" aria-labelledby="menu-tab-weekly" hidden={activeTab !== 'weekly'}>
        {activeTab === 'weekly' && <WeeklyMenu databaseMeals={databaseMeals} />}
      </div>
      <div role="tabpanel" id="menu-panel-database" aria-labelledby="menu-tab-database" hidden={activeTab !== 'database'}>
        {activeTab === 'database' && <MealDatabase />}
      </div>
    </AppShell>
  );
};

export default MenuPlanner;
