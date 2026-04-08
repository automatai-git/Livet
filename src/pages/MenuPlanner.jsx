import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import WeeklyMenu from '../components/meal-planner/WeeklyMenu';
import MealDatabase from '../components/meal-planner/MealDatabase';
import Auth from '../components/meal-planner/Auth';

const MenuPlanner = () => {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' or 'database'
  const [databaseMeals, setDatabaseMeals] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch all meals so they can be passed to the weekly menu dropdowns
  // and we refresh this list if needed
  useEffect(() => {
    if (session) {
      fetchDatabaseMeals();
    }
  }, [activeTab, session]);

  const fetchDatabaseMeals = async () => {
    setDbLoading(true);
    const { data, error } = await supabase.from('meals').select('*').order('name');
    if (!error && data) {
      setDatabaseMeals(data);
    }
    setDbLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div>
      <div className="sticky-header">
        <div className="header-row">
          <Link to="/" className="back-home">← Dashboard</Link>
          <h1 className="heading-serif">Meal Planner</h1>
          <div style={{ width: '80px', textAlign: 'right' }}>
            {session && (
              <button 
                onClick={handleLogout}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
        
        {session && (
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
        )}
      </div>

      <div style={{ paddingBottom: '40px' }}>
        {!session ? (
           <Auth onLogin={(sess) => setSession(sess)} />
        ) : (
          <>
            {activeTab === 'weekly' && (
              <WeeklyMenu databaseMeals={databaseMeals} />
            )}

            {activeTab === 'database' && (
               <MealDatabase />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MenuPlanner;
