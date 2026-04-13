import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyMenu = ({ databaseMeals }) => {
  const [weeklyMenu, setWeeklyMenu] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [showMealSelector, setShowMealSelector] = useState(null); // stores the day name
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWeeklyMenu();
  }, []);

  const fetchWeeklyMenu = async () => {
    setLoading(true);
    // Fetch weekly menu joined with meals for Dinner
    const { data, error } = await supabase
      .from('weekly_menu')
      .select('id, day_of_week, meal_type, meal_id, meals ( id, name, emoji, ingredients )')
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
    e.dataTransfer.setData("sourceDay", sourceDay || "");
    e.dataTransfer.effectAllowed = "move";

    // Create a ghost image or just set opacity
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDragOverDay(null);
  };

  const handleDrop = async (e, targetDay) => {
    e.preventDefault();
    setDragOverDay(null);
    const mealId = e.dataTransfer.getData("mealId");
    const sourceDay = e.dataTransfer.getData("sourceDay");

    if (!mealId) return;

    if (sourceDay && sourceDay !== targetDay) {
      // Moving from one day to another
      const targetMealId = weeklyMenu[targetDay]?.meal_id || weeklyMenu[targetDay]?.meals?.id;

      // Perform the assignment
      await handleAssignMeal(targetDay, mealId);

      if (targetMealId) {
        // If there was a meal at target, move it back to source (Swap)
        await handleAssignMeal(sourceDay, targetMealId);
      } else {
        // Just move and clear source
        await handleAssignMeal(sourceDay, null);
      }
    } else if (!sourceDay) {
      // Dragged from the pool
      await handleAssignMeal(targetDay, mealId);
    }
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    if (dragOverDay !== day) {
      setDragOverDay(day);
    }
  };

  const filteredMeals = databaseMeals.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2 className="heading-serif" style={{ fontSize: '1.5rem' }}>Weekly Dinner Menu</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsLocked(!isLocked)}
            style={{ background: isLocked ? 'var(--bg)' : 'var(--warning, #e6b800)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLocked ? '🔒 Unlock Edit' : '🔓 Lock Menu'}
          </button>
          <button
            onClick={exportShoppingList}
            style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Export Shopping List
          </button>
        </div>
      </div>

      {!isLocked && (
        <>
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
        </>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading schedule...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
          {DAYS_OF_WEEK.map(day => {
            const currentItem = weeklyMenu[day];
            const currentMeal = currentItem?.meals;
            const isOver = dragOverDay === day;

            return (
              <div
                key={day}
                onDragOver={!isLocked ? (e) => handleDragOver(e, day) : undefined}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={!isLocked ? (e) => handleDrop(e, day) : undefined}
                style={{
                  background: isOver ? 'var(--primary-light)' : 'var(--card)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  transition: 'all 0.2s ease',
                  border: isOver ? '2px solid var(--primary)' : '2px solid transparent'
                }}
              >
                <div style={{ width: '100px', fontWeight: 'bold', color: isOver ? '#fff' : 'inherit' }}>{day}</div>

                <div style={{
                  flex: 1,
                  minHeight: '45px',
                  background: currentMeal ? (isOver ? 'rgba(255,255,255,0.2)' : '#3A5A40') : (isOver ? 'rgba(255,255,255,0.1)' : 'var(--bg)'),
                  border: currentMeal ? 'none' : '1px dashed var(--border)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 15px',
                  color: currentMeal ? '#fff' : 'var(--text-muted)',
                  position: 'relative'
                }}>
                  {currentMeal ? (
                    <div
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStart(e, day, currentMeal.id)}
                      onDragEnd={handleDragEnd}
                      style={{ cursor: isLocked ? 'default' : 'grab', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', padding: '5px 0' }}
                    >
                      <span style={{ fontWeight: 600 }}>{currentMeal.emoji} {currentMeal.name}</span>
                      {!isLocked && (
                        <button onClick={() => handleAssignMeal(day, null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      )}
                    </div>
                  ) : (
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{isLocked ? "No meal planned" : "Drag a meal here..."}</span>
                      {!isLocked && (
                        <button
                          onClick={() => setShowMealSelector(day)}
                          style={{ background: 'var(--primary)', color: '#fff', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Meal Selector Overlay */}
          {showMealSelector && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowMealSelector(null)}>
              <div
                style={{ background: 'var(--bg)', width: '100%', maxWidth: '450px', borderRadius: '20px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '15px' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="heading-serif">Add to {showMealSelector}</h3>
                  <button onClick={() => setShowMealSelector(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>

                <input
                  autoFocus
                  placeholder="Search meals..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
                />

                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
                  {filteredMeals.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No meals found matching "{searchQuery}"</p>
                  ) : (
                    filteredMeals.map(meal => (
                      <button
                        key={meal.id}
                        onClick={() => {
                          handleAssignMeal(showMealSelector, meal.id);
                          setShowMealSelector(null);
                          setSearchQuery('');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', width: '100%' }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <span style={{ fontSize: '1.5rem' }}>{meal.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{meal.name}</div>
                          {meal.cuisine && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meal.cuisine}</div>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyMenu;
