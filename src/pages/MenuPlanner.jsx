import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import WeeklyMenu from '../components/meal-planner/WeeklyMenu';
import MealDatabase from '../components/meal-planner/MealDatabase';
import AppShellV3, { ScopePill } from '../components/AppShellV3';

const MenuPlanner = () => {
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' or 'database'
  const [databaseMeals, setDatabaseMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(true);

  // The page owns the meal collection so an edit in the database tab is
  // reflected in the weekly dropdowns and the shopping list immediately,
  // without a re-fetch on every tab switch.
  useEffect(() => {
    let cancelled = false;
    supabase.from('meals').select('*').order('name').then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error('Error fetching meals', error);
      else if (data) setDatabaseMeals(data);
      setLoadingMeals(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleMealSaved = useCallback((meal) => {
    if (!meal) return;
    setDatabaseMeals((prev) => {
      const without = prev.filter((m) => m.id !== meal.id);
      return [...without, meal].sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
      );
    });
  }, []);

  const handleMealDeleted = useCallback((id) => {
    setDatabaseMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

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
        {activeTab === 'database' && (
          <MealDatabase
            meals={databaseMeals}
            loading={loadingMeals}
            onSaved={handleMealSaved}
            onDeleted={handleMealDeleted}
          />
        )}
      </div>
    </AppShellV3>
  );
};

export default MenuPlanner;
