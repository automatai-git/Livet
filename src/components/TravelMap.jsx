import React from 'react';
import { ISLANDS } from '../data/travelData';

const TravelMap = ({ onSelectIsland, activeIsland }) => {
  // Simplified Hawaii Island chain coordinates
  // Kauai: { x: 10, y: 20 }
  // Oahu: { x: 35, y: 35 }
  // Maui: { x: 60, y: 50 }
  // Big Island: { x: 80, y: 70 }

  return (
    <div style={{
      width: '100%',
      aspectRatio: '16/9',
      background: 'rgba(255,255,255,0.5)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      border: '1px solid rgba(0,0,0,0.05)',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {/* Ocean background subtle texture or dots if needed */}
        
        {/* Connection Lines (Route path) */}
        <path 
          d="M 80 70 L 35 35 L 10 20" 
          fill="none" 
          stroke="var(--primary)" 
          strokeWidth="0.5" 
          strokeDasharray="2,2"
          style={{ opacity: 0.3 }}
        />

        {/* Island Shapes (Simplified Circles/Blobs) */}
        {ISLANDS.map((isl) => {
          const isActive = activeIsland === isl.id;
          const isMainTrip = ['big-island', 'oahu', 'kauai'].includes(isl.id);
          
          return (
            <g 
              key={isl.id} 
              onClick={() => onSelectIsland(isl.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Glow for active */}
              {isActive && (
                <circle 
                  cx={isl.coords.x} cy={isl.coords.y} r="6" 
                  fill={isl.color} style={{ opacity: 0.2 }}
                />
              )}
              
              {/* Mainland shape (Simplified circle for premium look) */}
              <circle 
                cx={isl.coords.x} cy={isl.coords.y} r="2.5" 
                fill={isl.color} 
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isActive ? 'scale(1.5)' : 'scale(1)',
                  transformOrigin: `${isl.coords.x}px ${isl.coords.y}px`,
                  opacity: isMainTrip ? 1 : 0.4
                }}
              />

              {/* Label */}
              <text 
                x={isl.coords.x} y={isl.coords.y + 6} 
                textAnchor="middle" 
                style={{
                  fontSize: '3px',
                  fontWeight: isActive ? 800 : 600,
                  fill: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontFamily: 'system-ui',
                  transition: 'all 0.3s'
                }}
              >
                {isl.name.split(' ')[0]}
              </text>

              {/* Sequence Indicator (Day numbers) */}
              {isMainTrip && (
                <circle 
                  cx={isl.coords.x + 3} cy={isl.coords.y - 3} r="1.5" 
                  fill="white" stroke={isl.color} strokeWidth="0.3"
                />
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Legend / Stats overlay */}
      <div style={{
        position: 'absolute', bottom: '15px', right: '20px',
        fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600
      }}>
        12-DAY ISLAND HOPPING ROUTE
      </div>
    </div>
  );
};

export default TravelMap;
