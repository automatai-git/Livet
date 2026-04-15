import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ANDREAS_CATEGORIES, JULIE_CATEGORIES } from '../data/bucketData.js';

const BucketList = () => {
  const [activeUser, setActiveUser] = useState('andreas');
  const [activeCategory, setActiveCategory] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [hideDone, setHideDone] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', difficulty: 'Medium', description: '', category_id: '' });

  useEffect(() => {
    fetchItems();
  }, [activeUser]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bucket_list_items')
      .select('*')
      .eq('user_label', activeUser)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const toggleItem = async (itemId, currentStatus) => {
    const { error } = await supabase
      .from('bucket_list_items')
      .update({ is_completed: !currentStatus })
      .eq('id', itemId);
    
    if (!error) {
      setItems(items.map(item => 
        item.id === itemId ? { ...item, is_completed: !currentStatus } : item
      ));
    }
  };

  const addItem = async () => {
    if (!newItem.title || !newItem.category_id) return;
    
    const { data, error } = await supabase
      .from('bucket_list_items')
      .insert([{
        ...newItem,
        user_label: activeUser,
        is_completed: false
      }])
      .select()
      .single();
    
    if (!error && data) {
      setItems([data, ...items]);
      setShowAddModal(false);
      setNewItem({ title: '', difficulty: 'Medium', description: '', category_id: '' });
    }
  };

  const removeItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to remove this item?")) return;
    
    const { error } = await supabase
      .from('bucket_list_items')
      .delete()
      .eq('id', itemId);
    
    if (!error) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  const currentCategories = (activeUser === 'andreas' ? ANDREAS_CATEGORIES : JULIE_CATEGORIES) || [];

  const stats = {
    total: items.length,
    done: items.filter(item => item.is_completed).length
  };

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const getFilteredItemsForCategory = (catId) => {
    return items.filter(item => {
      if (item.category_id !== catId) return false;
      if (difficultyFilter !== 'All' && item.difficulty !== difficultyFilter) return false;
      if (hideDone && item.is_completed) return false;
      return true;
    });
  };

  const difficulties = ['All', 'Easy', 'Medium', 'Hard', 'Very Hard', 'Extreme', 'Expert'];

  return (
    <div>
      <div className="sticky-header" style={{margin: 0, paddingBottom: 0}}>
        <div className="header-row" style={{paddingBottom: '20px'}}>
          <Link to="/" className="back-home">← Dashboard</Link>
          <h1 className="heading-serif">Bucket List</h1>
          <div style={{width: '80px'}}></div>
        </div>
      </div>

      <div style={{background: 'linear-gradient(135deg, #3d5a32 0%, #5a7a4a 50%, #7a9a5a 100%)', color: 'white', padding: '40px 20px', textAlign: 'center'}}>
         <div style={{display: 'inline-flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', marginBottom: '25px'}}>
            <button 
              onClick={() => setActiveUser('andreas')}
              style={{
                padding: '8px 24px', borderRadius: '10px', border: 'none', 
                background: activeUser === 'andreas' ? 'white' : 'transparent',
                color: activeUser === 'andreas' ? '#3d5a32' : 'white',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Andreas
            </button>
            <button 
              onClick={() => setActiveUser('julie')}
              style={{
                padding: '8px 24px', borderRadius: '10px', border: 'none', 
                background: activeUser === 'julie' ? 'white' : 'transparent',
                color: activeUser === 'julie' ? '#3d5a32' : 'white',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Julie
            </button>
         </div>
         <h1 className="heading-serif" style={{fontSize: '2.5rem', marginBottom: '10px'}}>{activeUser === 'andreas' ? "Andreas's" : "Julie's"} Bucket List</h1>
         <p style={{opacity: 0.8, marginBottom: '20px'}}>{stats.total} experiences across {currentCategories.length} categories</p>
         <div style={{maxWidth: '400px', margin: '0 auto'}}>
           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
             <span style={{fontSize: '1.5rem', fontWeight: 600}}>{stats.done} / {stats.total}</span>
             <span>{pct}%</span>
           </div>
           <div style={{background: 'rgba(255,255,255,0.2)', height: '8px', borderRadius: '4px'}}>
             <div style={{background: 'white', height: '100%', borderRadius: '4px', width: `${pct}%`}}></div>
           </div>
         </div>
      </div>

      <div style={{display: 'flex', gap: '8px', overflowX: 'auto', padding: '20px', background: 'var(--card)', borderBottom: '1px solid var(--border)'}}>
        <button 
          onClick={() => setActiveCategory('all')} 
          style={{
            padding: '8px 16px', background: activeCategory === 'all' ? 'var(--text)' : 'transparent',
            color: activeCategory === 'all' ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '20px', fontWeight: 600, cursor: 'pointer'
          }}
        >
          All
        </button>
        {currentCategories.map(c => (
          <button 
            key={c.id} 
            onClick={() => setActiveCategory(c.id)}
            style={{
              padding: '8px 16px', background: activeCategory === c.id ? c.color : 'transparent',
              color: activeCategory === c.id ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '20px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <div style={{padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: 'var(--bg)', borderBottom: '1px solid var(--border)'}}>
         <span style={{color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600}}>Difficulty:</span>
         {difficulties.map(d => (
           <button 
             key={d} onClick={() => setDifficultyFilter(d)} 
             style={{
               padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer',
               background: difficultyFilter === d ? 'var(--primary)' : 'var(--card)', color: difficultyFilter === d ? 'white' : 'var(--text-muted)',
               fontSize: '0.85rem', fontWeight: 600
             }}
           >{d}</button>
         ))}
         <label style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem'}}>
           <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide done
         </label>
         <button 
           onClick={() => setShowAddModal(true)}
           style={{background: 'var(--success)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', marginLeft: '10px'}}
         >
           + Add New
         </button>
      </div>

      <div style={{padding: '20px'}}>
        {loading ? (
          <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>Loading list...</div>
        ) : (
          currentCategories.filter(c => activeCategory === 'all' || activeCategory === c.id).map(cat => {
            const catItems = getFilteredItemsForCategory(cat.id);
            if (catItems.length === 0 && activeCategory !== 'all') {
              return <div key={cat.id} style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>No items in this category yet.</div>;
            }
            if (catItems.length === 0) return null;

            return (
              <div key={cat.id} style={{marginBottom: '40px'}}>
                <h2 className="heading-serif" style={{fontSize: '1.8rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <span>{cat.icon}</span> {cat.name}
                </h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {catItems.map((item) => (
                    <div 
                      key={item.id} 
                      style={{background: 'var(--card)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '16px', opacity: item.is_completed ? 0.6 : 1, position: 'relative'}}
                    >
                      <div 
                        onClick={() => toggleItem(item.id, item.is_completed)}
                        style={{width: '24px', height: '24px', borderRadius: '6px', border: item.is_completed ? 'none' : '2px solid var(--border)', background: item.is_completed ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, cursor: 'pointer'}}
                      >
                        {item.is_completed ? '✓' : ''}
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{fontWeight: 600, fontSize: '1.05rem', textDecoration: item.is_completed ? 'line-through' : 'none', marginBottom: '4px'}}>{item.title}</div>
                        {item.description && <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px'}}>{item.description}</div>}
                        <div style={{fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', background: 'var(--bg)', borderRadius: '8px', display: 'inline-block', color: 'var(--primary)'}}>
                          {item.difficulty.toUpperCase()}
                        </div>
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        style={{background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.3, alignSelf: 'flex-start'}}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.3'}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'}}>
          <div style={{background: 'var(--card)', width: '100%', maxWidth: '500px', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'}}>
            <h2 className="heading-serif" style={{marginBottom: '20px'}}>Add New Item</h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div>
                <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Title</label>
                <input 
                  value={newItem.title} 
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                  style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)'}}
                />
              </div>
              <div>
                <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Category</label>
                <select 
                  value={newItem.category_id} 
                  onChange={e => setNewItem({...newItem, category_id: e.target.value})}
                  style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)'}}
                >
                  <option value="">Select Category</option>
                  {currentCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div style={{display: 'flex', gap: '15px'}}>
                <div style={{flex: 1}}>
                  <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Difficulty</label>
                  <select 
                    value={newItem.difficulty} 
                    onChange={e => setNewItem({...newItem, difficulty: e.target.value})}
                    style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)'}}
                  >
                    {difficulties.slice(1).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Description (Optional)</label>
                <textarea 
                  value={newItem.description} 
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                  style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', minHeight: '80px'}}
                />
              </div>
              <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button 
                  onClick={() => setShowAddModal(false)}
                  style={{flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 600, cursor: 'pointer'}}
                >
                  Cancel
                </button>
                <button 
                  onClick={addItem}
                  style={{flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer'}}
                >
                  Add to List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BucketList;
