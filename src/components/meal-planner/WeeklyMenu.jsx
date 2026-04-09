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

  const handleDragStart = (e, sourceDay, mealId) => {
    e.dataTransfer.setData("mealId", mealId);
    e.dataTransfer.setData("sourceDay", sourceDay || ""); // empty means it came from database list
  };

  const handleDrop = async (e, targetDay) => {
    e.preventDefault();
    const mealId = e.dataTransfer.getData("mealId");
    const sourceDay = e.dataTransfer.getData("sourceDay");

    if (!mealId) return;

    if (sourceDay && sourceDay !== targetDay) {
       // Moving from one day to another
       await handleAssignMeal(targetDay, mealId);
       await handleAssignMeal(sourceDay, null);
    } else if (!sourceDay) {
       // Dragged from the pool
       await handleAssignMeal(targetDay, mealId);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // needed to allow drop
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2 className="heading-serif" style={{ fontSize: '1.5rem' }}>Weekly Dinner Menu</h2>
        <button 
          onClick={exportShoppingList}
          style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Export Shopping List
        </button>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
        Drag meals from your collection onto a day, or slide them across different days.
      </p>

      {/* Database Pool (Draggable source) */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '15px', background: 'var(--card)', borderRadius: '12px', marginBottom: '25px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)' }}>
        {databaseMeals.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No meals in database yet!</span>}
        {databaseMeals.map(meal => (
          <div 
            key={meal.id} 
            draggable 
            onDragStart={(e) => handleDragStart(e, null, meal.id)}
            style={{ padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', cursor: 'grab', whiteSpace: 'nowrap', fontWeight: 600 }}
          >
            {meal.emoji} {meal.name}
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading schedule...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DAYS_OF_WEEK.map(day => {
            const currentItem = weeklyMenu[day];
            const currentMeal = currentItem?.meals;
            
            return (
              <div 
                key={day} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
                style={{ background: 'var(--card)', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', transition: 'background 0.2s ease' }}
              >
                <div style={{ width: '100px', fontWeight: 'bold' }}>{day}</div>
                
                <div style={{ flex: 1, minHeight: '45px', background: currentMeal ? '#3A5A40' : 'var(--bg)', border: currentMeal ? 'none' : '1px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 15px', color: currentMeal ? '#fff' : 'var(--text-muted)' }}>
                  {currentMeal ? (
                    <div 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, day, currentMeal.id)}
                      style={{ cursor: 'grab', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', padding: '5px 0' }}
                    >
                      <span style={{ fontWeight: 600 }}>{currentMeal.emoji} {currentMeal.name}</span>
                      <button onClick={() => handleAssignMeal(day, null)} style={{background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>✕</button>
                    </div>
                  ) : (
                    "Drag a meal here..."
                  )}
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
