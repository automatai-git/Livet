import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyMenu = ({ databaseMeals }) => {
  const [weeklyMenu, setWeeklyMenu] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [showMealSelector, setShowMealSelector] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shoppingPicker, setShoppingPicker] = useState(null); // { selected: Set<dayName> }

  useEffect(() => { fetchWeeklyMenu(); }, []);

  const fetchWeeklyMenu = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('weekly_menu')
      .select('id, day_of_week, meal_type, meal_id, meals ( id, name, emoji, ingredients )')
      .eq('meal_type', 'Dinner');

    if (error) console.error('Error fetching weekly menu', error);
    else if (data) {
      const menuMap = {};
      data.forEach(item => { menuMap[item.day_of_week] = item; });
      setWeeklyMenu(menuMap);
    }
    setLoading(false);
  };

  const handleAssignMeal = async (day, mealId) => {
    const existing = weeklyMenu[day];
    if (!mealId) {
      if (existing) {
        await supabase.from('weekly_menu').delete().eq('id', existing.id);
        setWeeklyMenu(prev => { const n = { ...prev }; delete n[day]; return n; });
      }
      return;
    }
    if (existing) {
      const { data, error } = await supabase.from('weekly_menu').update({ meal_id: mealId }).eq('id', existing.id).select('*, meals(*)').single();
      if (!error && data) setWeeklyMenu(prev => ({ ...prev, [day]: data }));
    } else {
      const payload = { day_of_week: day, meal_type: 'Dinner', meal_id: mealId };
      const { data, error } = await supabase.from('weekly_menu').insert([payload]).select('*, meals(*)').single();
      if (!error && data) setWeeklyMenu(prev => ({ ...prev, [day]: data }));
    }
  };

  const openShoppingPicker = () => {
    // Default: select every day that has a meal assigned.
    const selected = new Set(
      DAYS_OF_WEEK.filter(day => weeklyMenu[day]?.meals)
    );
    if (selected.size === 0) {
      alert("No meals assigned this week!");
      return;
    }
    setShoppingPicker({ selected });
  };

  const toggleShoppingDay = (day) => {
    setShoppingPicker(prev => {
      if (!prev) return prev;
      const next = new Set(prev.selected);
      next.has(day) ? next.delete(day) : next.add(day);
      return { selected: next };
    });
  };

  const exportShoppingList = () => {
    if (!shoppingPicker) return;
    const days = [...shoppingPicker.selected];
    let allIngredients = [];
    days.forEach(day => {
      const item = weeklyMenu[day];
      if (!item?.meals?.ingredients) return;
      let list = [];
      try { list = JSON.parse(item.meals.ingredients); }
      catch { if (Array.isArray(item.meals.ingredients)) list = item.meals.ingredients; }
      if (Array.isArray(list)) allIngredients = allIngredients.concat(list);
    });

    if (allIngredients.length === 0) {
      alert("Selected meals have no ingredients listed.");
      return;
    }

    const unique = [...new Set(allIngredients.map(i => i.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const text = `Shopping List\n\n` + unique.map(i => `[ ] ${i}`).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied ${unique.length} items from ${days.length} meal(s) to clipboard.`);
      setShoppingPicker(null);
    }).catch(() => alert("Clipboard blocked — please allow clipboard permissions."));
  };

  const handleDragStart = (e, sourceDay, mealId) => {
    e.dataTransfer.setData("mealId", mealId);
    e.dataTransfer.setData("sourceDay", sourceDay || "");
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = '0.5';
  };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; setDragOverDay(null); };

  const handleDrop = async (e, targetDay) => {
    e.preventDefault();
    setDragOverDay(null);
    const mealId = e.dataTransfer.getData("mealId");
    const sourceDay = e.dataTransfer.getData("sourceDay");
    if (!mealId) return;
    if (sourceDay && sourceDay !== targetDay) {
      const targetMealId = weeklyMenu[targetDay]?.meal_id || weeklyMenu[targetDay]?.meals?.id;
      await handleAssignMeal(targetDay, mealId);
      if (targetMealId) await handleAssignMeal(sourceDay, targetMealId);
      else await handleAssignMeal(sourceDay, null);
    } else if (!sourceDay) {
      await handleAssignMeal(targetDay, mealId);
    }
  };
  const handleDragOver = (e, day) => { e.preventDefault(); if (dragOverDay !== day) setDragOverDay(day); };

  const filteredMeals = databaseMeals.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: 8 }}>
        <h2 className="heading-serif" style={{ fontSize: '1.5rem' }}>Weekly Dinner Menu</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsLocked(!isLocked)}
            style={{ background: isLocked ? 'var(--bg)' : '#e6b800', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLocked ? '🔒 Unlock Edit' : '🔓 Lock Menu'}
          </button>
          <button
            onClick={openShoppingPicker}
            style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Shopping List…
          </button>
        </div>
      </div>

      {!isLocked && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
            Drag meals from your collection onto a day, or slide them across days.
          </p>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '15px', background: 'var(--card)', borderRadius: '12px', marginBottom: '25px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.08)' }}>
            {databaseMeals.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No meals in database yet.</span>}
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
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading schedule…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DAYS_OF_WEEK.map(day => {
            const item = weeklyMenu[day];
            const meal = item?.meals;
            const isOver = dragOverDay === day;
            return (
              <div
                key={day}
                className={`meal-day-row ${isOver ? 'drag-over' : ''}`}
                onDragOver={!isLocked ? (e) => handleDragOver(e, day) : undefined}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={!isLocked ? (e) => handleDrop(e, day) : undefined}
              >
                <div className="day-label">{day}</div>
                <div className={`meal-slot ${meal ? 'filled' : 'empty'}`}>
                  {meal ? (
                    <>
                      <span
                        className="meal-name"
                        draggable={!isLocked}
                        onDragStart={(e) => handleDragStart(e, day, meal.id)}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: isLocked ? 'default' : 'grab' }}
                      >
                        {meal.emoji} {meal.name}
                      </span>
                      {!isLocked && (
                        <div className="slot-actions">
                          <button className="icon-btn remove" onClick={() => handleAssignMeal(day, null)} aria-label="Remove">✕</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span>{isLocked ? 'No meal planned' : 'Drag a meal here…'}</span>
                      {!isLocked && (
                        <button className="icon-btn add" onClick={() => setShowMealSelector(day)} aria-label="Add">+</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Meal selector overlay */}
      {showMealSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowMealSelector(null)}>
          <div
            style={{ background: 'var(--bg)', width: '100%', maxWidth: '450px', borderRadius: '20px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '15px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="heading-serif">Add to {showMealSelector}</h3>
              <button onClick={() => setShowMealSelector(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <input
              autoFocus placeholder="Search meals…"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMeals.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No meals matching "{searchQuery}"</p>
              ) : (
                filteredMeals.map(meal => (
                  <button
                    key={meal.id}
                    onClick={() => { handleAssignMeal(showMealSelector, meal.id); setShowMealSelector(null); setSearchQuery(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
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

      {/* Shopping list day picker */}
      {shoppingPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShoppingPicker(null)}>
          <div
            style={{ background: 'var(--bg)', width: '100%', maxWidth: 460, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="heading-serif">Pick meals for shopping list</h3>
              <button onClick={() => setShoppingPicker(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <button onClick={() => setShoppingPicker({ selected: new Set(DAYS_OF_WEEK.filter(d => weeklyMenu[d]?.meals)) })} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Select all</button>
              <button onClick={() => setShoppingPicker({ selected: new Set() })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {DAYS_OF_WEEK.map(day => {
                const item = weeklyMenu[day];
                const meal = item?.meals;
                const checked = shoppingPicker.selected.has(day);
                const disabled = !meal;
                return (
                  <label
                    key={day}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer'
                    }}
                  >
                    <input
                      type="checkbox" checked={checked} disabled={disabled}
                      onChange={() => toggleShoppingDay(day)}
                      style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{day}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {meal ? `${meal.emoji} ${meal.name}` : 'No meal planned'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <button
              onClick={exportShoppingList}
              disabled={shoppingPicker.selected.size === 0}
              style={{
                background: shoppingPicker.selected.size === 0 ? 'var(--border)' : 'var(--primary)',
                color: '#fff', border: 'none', padding: '12px', borderRadius: 10,
                cursor: shoppingPicker.selected.size === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 700
              }}
            >
              Copy shopping list ({shoppingPicker.selected.size} meal{shoppingPicker.selected.size === 1 ? '' : 's'})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyMenu;
