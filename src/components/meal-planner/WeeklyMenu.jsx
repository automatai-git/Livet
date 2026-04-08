import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyMenu = ({ databaseMeals }) => {
  const [weeklyMenu, setWeeklyMenu] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyMenu();
  }, []);

  const fetchWeeklyMenu = async () => {
    setLoading(true);
    // Fetch weekly menu joined with meals for Dinner
    const { data, error } = await supabase
      .from('weekly_menu')
      .select('id, day_of_week, meal_type, meals ( id, name, emoji, ingredients )')
      .eq('meal_type', 'Dinner');

    if (error) {
      console.error('Error fetching weekly menu', error);
    } else if (data) {
      const menuMap = {};
      data.forEach(item => {
        menuMap[item.day_of_week] = item;
      });
      setWeeklyMenu(menuMap);
    }
    setLoading(false);
  };

  const handleAssignMeal = async (day, mealId) => {
    const existing = weeklyMenu[day];

    if (!mealId) {
      // If unassigned, delete the record
      if (existing) {
        await supabase.from('weekly_menu').delete().eq('id', existing.id);
        setWeeklyMenu(prev => {
          const newMenu = { ...prev };
          delete newMenu[day];
          return newMenu;
        });
      }
      return;
    }

    const payload = {
      day_of_week: day,
      meal_type: 'Dinner',
      meal_id: mealId
    };

    if (existing) {
      // Update
      const { data, error } = await supabase.from('weekly_menu').update({ meal_id: mealId }).eq('id', existing.id).select('*, meals(*)').single();
      if (!error && data) {
        setWeeklyMenu(prev => ({ ...prev, [day]: data }));
      }
    } else {
      // Insert
      const { data, error } = await supabase.from('weekly_menu').insert([payload]).select('*, meals(*)').single();
      if (!error && data) {
        setWeeklyMenu(prev => ({ ...prev, [day]: data }));
      }
    }
  };

  const exportShoppingList = () => {
    let allIngredients = [];
    
    Object.values(weeklyMenu).forEach(menuItem => {
      if (menuItem && menuItem.meals && menuItem.meals.ingredients) {
        let ingList = [];
        try {
          ingList = JSON.parse(menuItem.meals.ingredients);
        } catch (e) {
          if (Array.isArray(menuItem.meals.ingredients)) {
             ingList = menuItem.meals.ingredients;
          }
        }
        if (Array.isArray(ingList)) {
          allIngredients = [...allIngredients, ...ingList];
        }
      }
    });

    if (allIngredients.length === 0) {
      alert("No ingredients found in this week's meals!");
      return;
    }

    // Deduplicate and format
    const uniqueIngredients = [...new Set(allIngredients.map(i => i.trim().toLowerCase()))];
    
    // Apple Notes checkable format
    const textBlob = `Shopping List (Week)\n\n` + uniqueIngredients.map(ing => `- [ ] ${ing}`).join('\n');

    navigator.clipboard.writeText(textBlob).then(() => {
      alert("Shopping list copied to clipboard! Paste it directly into Apple Notes.");
    }).catch(() => {
      alert("Failed to copy. Please allow clipboard permissions.");
    });
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="heading-serif" style={{ fontSize: '1.5rem' }}>Weekly Dinner Menu</h2>
        <button 
          onClick={exportShoppingList}
          style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Export Shopping List
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading schedule...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DAYS_OF_WEEK.map(day => {
            const currentItem = weeklyMenu[day];
            const currentMeal = currentItem?.meals;
            
            return (
              <div key={day} style={{ background: 'var(--card)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '100px', fontWeight: 'bold' }}>{day}</div>
                
                <div style={{ flex: 1 }}>
                  <select 
                    value={currentItem?.meal_id || ''} 
                    onChange={e => handleAssignMeal(day, e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  >
                    <option value="">-- No meal assigned --</option>
                    {databaseMeals.map(meal => (
                      <option key={meal.id} value={meal.id}>
                        {meal.emoji} {meal.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeeklyMenu;
