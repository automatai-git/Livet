import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import WeeklyMenu from '../components/meal-planner/WeeklyMenu';
import MealDatabase from '../components/meal-planner/MealDatabase';
import AppShellV3, { ScopePill } from '../components/AppShellV3';

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

  const tabs = [
    { id: 'weekly', label: 'Weekly menu' },
    { id: 'database', label: 'Meal database' },
  ];

  return (
    <AppShellV3
      app="menu"
      scope={
        <div className="scope-row" role="tablist" aria-label="Menu sections">
          {tabs.map((t) => (
            <ScopePill
              key={t.id}
              on={activeTab === t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              aria-controls={`menu-panel-${t.id}`}
              id={`menu-tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </ScopePill>
          ))}
        </div>
      }
    >
      <div role="tabpanel" id="menu-panel-weekly" aria-labelledby="menu-tab-weekly" hidden={activeTab !== 'weekly'}>
        {activeTab === 'weekly' && <WeeklyMenu databaseMeals={databaseMeals} />}
      </div>
      <div role="tabpanel" id="menu-panel-database" aria-labelledby="menu-tab-database" hidden={activeTab !== 'database'}>
        {activeTab === 'database' && <MealDatabase />}
      </div>
    </AppShellV3>
  );
};

export default MenuPlanner;
