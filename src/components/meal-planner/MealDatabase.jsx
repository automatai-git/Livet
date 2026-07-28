import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

const MealDatabase = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newMeal, setNewMeal] = useState({
    name: '', category: 'Dinner', time_to_cook: '', emoji: '🍲',
    ingredients: '', macros: '', portions: 2, cuisine: ''
  });

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    setLoading(true);
    // Fetch from supabase logic
    const { data, error } = await supabase.from('meals').select('*');
    if (error) {
      console.error('Error fetching meals', error);
    } else {
      setMeals(data || []);
    }
    setLoading(false);
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    const payload = {
      name: newMeal.name,
      category: newMeal.category,
      time_to_cook: newMeal.time_to_cook,
      emoji: newMeal.emoji,
      // Store ingredients as JSON array splitting by comma or line breaks for simplicity right now
      ingredients: JSON.stringify(newMeal.ingredients.split(',').map(i => i.trim()).filter(Boolean)),
      macros: JSON.stringify({ summary: newMeal.macros }),
      portions: parseInt(newMeal.portions) || 2,
      cuisine: newMeal.cuisine
    };

    const { data, error } = await supabase.from('meals').insert([payload]).select();
    if (error) {
      alert('Error adding meal: ' + error.message);
    } else if (data) {
      setMeals([...meals, ...data]);
      setIsAddingMode(false);
      setNewMeal({ name: '', category: 'Dinner', time_to_cook: '', emoji: '🍲', ingredients: '', macros: '', portions: 2, cuisine: '' });
    }
  };

  const calculateMacros = async () => {
    if (!newMeal.ingredients) {
      alert("Please enter ingredients first!");
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Please add VITE_GEMINI_API_KEY to your .env.local file to use the AI macro calculator.");
      return;
    }
    try {
      setNewMeal(prev => ({...prev, macros: 'Calculating...'}));
      
      const prompt = `Analyze these ingredients for ${newMeal.portions} portions: ${newMeal.ingredients}. 
      Give me a highly concise ballpark total macro summary for ONE portion in this format: "xxx kcal | xxg P | xxg C | xxg F". Do not include any other text or markdown.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 50 }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const resultText = data.candidates[0].content.parts[0].text.trim();
      setNewMeal(prev => ({...prev, macros: resultText}));
    } catch (e) {
      console.error(e);
      alert("Macro calculation failed: " + e.message);
      setNewMeal(prev => ({...prev, macros: ''}));
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="heading-serif" style={{ fontSize: '1.5rem' }}>Meal Database</h2>
        <button 
          onClick={() => setIsAddingMode(!isAddingMode)}
          style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isAddingMode ? 'Cancel' : '+ Add Meal'}
        </button>
      </div>

      {isAddingMode && (
        <form onSubmit={handleAddMeal} style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: '0 0 60px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Emoji</label>
              <input required value={newMeal.emoji} onChange={e => setNewMeal({...newMeal, emoji: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Meal Name</label>
              <input required value={newMeal.name} onChange={e => setNewMeal({...newMeal, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Ingredients (comma separated)</label>
            <textarea required value={newMeal.ingredients} onChange={e => setNewMeal({...newMeal, ingredients: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', minHeight: '60px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Portions</label>
              <input type="number" min="1" value={newMeal.portions} onChange={e => setNewMeal({...newMeal, portions: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Cuisine</label>
              <input placeholder="Italian, Mexican..." value={newMeal.cuisine} onChange={e => setNewMeal({...newMeal, cuisine: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Time to cook (e.g., 30 mins)</label>
              <input value={newMeal.time_to_cook} onChange={e => setNewMeal({...newMeal, time_to_cook: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Macros Summary (per portion)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input value={newMeal.macros} onChange={e => setNewMeal({...newMeal, macros: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                <button type="button" onClick={calculateMacros} style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ✨ Auto-Calc
                </button>
              </div>
            </div>
          </div>
          <button type="submit" style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
            Save Meal
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading meals...</p>
      ) : meals.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No meals found in database.</p>
      ) : (
        <div className="meal-grid">
          {meals.map(meal => (
            <div key={meal.id} className="meal-card tight-card">
              <div className="card-top">
                <span style={{ fontSize: '2.2rem' }}>{meal.emoji}</span>
                <span className="cat-badge">{meal.category}</span>
              </div>
              <div className="card-name heading-serif">{meal.name}</div>
              <div className="card-desc" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                Cook: {meal.time_to_cook || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MealDatabase;
