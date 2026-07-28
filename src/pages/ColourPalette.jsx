import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SECTIONS, coreColours, sisterColours, neutralColours, cautionColours, metalColours, outfitCombos } from '../data/colourData.js';
import OutfitMatcher from '../components/colour/OutfitMatcher.jsx';
import AppIcon from '../components/AppIcon.jsx';
import TabBar from '../components/shell/TabBar.jsx';

const ColourCard = ({ c }) => {
  return (
    <div
      role="img"
      aria-label={`${c.name}, hex ${c.hex}`}
      style={{
        background: c.hex,
        border: c.hex === '#FFFFFF' || c.hex === '#EDE8E3' ? '1.5px solid #D0CCC7' : 'none',
        borderRadius: '14px', padding: '22px 24px', minHeight: '120px', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      <div style={{fontWeight: 600, fontSize: '15px', color: (c.hex === '#FFFFFF' || c.hex === '#EDE8E3') ? '#3D3D3D' : '#F5F0EB'}}>{c.name}</div>
      <div style={{fontFamily: 'monospace', fontSize: '11px', textTransform: 'uppercase', color: (c.hex === '#FFFFFF' || c.hex === '#EDE8E3') ? '#3D3D3D' : '#F5F0EB', opacity: 0.8}}>{c.hex}</div>
    </div>
  );
};

const ColourPalette = () => {
  const [section, setSection] = useState('matcher');

  return (
    <div style={{ '--app-accent': 'var(--accent-palette)' }}>
      <div className="sticky-header">
        <div className="header-row">
          <Link to="/apps" className="back-circle" aria-label="Back">
            <AppIcon name="back" size={16} strokeWidth="2" />
          </Link>
          <span className="app-dot" aria-hidden="true" />
          <h1 className="heading-serif page-title">Palette</h1>
          <div className="header-actions" />
        </div>
        <div role="tablist" aria-label="Palette sections" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 20px 10px', scrollbarWidth: 'none' }}>
           {Object.entries(SECTIONS).map(([key, title]) => (
             <button
               key={key}
               role="tab"
               aria-selected={section === key}
               onClick={() => setSection(key)}
               style={{
                 background: section === key ? 'var(--text)' : 'transparent',
                 color: section === key ? 'white' : 'var(--text-muted)',
                 padding: '8px 16px', minHeight: 44, borderRadius: '20px', border: section === key ? '1.5px solid var(--text)' : '1.5px solid var(--border)',
                 whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 600
               }}
             >
               {title}
             </button>
           ))}
        </div>
      </div>

      <div style={{padding: '20px'}}>
         {section === 'matcher' && <OutfitMatcher />}
         {section === 'core' && (
           <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px'}}>
             {coreColours.map((c, i) => <ColourCard key={i} c={c} />)}
           </div>
         )}
         {section === 'sister' && (
           <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px'}}>
             {sisterColours.map((c, i) => <ColourCard key={i} c={c} />)}
           </div>
         )}
         {section === 'neutrals' && (
           <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px'}}>
             {neutralColours.map((c, i) => <ColourCard key={i} c={c} />)}
           </div>
         )}
         {section === 'caution' && (
           <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
             {cautionColours.map((c, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--card)', padding: '14px', borderRadius: '12px'}}>
                  <div style={{width: '40px', height: '40px', borderRadius: '8px', background: c.hex, border: c.hex === '#FFFFFF' ? '1px solid #ccc' : 'none'}}></div>
                  <div>
                    <div style={{fontWeight: 600, fontSize: '14px'}}>{c.name}</div>
                    <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{c.desc}</div>
                  </div>
                </div>
             ))}
           </div>
         )}
         {section === 'metals' && (
           <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
             {metalColours.map((m, i) => (
               <div key={i} style={{background: 'var(--card)', padding: '20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '16px', opacity: m.name.includes("Avoid") ? 0.5 : 1}}>
                 <div style={{width: '50px', height: '50px', borderRadius: '50%', background: m.ring, flexShrink: 0}}></div>
                 <div>
                   <div style={{fontWeight: 600}}>{m.name}</div>
                   <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{m.desc}</div>
                 </div>
               </div>
             ))}
           </div>
         )}
         {section === 'combos' && (
           <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px'}}>
             {outfitCombos.map((combo, i) => (
               <div key={i} style={{background: 'var(--card)', padding: '20px', borderRadius: '14px'}}>
                 <div style={{fontWeight: 600, marginBottom: '4px'}}>{combo.name}</div>
                 <div style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px'}}>{combo.desc}</div>
                 <div style={{display: 'flex', gap: '8px'}}>
                    {combo.colours.map((c, j) => (
                      <div key={j} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'}}>
                        <div style={{width: '100%', aspectRatio: '1', background: c.hex, borderRadius: '8px', border: c.hex === '#EDE8E3' ? '1px solid #ccc' : 'none'}}></div>
                        <div style={{fontSize: '10px', textAlign: 'center', color: 'var(--text-muted)'}}>{c.name}</div>
                      </div>
                    ))}
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>
      <TabBar />
    </div>
  );
};

export default ColourPalette;
