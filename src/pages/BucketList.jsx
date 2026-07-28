import React, { useState, useEffect, useId } from 'react';
import { supabase } from '../services/supabase';
import { ANDREAS_CATEGORIES, JULIE_CATEGORIES } from '../data/bucketData.js';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3.jsx';

const BucketList = () => {
  const [activeUser, setActiveUser] = useState('andreas');
  const [activeCategory, setActiveCategory] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [hideDone, setHideDone] = useState(false);
  const [items, setItems] = useState([]);
  const [loadedUser, setLoadedUser] = useState(null);
  const loading = loadedUser !== activeUser;
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', difficulty: 'Medium', description: '', category_id: '' });
  const modalTitleId = useId();
  const fieldTitleId = useId();
  const fieldCategoryId = useId();
  const fieldDifficultyId = useId();
  const fieldDescriptionId = useId();

  // "Loading" = the fetched list doesn't belong to the selected user yet —
  // derived rather than set synchronously, so switching users re-loads.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('bucket_list_items')
      .select('*')
      .eq('user_label', activeUser)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setItems(data);
        setLoadedUser(activeUser);
      });
    return () => { cancelled = true; };
  }, [activeUser]);

  // ESC closes the add-item modal.
  useEffect(() => {
    if (!showAddModal) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowAddModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAddModal]);

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
    <AppShellV3
      app="bucket"
      scope={
        <div className="scope-row" role="group" aria-label="Filter by category">
          <ScopePill on={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>
            All
          </ScopePill>
          {currentCategories.map(c => (
            <ScopePill
              key={c.id}
              on={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
              aria-label={`Filter by ${c.name}`}
            >
              {c.name}
            </ScopePill>
          ))}
        </div>
      }
      hero={
        <HeroCard
          eyebrow={`${activeUser === 'andreas' ? "Andreas's" : "Julie's"} bucket list`}
          title={`${stats.done} / ${stats.total}`}
          meta={`${pct}% done · ${stats.total} experiences across ${currentCategories.length} categories`}
        >
          <div className="usage-bar" style={{ marginTop: 2 }} aria-hidden="true">
            <div className="usage-bar-fill" style={{ width: `${pct}%`, background: 'var(--accent-bucket)' }} />
          </div>
          <div role="tablist" aria-label="Choose whose bucket list to view" style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {['andreas', 'julie'].map((u) => (
              <ScopePill
                key={u}
                on={activeUser === u}
                onClick={() => setActiveUser(u)}
                role="tab"
                aria-selected={activeUser === u}
              >
                {u === 'andreas' ? 'Andreas' : 'Julie'}
              </ScopePill>
            ))}
          </div>
        </HeroCard>
      }
      action={{ label: 'Add item', onClick: () => setShowAddModal(true) }}
    >
      <div role="group" aria-label="Filter by difficulty" style={{display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: 16}}>
         {difficulties.map(d => (
           <button
             key={d}
             type="button"
             aria-pressed={difficultyFilter === d}
             aria-label={`Filter by ${d} difficulty`}
             onClick={() => setDifficultyFilter(d)}
             className="ghost-pill sm"
             style={difficultyFilter === d
               ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' }
               : undefined}
           >{d}</button>
         ))}
         <label style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem'}}>
           <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide done
         </label>
      </div>

      <div>
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
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color || 'var(--accent-bucket)' }} />
                  {cat.name}
                </h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {catItems.map((item) => (
                    <div 
                      key={item.id} 
                      style={{background: 'var(--card)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '16px', opacity: item.is_completed ? 0.6 : 1, position: 'relative'}}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.is_completed}
                        aria-label={`Mark "${item.title}" as ${item.is_completed ? 'not done' : 'done'}`}
                        onClick={() => toggleItem(item.id, item.is_completed)}
                        style={{width: '28px', height: '28px', padding: 0, borderRadius: '6px', border: item.is_completed ? 'none' : '2px solid var(--border)', background: item.is_completed ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, cursor: 'pointer'}}
                      >
                        <span aria-hidden="true">{item.is_completed ? '✓' : ''}</span>
                      </button>
                      <div style={{flex: 1}}>
                        <div style={{fontWeight: 600, fontSize: '1.05rem', textDecoration: item.is_completed ? 'line-through' : 'none', marginBottom: '4px'}}>{item.title}</div>
                        {item.description && <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px'}}>{item.description}</div>}
                        <div style={{fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', background: 'var(--bg)', borderRadius: '8px', display: 'inline-block', color: 'var(--primary)'}}>
                          {item.difficulty.toUpperCase()}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove "${item.title}"`}
                        onClick={() => removeItem(item.id)}
                        style={{background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-muted)', opacity: 0.4, alignSelf: 'flex-start', padding: 8, minWidth: 36, minHeight: 36}}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.4'}
                        onFocus={(e) => e.currentTarget.style.opacity = '1'}
                        onBlur={(e) => e.currentTarget.style.opacity = '0.4'}
                      >
                        <span aria-hidden="true">×</span>
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'}}
        >
          <div style={{background: 'var(--card)', width: '100%', maxWidth: '500px', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'}}>
            <h2 id={modalTitleId} className="heading-serif" style={{marginBottom: '20px'}}>Add New Item</h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div>
                <label htmlFor={fieldTitleId} style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Title</label>
                <input
                  id={fieldTitleId}
                  autoFocus
                  value={newItem.title}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                  style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)'}}
                />
              </div>
              <div>
                <label htmlFor={fieldCategoryId} style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Category</label>
                <select
                  id={fieldCategoryId}
                  value={newItem.category_id}
                  onChange={e => setNewItem({...newItem, category_id: e.target.value})}
                  style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)'}}
                >
                  <option value="">Select Category</option>
                  {currentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{display: 'flex', gap: '15px'}}>
                <div style={{flex: 1}}>
                  <label htmlFor={fieldDifficultyId} style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Difficulty</label>
                  <select
                    id={fieldDifficultyId}
                    value={newItem.difficulty}
                    onChange={e => setNewItem({...newItem, difficulty: e.target.value})}
                    style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)'}}
                  >
                    {difficulties.slice(1).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor={fieldDescriptionId} style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Description (Optional)</label>
                <textarea
                  id={fieldDescriptionId}
                  value={newItem.description}
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                  style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', minHeight: '80px'}}
                />
              </div>
              <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{flex: 1, padding: '12px', minHeight: 44, borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 600, cursor: 'pointer'}}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  style={{flex: 2, padding: '12px', minHeight: 44, borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer'}}
                >
                  Add to List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppShellV3>
  );
};

export default BucketList;
