import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LOG_KEY = 'hub_meal_log';

const MenuPlanner = () => {
  const [meals, setMeals] = useState([]);
  const [search, setSearch] = useState('');
  const [mealLog, setMealLog] = useState(() => JSON.parse(localStorage.getItem(LOG_KEY) || '[]'));
  const [selectedMeal, setSelectedMeal] = useState(null);

  useEffect(() => {
    localStorage.setItem(LOG_KEY, JSON.stringify(mealLog));
  }, [mealLog]);

  useEffect(() => {
    fetch('/menu.json')
      .then(res => res.json())
      .then(data => setMeals(data.meals || []))
      .catch(err => console.error('Could not load menu.json', err));
  }, []);

  const filteredMeals = meals.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="sticky-header">
        <div className="header-row">
          {selectedMeal ? (
            <button className="back-btn" onClick={() => setSelectedMeal(null)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600}}>
              ← Back
            </button>
          ) : (
            <Link to="/" className="back-home">← Dashboard</Link>
          )}
          <h1 className="heading-serif">Menu</h1>
          <div style={{width: '80px'}}></div>
        </div>
        {!selectedMeal && (
          <div className="search-wrap">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search meals or categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {!selectedMeal ? (
        <div className="meal-grid">
          {filteredMeals.map(meal => (
            <div key={meal.id} className="meal-card app-card" onClick={() => setSelectedMeal(meal)} style={{cursor: 'pointer'}}>
            <div className="card-top">
              <span style={{fontSize: '2.2rem'}}>{meal.emoji}</span>
              <span className="cat-badge">{meal.category}</span>
            </div>
            <div className="card-name heading-serif">{meal.name}</div>
            <div className="card-desc" style={{color: 'var(--text-muted)', fontSize:'0.9rem', marginTop: '6px'}}>
              {meal.description}
            </div>
          </div>
        ))}
        {filteredMeals.length === 0 && (
          <p style={{textAlign: 'center', gridColumn: '1 / -1', marginTop: '20px', color: 'var(--text-muted)'}}>
            No meals found.
          </p>
        )}
        </div>
      ) : (
        <div style={{padding: '20px'}}>
          <div style={{fontSize: '3rem', marginBottom: '10px'}}>{selectedMeal.emoji}</div>
          <h2 className="heading-serif" style={{fontSize: '2rem', marginBottom: '10px'}}>{selectedMeal.name}</h2>
          <p style={{color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6}}>{selectedMeal.description}</p>
          
          <button 
            style={{
              padding: '14px', width: '100%', borderRadius: '12px', border: '2px solid var(--success)', 
              background: 'transparent', color: 'var(--success)', fontWeight: 700, cursor: 'pointer', marginBottom: '20px'
            }}
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              if (!mealLog.some(e => e.mealId === selectedMeal.id && e.date === today)) {
                setMealLog([...mealLog, { mealId: selectedMeal.id, date: today, ts: Date.now() }]);
              }
            }}
          >
            {mealLog.some(e => e.mealId === selectedMeal.id && e.date === new Date().toISOString().split('T')[0]) 
              ? '✓ Made today — logged!' 
              : '✓ Mark as made today'}
          </button>

          <p style={{background: 'var(--card)', padding: '20px', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)'}}>
            More functionality (Shopping, Macros, History) easily extensible here.
          </p>
        </div>
      )}
    </div>
  );
};

export default MenuPlanner;
