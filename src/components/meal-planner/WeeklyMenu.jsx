import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import StaplesList from './StaplesList';
import { parseIngredients } from '../../lib/meals';
import { groupIngredients, formatShoppingList, countItems } from '../../lib/grocery';
import { loadStaples, saveStaples, clearNeeded, neededNames } from '../../lib/staples';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyMenu = ({ databaseMeals = [] }) => {
  const [weeklyMenu, setWeeklyMenu] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [showMealSelector, setShowMealSelector] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [staples, setStaples] = useState(() => loadStaples());
  // { step: 'pick' | 'preview', days: Set<string>, includeStaples: bool, copied: bool }
  const [shopping, setShopping] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('weekly_menu')
      .select('id, day_of_week, meal_type, meal_id, meals ( id, name, emoji, ingredients )')
      .eq('meal_type', 'Dinner')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Error fetching weekly menu', error);
        else if (data) {
          const menuMap = {};
          data.forEach(item => { menuMap[item.day_of_week] = item; });
          setWeeklyMenu(menuMap);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updateStaples = (next) => {
    setStaples(next);
    saveStaples(next);
  };

  const handleAssignMeal = async (day, mealId) => {
    const existing = weeklyMenu[day];
    if (!mealId) {
      if (existing) {
        // .select() so a delete refused by row-level security is caught here
        // rather than silently reappearing on the next page load.
        const { data, error } = await supabase
          .from('weekly_menu').delete().eq('id', existing.id).select();
        if (error || !data || data.length === 0) {
          setNotice('Could not clear that day — the weekly_menu table refused the delete.');
          return;
        }
        setNotice(null);
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

  // The joined `meals` row is a snapshot from page load; the database tab may
  // have edited the ingredients since. Prefer the live row when we have it.
  const mealFor = (day) => {
    const item = weeklyMenu[day];
    if (!item) return null;
    const id = item.meal_id ?? item.meals?.id;
    return databaseMeals.find((m) => m.id === id) ?? item.meals ?? null;
  };

  const plannedDays = DAYS_OF_WEEK.filter((day) => Boolean(mealFor(day)));

  const openShopping = () => {
    if (plannedDays.length === 0 && neededNames(staples).length === 0) {
      setNotice('Nothing to shop for yet — plan a meal or tick a household item.');
      return;
    }
    setNotice(null);
    setShopping({
      step: 'pick',
      days: new Set(plannedDays),
      includeStaples: true,
      copied: false,
    });
  };

  const toggleShoppingDay = (day) => {
    setShopping(prev => {
      if (!prev) return prev;
      const days = new Set(prev.days);
      if (days.has(day)) days.delete(day); else days.add(day);
      return { ...prev, days };
    });
  };

  // The list itself: every ingredient of every picked day, plus the staples
  // ticked as running low, bucketed into store sections in walk order.
  const shoppingGroups = useMemo(() => {
    if (!shopping) return [];
    const items = [];
    DAYS_OF_WEEK.filter((d) => shopping.days.has(d)).forEach((day) => {
      const meal = mealFor(day);
      parseIngredients(meal?.ingredients).forEach((name) => items.push(name));
    });
    if (shopping.includeStaples) {
      neededNames(staples).forEach((name) => items.push(name));
    }
    return groupIngredients(items);
    // mealFor reads weeklyMenu + databaseMeals; both are listed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopping, weeklyMenu, databaseMeals, staples]);

  const shoppingText = useMemo(
    () => formatShoppingList(shoppingGroups, { title: 'Shopping list' }),
    [shoppingGroups]
  );

  const copyShoppingList = async () => {
    try {
      await navigator.clipboard.writeText(shoppingText);
      setShopping(prev => (prev ? { ...prev, copied: true } : prev));
    } catch {
      // Clipboard blocked (no permission / insecure context) — the preview
      // below is selectable, so the list is still reachable.
      setShopping(prev => (prev ? { ...prev, copied: 'blocked' } : prev));
    }
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
    <div className="weekly-menu">
      <div className="section-head">
        <span className="eyebrow">Dinners this week</span>
        <div className="weekly-actions">
          <button
            type="button"
            className={`ghost-pill sm${isLocked ? '' : ' armed'}`}
            onClick={() => setIsLocked(!isLocked)}
          >
            {isLocked ? 'Edit week' : 'Done editing'}
          </button>
          <button type="button" className="ink-pill sm" onClick={openShopping}>
            Shopping list
          </button>
        </div>
      </div>

      {notice && <p className="meal-notice error">{notice}</p>}

      {!isLocked && (
        <>
          <p className="muted-row" style={{ marginBottom: 12 }}>
            Drag meals from your collection onto a day, or slide them across days.
          </p>
          <div className="meal-tray">
            {databaseMeals.length === 0 && <span className="muted-row">No meals in the database yet.</span>}
            {databaseMeals.map(meal => (
              <div
                key={meal.id}
                draggable
                onDragStart={(e) => handleDragStart(e, null, meal.id)}
                onDragEnd={handleDragEnd}
                className="meal-tray-chip"
              >
                {meal.emoji} {meal.name}
              </div>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <p className="muted-row">Loading schedule…</p>
      ) : (
        <div className="row-stack">
          {DAYS_OF_WEEK.map(day => {
            const meal = mealFor(day);
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

      <StaplesList staples={staples} onChange={updateStaples} />

      {/* Meal selector overlay */}
      {showMealSelector && (
        <div className="menu-overlay" onClick={() => setShowMealSelector(null)}>
          <div className="menu-sheet" onClick={e => e.stopPropagation()}>
            <div className="menu-sheet-head">
              <h3 className="heading-serif">Add to {showMealSelector}</h3>
              <button type="button" className="sheet-close" onClick={() => setShowMealSelector(null)} aria-label="Close">✕</button>
            </div>
            <input
              autoFocus placeholder="Search meals…"
              className="sheet-search"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="sheet-scroll">
              {filteredMeals.length === 0 ? (
                <p className="muted-row" style={{ textAlign: 'center', padding: 20 }}>
                  No meals matching “{searchQuery}”
                </p>
              ) : (
                filteredMeals.map(meal => (
                  <button
                    type="button"
                    key={meal.id}
                    className="sheet-option"
                    onClick={() => { handleAssignMeal(showMealSelector, meal.id); setShowMealSelector(null); setSearchQuery(''); }}
                  >
                    <span className="icon-chip md" aria-hidden="true"><span className="chip-emoji">{meal.emoji}</span></span>
                    <span className="sheet-option-body">
                      <span className="row-title sm ellipsis">{meal.name}</span>
                      {meal.cuisine && <span className="row-meta">{meal.cuisine}</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopping list: pick the meals, then read the aisle-grouped result */}
      {shopping && (
        <div className="menu-overlay" onClick={() => setShopping(null)}>
          <div className="menu-sheet" onClick={e => e.stopPropagation()}>
            <div className="menu-sheet-head">
              <h3 className="heading-serif">
                {shopping.step === 'pick' ? 'Build shopping list' : 'Shopping list'}
              </h3>
              <button type="button" className="sheet-close" onClick={() => setShopping(null)} aria-label="Close">✕</button>
            </div>

            {shopping.step === 'pick' ? (
              <>
                <div className="sheet-toolbar">
                  <button
                    type="button"
                    onClick={() => setShopping(prev => ({ ...prev, days: new Set(plannedDays) }))}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="muted"
                    onClick={() => setShopping(prev => ({ ...prev, days: new Set() }))}
                  >
                    Clear
                  </button>
                </div>
                <div className="sheet-scroll">
                  {DAYS_OF_WEEK.map(day => {
                    const meal = mealFor(day);
                    return (
                      <label key={day} className={`sheet-check${meal ? '' : ' disabled'}`}>
                        <input
                          type="checkbox"
                          checked={shopping.days.has(day)}
                          disabled={!meal}
                          onChange={() => toggleShoppingDay(day)}
                        />
                        <span className="sheet-option-body">
                          <span className="row-title sm">{day}</span>
                          <span className="row-meta ellipsis">
                            {meal ? `${meal.emoji} ${meal.name}` : 'No meal planned'}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                  {(() => {
                    const low = neededNames(staples);
                    return (
                      <label className={`sheet-check${low.length ? '' : ' disabled'}`}>
                        <input
                          type="checkbox"
                          checked={shopping.includeStaples && low.length > 0}
                          disabled={low.length === 0}
                          onChange={() => setShopping(prev => ({ ...prev, includeStaples: !prev.includeStaples }))}
                        />
                        <span className="sheet-option-body">
                          <span className="row-title sm">Household items</span>
                          <span className="row-meta ellipsis">
                            {low.length ? low.join(', ') : 'Nothing ticked as running low'}
                          </span>
                        </span>
                      </label>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  className="btn-primary sheet-cta"
                  disabled={shopping.days.size === 0 && !(shopping.includeStaples && neededNames(staples).length)}
                  onClick={() => setShopping(prev => ({ ...prev, step: 'preview', copied: false }))}
                >
                  Build list
                </button>
              </>
            ) : (
              <>
                <p className="muted-row">
                  {countItems(shoppingGroups)} items, grouped by where they sit in the shop.
                </p>
                <div className="sheet-scroll shopping-preview">
                  {shoppingGroups.length === 0 ? (
                    <p className="muted-row">These meals have no ingredients listed.</p>
                  ) : shoppingGroups.map(section => (
                    <div key={section.id} className="shopping-section">
                      <div className="eyebrow">{section.label}</div>
                      <ul>
                        {section.items.map(item => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
                {shopping.copied === 'blocked' && (
                  <p className="meal-notice error">
                    Clipboard blocked — select the list above to copy it by hand.
                  </p>
                )}
                {shopping.copied === true && (
                  <p className="meal-notice ok">Copied to the clipboard.</p>
                )}
                <div className="sheet-actions">
                  <button
                    type="button"
                    className="ghost-pill sm"
                    onClick={() => setShopping(prev => ({ ...prev, step: 'pick', copied: false }))}
                  >
                    Back
                  </button>
                  {shopping.copied === true && staples.some(s => s.need) && (
                    <button
                      type="button"
                      className="ghost-pill sm"
                      onClick={() => updateStaples(clearNeeded(staples))}
                    >
                      Clear ticked staples
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={shoppingGroups.length === 0}
                    onClick={copyShoppingList}
                  >
                    Copy list
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyMenu;
