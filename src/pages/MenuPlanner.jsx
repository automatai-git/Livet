import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import WeeklyMenu from '../components/meal-planner/WeeklyMenu';
import MealDatabase from '../components/meal-planner/MealDatabase';
import AppShell from '../components/AppShell';

const MenuPlanner = () => {
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' or 'database'
  const [databaseMeals, setDatabaseMeals] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Fetch all meals so they can be passed to the weekly menu dropdowns
  // and we refresh this list if needed
  useEffect(() => {
    fetchDatabaseMeals();
  }, [activeTab]);

  const fetchDatabaseMeals = async () => {
    setDbLoading(true);
    const { data, error } = await supabase.from('meals').select('*').order('name');
    if (!error && data) {
      setDatabaseMeals(data);
    }
    setDbLoading(false);
  };

  const tabBtn = (id, label) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
        background: activeTab === id ? 'var(--app-accent)' : 'var(--card)',
        color: activeTab === id ? '#fff' : 'var(--text)', border: 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <AppShell title="Meal Planner" accent="var(--accent-menu)">
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('weekly', 'Weekly Menu')}
        {tabBtn('database', 'Meal Database')}
      </div>
      {activeTab === 'weekly' && <WeeklyMenu databaseMeals={databaseMeals} />}
      {activeTab === 'database' && <MealDatabase />}
    </AppShell>
  );
};

export default MenuPlanner;
