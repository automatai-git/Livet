import { Link } from 'react-router-dom';
import { ANDREAS_CATEGORIES, JULIE_CATEGORIES } from '../data/bucketData.js';

const BucketList = () => {
  const [activeUser, setActiveUser] = useState('andreas');
  const [activeCategory, setActiveCategory] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [hideDone, setHideDone] = useState(false);

  const currentCategories = activeUser === 'andreas' ? ANDREAS_CATEGORIES : JULIE_CATEGORIES;

  const stats = {
    total: currentCategories.reduce((acc, cat) => acc + cat.items.length, 0),
    done: currentCategories.reduce((acc, cat) => acc + cat.items.filter(item => item[3]).length, 0)
  };

  const pct = Math.round((stats.done / stats.total) * 100);

  const getFilteredItems = (cat) => {
    return cat.items.filter(item => {
      if (difficultyFilter !== 'All' && item[1] !== difficultyFilter) return false;
      if (hideDone && item[3]) return false;
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
      </div>

      <div style={{padding: '20px'}}>
        {currentCategories.filter(c => activeCategory === 'all' || activeCategory === c.id).map(cat => {
           const items = getFilteredItems(cat);
           if (items.length === 0) return null;
           return (
             <div key={cat.id} style={{marginBottom: '40px'}}>
               <h2 className="heading-serif" style={{fontSize: '1.8rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                 <span>{cat.icon}</span> {cat.name}
               </h2>
               <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                 {items.map((item, i) => (
                   <div key={i} style={{background: 'var(--card)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '16px', opacity: item[3] ? 0.6 : 1}}>
                     <div style={{width: '24px', height: '24px', borderRadius: '6px', border: item[3] ? 'none' : '2px solid var(--border)', background: item[3] ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0}}>
                       {item[3] ? '✓' : ''}
                     </div>
                     <div>
                       <div style={{fontWeight: 600, fontSize: '1.05rem', textDecoration: item[3] ? 'line-through' : 'none', marginBottom: '4px'}}>{item[0]}</div>
                       {item[2] && <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px'}}>{item[2]}</div>}
                       <div style={{fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', background: 'var(--bg)', borderRadius: '8px', display: 'inline-block', color: 'var(--primary)'}}>
                         {item[1].toUpperCase()}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           );
        })}
      </div>

    </div>
  );
};

export default BucketList;
