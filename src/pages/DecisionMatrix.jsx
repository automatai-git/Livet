import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const DecisionMatrix = () => {
    const [matrices, setMatrices] = useState([]);
    const [activeMatrix, setActiveMatrix] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    useEffect(() => {
        fetchMatrices();
    }, []);

    const fetchMatrices = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('decision_matrices')
            .select('*')
            .order('updated_at', { ascending: false });
        
        if (!error && data) {
            setMatrices(data);
            if (data.length > 0 && !activeMatrix) {
                setActiveMatrix(data[0]);
            }
        }
        setLoading(false);
    };

    const createMatrix = async () => {
        if (!newTitle.trim()) return;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newMatrix = {
            title: newTitle,
            user_id: user.id,
            data: {
                criteria: [
                    { id: crypto.randomUUID(), name: 'Cost', weight: 5 },
                    { id: crypto.randomUUID(), name: 'Quality', weight: 5 }
                ],
                options: [
                    { id: crypto.randomUUID(), name: 'Option 1', scores: {} }
                ]
            }
        };

        const { data, error } = await supabase
            .from('decision_matrices')
            .insert([newMatrix])
            .select()
            .single();

        if (!error && data) {
            setMatrices([data, ...matrices]);
            setActiveMatrix(data);
            setShowNewModal(false);
            setNewTitle('');
        }
    };

    const saveMatrix = async () => {
        if (!activeMatrix) return;
        setSaving(true);
        
        const { error } = await supabase
            .from('decision_matrices')
            .update({ 
                data: activeMatrix.data,
                title: activeMatrix.title,
                updated_at: new Date().toISOString()
            })
            .eq('id', activeMatrix.id);

        if (!error) {
            setMatrices(matrices.map(m => m.id === activeMatrix.id ? activeMatrix : m));
        }
        setSaving(false);
    };

    const deleteMatrix = async (id) => {
        if (!window.confirm("Are you sure you want to delete this matrix?")) return;
        
        const { error } = await supabase
            .from('decision_matrices')
            .delete()
            .eq('id', id);

        if (!error) {
            const updated = matrices.filter(m => m.id !== id);
            setMatrices(updated);
            if (activeMatrix?.id === id) {
                setActiveMatrix(updated[0] || null);
            }
        }
    };

    // Matrix Modification Helpers
    const updateCriteria = (id, field, value) => {
        const newData = { ...activeMatrix.data };
        newData.criteria = newData.criteria.map(c => 
            c.id === id ? { ...c, [field]: value } : c
        );
        setActiveMatrix({ ...activeMatrix, data: newData });
    };

    const addCriteria = () => {
        const newData = { ...activeMatrix.data };
        newData.criteria.push({ id: crypto.randomUUID(), name: 'New Criterion', weight: 5 });
        setActiveMatrix({ ...activeMatrix, data: newData });
    };

    const removeCriteria = (id) => {
        const newData = { ...activeMatrix.data };
        newData.criteria = newData.criteria.filter(c => c.id !== id);
        // Clean up scores in options
        newData.options = newData.options.map(o => {
            const newScores = { ...o.scores };
            delete newScores[id];
            return { ...o, scores: newScores };
        });
        setActiveMatrix({ ...activeMatrix, data: newData });
    };

    const updateOption = (id, name) => {
        const newData = { ...activeMatrix.data };
        newData.options = newData.options.map(o => 
            o.id === id ? { ...o, name } : o
        );
        setActiveMatrix({ ...activeMatrix, data: newData });
    };

    const updateScore = (optionId, criteriaId, score) => {
        const newData = { ...activeMatrix.data };
        newData.options = newData.options.map(o => {
            if (o.id === optionId) {
                return { ...o, scores: { ...o.scores, [criteriaId]: score } };
            }
            return o;
        });
        setActiveMatrix({ ...activeMatrix, data: newData });
    };

    const addOption = () => {
        const newData = { ...activeMatrix.data };
        newData.options.push({ id: crypto.randomUUID(), name: 'New Option', scores: {} });
        setActiveMatrix({ ...activeMatrix, data: newData });
    };

    const removeOption = (id) => {
        const newData = { ...activeMatrix.data };
        newData.options = newData.options.filter(o => o.id !== id);
        setActiveMatrix({ ...activeMatrix, data: newData });
    };

    // Calculations
    const results = useMemo(() => {
        if (!activeMatrix?.data) return [];
        
        const { criteria, options } = activeMatrix.data;
        return options.map(opt => {
            let totalScore = 0;
            let maxPossible = 0;
            
            criteria.forEach(crit => {
                const score = opt.scores[crit.id] || 0;
                totalScore += (score * crit.weight);
                maxPossible += (10 * crit.weight);
            });
            
            return {
                ...opt,
                weightedScore: totalScore,
                percentage: maxPossible > 0 ? (totalScore / maxPossible * 100) : 0
            };
        }).sort((a, b) => b.weightedScore - a.weightedScore);
    }, [activeMatrix]);

    if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Loading decisions...</div>;

    return (
        <div className="app-container" style={{maxWidth: '1100px'}}>
            <div className="sticky-header">
                <div className="header-row">
                    <Link to="/" className="back-home">← Dashboard</Link>
                    <h1 className="heading-serif" style={{fontSize: '1.5rem'}}>Weighted Decision Matrix</h1>
                    <button 
                        onClick={() => setShowNewModal(true)}
                        style={{background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'}}
                    >
                        + New
                    </button>
                </div>
            </div>

            {!activeMatrix ? (
                <div style={{textAlign: 'center', padding: '100px 20px', background: 'var(--card)', borderRadius: '20px', marginTop: '40px'}}>
                    <div style={{fontSize: '3rem', marginBottom: '20px'}}>⚖️</div>
                    <h2 className="heading-serif">No matrices yet</h2>
                    <p style={{color: 'var(--text-muted)', marginBottom: '30px'}}>Start by creating a new decision matrix to weigh your options.</p>
                    <button 
                        onClick={() => setShowNewModal(true)}
                        style={{background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'}}
                    >
                        Create First Matrix
                    </button>
                </div>
            ) : (
                <div style={{animation: 'fadeIn 0.5s ease'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px', flexWrap: 'wrap', gap: '20px'}}>
                        <div>
                            <input 
                                value={activeMatrix.title}
                                onChange={(e) => setActiveMatrix({...activeMatrix, title: e.target.value})}
                                style={{
                                    fontSize: '2.5rem', 
                                    background: 'transparent', 
                                    border: 'none', 
                                    borderBottom: '2px solid transparent',
                                    fontFamily: 'var(--heading-serif)',
                                    color: 'var(--text)',
                                    width: '100%',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                className="heading-serif"
                                onFocus={(e) => e.target.style.borderColor = 'var(--border)'}
                                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                            />
                            <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Adjust criteria weights and scores to find the best choice.</p>
                        </div>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button 
                                onClick={saveMatrix}
                                disabled={saving}
                                style={{
                                    background: 'var(--primary)', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '12px 24px', 
                                    borderRadius: '12px', 
                                    fontWeight: 600, 
                                    cursor: 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Matrix'}
                            </button>
                            <button 
                                onClick={() => deleteMatrix(activeMatrix.id)}
                                style={{
                                    background: 'transparent', 
                                    color: '#ff4d4d', 
                                    border: '1px solid #ff4d4d', 
                                    padding: '12px', 
                                    borderRadius: '12px', 
                                    cursor: 'pointer'
                                }}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px'}}>
                        {/* CRITERIA MANAGEMENT */}
                        <div style={{background: 'var(--card)', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                <h3 className="heading-serif" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    🎯 Criteria <span style={{fontSize: '0.8rem', background: 'var(--bg)', padding: '2px 8px', borderRadius: '10px'}}>{activeMatrix.data.criteria.length}</span>
                                </h3>
                                <button onClick={addCriteria} style={{background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer'}}>+ Add</button>
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                {activeMatrix.data.criteria.map(crit => (
                                    <div key={crit.id} style={{background: 'var(--bg)', padding: '15px', borderRadius: '15px'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                                            <input 
                                                value={crit.name}
                                                onChange={(e) => updateCriteria(crit.id, 'name', e.target.value)}
                                                style={{background: 'transparent', border: 'none', fontWeight: 600, color: 'var(--text)', outline: 'none', flex: 1}}
                                            />
                                            <button onClick={() => removeCriteria(crit.id)} style={{background: 'none', border: 'none', opacity: 0.3, cursor: 'pointer'}}>×</button>
                                        </div>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                            <input 
                                                type="range" min="1" max="10" 
                                                value={crit.weight} 
                                                onChange={(e) => updateCriteria(crit.id, 'weight', parseInt(e.target.value))}
                                                style={{flex: 1, accentColor: 'var(--primary)'}}
                                            />
                                            <span style={{fontWeight: 700, minWidth: '30px', textAlign: 'right'}}>{crit.weight}</span>
                                        </div>
                                        <div style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '5px'}}>Weight (Importance)</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* WINNERS RANKING */}
                        <div style={{background: 'var(--card)', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
                            <h3 className="heading-serif" style={{marginBottom: '20px'}}>🏆 Ranking</h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                {results.map((res, index) => (
                                    <div 
                                        key={res.id} 
                                        style={{
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '15px', 
                                            background: index === 0 ? 'var(--primary)' : 'var(--bg)', 
                                            color: index === 0 ? 'white' : 'var(--text)',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            transition: 'transform 0.3s'
                                        }}
                                    >
                                        <div style={{fontSize: '1.2rem', fontWeight: 800, opacity: 0.5}}>#{index + 1}</div>
                                        <div style={{flex: 1, fontWeight: 600}}>{res.name}</div>
                                        <div style={{textAlign: 'right'}}>
                                            <div style={{fontWeight: 800}}>{res.weightedScore}</div>
                                            <div style={{fontSize: '0.7rem', opacity: 0.7}}>{Math.round(res.percentage)}% Match</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* MAIN MATRIX TABLE */}
                    <div style={{background: 'var(--card)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '50px'}}>
                        <div style={{overflowX: 'auto'}}>
                            <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead>
                                    <tr style={{background: 'var(--primary)', color: 'white'}}>
                                        <th style={{padding: '20px', textAlign: 'left', minWidth: '200px'}}>Options</th>
                                        {activeMatrix.data.criteria.map(crit => (
                                            <th key={crit.id} style={{padding: '20px', textAlign: 'center', minWidth: '100px'}}>
                                                <div>{crit.name}</div>
                                                <div style={{fontSize: '0.7rem', opacity: 0.7, fontWeight: 400}}>w: {crit.weight}</div>
                                            </th>
                                        ))}
                                        <th style={{padding: '20px', textAlign: 'center', minWidth: '100px', background: 'rgba(255,255,255,0.1)'}}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeMatrix.data.options.map(opt => {
                                        const res = results.find(r => r.id === opt.id);
                                        return (
                                            <tr key={opt.id} style={{borderBottom: '1px solid var(--border)'}}>
                                                <td style={{padding: '15px 20px'}}>
                                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                        <input 
                                                            value={opt.name}
                                                            onChange={(e) => updateOption(opt.id, e.target.value)}
                                                            style={{background: 'transparent', border: 'none', fontWeight: 600, color: 'var(--text)', outline: 'none', width: '100%'}}
                                                        />
                                                        <button 
                                                            onClick={() => removeOption(opt.id)}
                                                            style={{background: 'none', border: 'none', opacity: 0.2, cursor: 'pointer'}}
                                                        >🗑️</button>
                                                    </div>
                                                </td>
                                                {activeMatrix.data.criteria.map(crit => (
                                                    <td key={crit.id} style={{padding: '15px 10px', textAlign: 'center'}}>
                                                        <input 
                                                            type="number" min="0" max="10"
                                                            value={opt.scores[crit.id] || 0}
                                                            onChange={(e) => updateScore(opt.id, crit.id, parseInt(e.target.value) || 0)}
                                                            style={{
                                                                width: '50px', 
                                                                textAlign: 'center', 
                                                                padding: '8px', 
                                                                borderRadius: '8px', 
                                                                border: '1.5px solid var(--border)',
                                                                background: 'var(--bg)',
                                                                fontWeight: 700
                                                            }}
                                                        />
                                                    </td>
                                                ))}
                                                <td style={{padding: '15px 20px', textAlign: 'center', background: 'var(--bg)', fontWeight: 800}}>
                                                    {res?.weightedScore}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr>
                                        <td colSpan={activeMatrix.data.criteria.length + 2} style={{padding: '15px 20px'}}>
                                            <button 
                                                onClick={addOption}
                                                style={{background: 'transparent', border: '1.5px dashed var(--border)', color: 'var(--text-muted)', width: '100%', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600}}
                                            >
                                                + Add New Option
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW MATRIX MODAL */}
            {showNewModal && (
                <div style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'}}>
                    <div style={{background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'}}>
                        <h2 className="heading-serif" style={{marginBottom: '20px'}}>New Decision</h2>
                        <input 
                            placeholder="e.g. Choosing a Car"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            autoFocus
                            style={{width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '20px', outline: 'none', fontSize: '1rem'}}
                        />
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button 
                                onClick={() => setShowNewModal(false)}
                                style={{flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer'}}
                            >Cancel</button>
                            <button 
                                onClick={createMatrix}
                                style={{flex: 2, padding: '12px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer'}}
                            >Create Matrix</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{padding: '20px', background: 'var(--card)', borderRadius: '20px', marginBottom: '50px', border: '1px solid var(--border)'}}>
                <h4 style={{marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-muted)'}}>Your Decisions</h4>
                <div style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px'}}>
                    {matrices.map(m => (
                        <button 
                            key={m.id}
                            onClick={() => setActiveMatrix(m)}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                background: activeMatrix?.id === m.id ? 'var(--primary)' : 'var(--bg)',
                                color: activeMatrix?.id === m.id ? 'white' : 'var(--text)',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {m.title}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DecisionMatrix;
