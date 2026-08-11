import React, { useState } from 'react';
import { SECTIONS, coreColours, sisterColours, neutralColours, cautionColours, metalColours, outfitCombos } from '../data/colourData.js';
import OutfitMatcher from '../components/colour/OutfitMatcher.jsx';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3.jsx';
import { relativeLuminance } from '../lib/colourMatch.js';

const ColourCard = ({ c }) => {
  // Label colour by swatch luminance (v3.2 §6), never per-hex hard-coding:
  // light swatches carry ink, dark swatches carry ivory.
  const light = relativeLuminance(c.hex) > 0.55;
  const label = light ? '#1B3B2F' : '#F5F3ED';
  return (
    <div
      role="img"
      aria-label={`${c.name}, hex ${c.hex}`}
      style={{
        background: c.hex,
        border: light ? '1.5px solid var(--border)' : 'none',
        borderRadius: '14px', padding: '22px 24px', minHeight: '120px', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', boxShadow: 'var(--card-shadow)'
      }}
    >
      <div style={{fontWeight: 600, fontSize: '15px', color: label}}>{c.name}</div>
      <div style={{fontFamily: 'monospace', fontSize: '11px', textTransform: 'uppercase', color: label, opacity: 0.75}}>{c.hex}</div>
    </div>
  );
};

// The Clothing app (formerly "Soft Summer Palette" — v3.1 fix 4; the route
// stays /colour). The personal palette, its rules, and the outfit matcher.
const ColourPalette = () => {
  const [section, setSection] = useState('matcher');

  const wearable = coreColours.length + sisterColours.length + neutralColours.length;

  return (
    <AppShellV3
      app="clothing"
      scope={
        <div className="scope-row" role="tablist" aria-label="Clothing sections">
          {Object.entries(SECTIONS).map(([key, title]) => (
            <ScopePill
              key={key}
              on={section === key}
              role="tab"
              aria-selected={section === key}
              onClick={() => setSection(key)}
            >
              {title}
            </ScopePill>
          ))}
        </div>
      }
      hero={section === 'matcher' ? (
        <HeroCard
          eyebrow="The palette"
          title="Soft Summer"
          meta={`${wearable} wearable colours · ${outfitCombos.length} anchor combinations · silver over gold`}
          chips={['Core', 'Soft Autumn crossover', 'Neutrals']}
        />
      ) : undefined}
    >
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
             <div key={i} style={{display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--card)', border: '1px solid var(--border)', padding: '14px', borderRadius: '12px'}}>
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
            <div key={i} style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '16px', opacity: m.name.includes("Avoid") ? 0.5 : 1}}>
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
            <div key={i} style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '20px', borderRadius: '14px'}}>
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
    </AppShellV3>
  );
};

export default ColourPalette;
