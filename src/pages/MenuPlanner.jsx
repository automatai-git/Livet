import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import WeeklyMenu from '../components/meal-planner/WeeklyMenu';
import MealDatabase from '../components/meal-planner/MealDatabase';

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

  return (
    <div>
      <div className="sticky-header">
        <div className="header-row">
          <Link to="/" className="back-home">← Dashboard</Link>
          <h1 className="heading-serif">Meal Planner</h1>
          <div style={{ width: '80px' }}></div>
        </div>
        
        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button 
            onClick={() => setActiveTab('weekly')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
              background: activeTab === 'weekly' ? 'var(--primary)' : 'var(--card)',
              color: activeTab === 'weekly' ? '#fff' : 'var(--text)', border: 'none'
            }}
          >
            Weekly Menu
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
              background: activeTab === 'database' ? 'var(--primary)' : 'var(--card)',
              color: activeTab === 'database' ? '#fff' : 'var(--text)', border: 'none'
            }}
          >
            Meal Database
          </button>
        </div>
      </div>

      <div style={{ paddingBottom: '40px' }}>
        {activeTab === 'weekly' && (
          <WeeklyMenu databaseMeals={databaseMeals} />
        )}

        {activeTab === 'database' && (
           <MealDatabase />
        )}
      </div>
    </div>
  );
};

export default MenuPlanner;
