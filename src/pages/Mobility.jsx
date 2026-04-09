import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const InlineTimer = ({ initialSeconds = 60 }) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
       setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg)', padding: '10px 20px', borderRadius: '12px', marginTop: '15px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, width: '60px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {mins}:{secs < 10 ? '0'+secs : secs}
      </div>
      <button onClick={() => setIsRunning(!isRunning)} style={{ background: isRunning ? '#c48b47' : 'var(--primary)', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
        {isRunning ? 'Pause' : 'Start'}
      </button>
      <button onClick={() => { setIsRunning(false); setTimeLeft(initialSeconds); }} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        Reset
      </button>
      <div style={{ flex: 1, display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
         <button onClick={() => setTimeLeft(60)} style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer'}}>1m</button>
         <button onClick={() => setTimeLeft(120)} style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer'}}>2m</button>
      </div>
    </div>
  );
};

const MOBILITY_DATA = {
  monday: {
    name: "Monday - Strength",
    routines: {
      "pre-workout": {
        name: "Pre-Workout Support",
        exercises: [
          { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "Ankle mobility", cue: "Slow, full ROM" },
          { order: 2, name: "Hip Airplane", sets: "2x5 each side", load: "None", purpose: "Hip control through ROM", cue: "Hinge at hip, rotate pelvis" },
          { order: 3, name: "Dead Bug", sets: "2x8 each side", load: "None", purpose: "Core anti-extension", cue: "Press low back into floor" },
          { order: 4, name: "90/90 Hip Transition", sets: "5 transitions", load: "None", purpose: "Hip internal/external rotation", cue: "Keep chest tall" },
          { order: 5, name: "Goblet Squat Hold", sets: "2x20s", load: "12-16kg", purpose: "Squat pattern prep", cue: "Elbows push knees out" }
        ]
      },
      "post-workout": {
        name: "Post-Workout Support",
        exercises: [
          { order: 1, name: "Glute Bridge w/ Posterior Tilt", sets: "2x12", load: "None", purpose: "End-range glute control", cue: "Squeeze + tuck pelvis under" },
          { order: 2, name: "Jefferson Curl", sets: "2x8", load: "5-10kg", purpose: "Posterior chain mobility", cue: "Segment by segment" }
        ]
      }
    }
  },
  tuesday: {
    name: "Tuesday - Run",
    routines: {
      "pre-run": {
        name: "Pre-Run Support",
        exercises: [
          { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "Ankle prep", cue: "Full ROM" },
          { order: 2, name: "Calf Raises (slow eccentric)", sets: "2x10", load: "Bodyweight", purpose: "Calf activation", cue: "3s down" },
          { order: 3, name: "Leg Swings (front/back)", sets: "10 each leg", load: "None", purpose: "Hip flexor/hamstring prep", cue: "Controlled swing" },
          { order: 4, name: "ATG Split Squat Hold", sets: "30s each side", load: "None", purpose: "Hip flexor + ankle stretch", cue: "Back knee to floor" }
        ]
      },
      "post-run": {
        name: "Post-Run Support",
        exercises: [
          { order: 1, name: "Wall Ankle Stretch (weighted)", sets: "3x30s each", load: "5-10kg plate on knee", purpose: "Dorsiflexion improvement", cue: "Knee over 2nd toe" },
          { order: 2, name: "Cossack Squat", sets: "2x8 each side", load: "Goblet 8-12kg", purpose: "Adductor stretch + ankle", cue: "Heel stays down" },
          { order: 3, name: "90/90 Flow", sets: "2x5 transitions", load: "None", purpose: "Hip mobility cooldown", cue: "Breathe into tight spots" }
        ]
      }
    }
  },
  wednesday: {
    name: "Wednesday - Mobility",
    routines: {
      "full-session": {
        name: "Full Session",
        exercises: [
          { order: 1, name: "Foam Roller T-Spine", sets: "2x10", load: "None", purpose: "Thoracic mobility", cue: "Extend over roller" }
        ]
      }
    }
  },
  thursday: { name: "Thursday", routines: {} },
  friday: { name: "Friday", routines: {} },
  saturday: { name: "Saturday", routines: {} },
  sunday: { name: "Sunday", routines: {} }
};

const Mobility = () => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);

  const renderRoutines = () => {
    if (!selectedDay || !MOBILITY_DATA[selectedDay].routines) return null;
    return Object.entries(MOBILITY_DATA[selectedDay].routines).map(([key, rot]) => (
      <div 
        key={key} 
        className="app-card" 
        onClick={() => setSelectedRoutine(rot)}
        style={{ cursor: 'pointer', marginBottom: '16px' }}
      >
        <h3 className="heading-serif" style={{fontSize: '1.4rem'}}>{rot.name}</h3>
        <p style={{color: 'var(--text-muted)'}}>{rot.exercises.length} exercises</p>
      </div>
    ));
  };

  const renderExercises = () => {
    if (!selectedRoutine) return null;
    return (
      <div>
        <button onClick={() => setSelectedRoutine(null)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600, marginBottom: '20px'}}>
          ← Back to routines
        </button>
        <h2 className="heading-serif" style={{fontSize: '2rem', marginBottom: '20px'}}>{selectedRoutine.name}</h2>
        {selectedRoutine.exercises.map((ex, i) => (
          <div key={i} style={{background: 'var(--card)', padding: '20px', borderRadius: '16px', marginBottom: '16px', border: '1.5px solid var(--border)'}}>
            <h3 style={{fontWeight: 700, marginBottom: '8px'}}>{ex.order}. {ex.name}</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem'}}>
              <span><strong>Sets:</strong> {ex.sets}</span>
              <span><strong>Load:</strong> {ex.load}</span>
            </div>
            <p style={{fontSize: '0.85rem', color: 'var(--text)'}}><strong>Focus:</strong> {ex.purpose}</p>
            <p style={{fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginTop: '4px', marginBottom: '10px'}}><em>Cue: {ex.cue}</em></p>
            <InlineTimer initialSeconds={60} />
          </div>
        ))}
        <button style={{width: '100%', padding: '16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', marginTop: '10px'}}>
          Complete Workout
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="sticky-header">
        <div className="header-row">
          <Link to="/" className="back-home">← Dashboard</Link>
          <h1 className="heading-serif">Mobility</h1>
          <div style={{width: '80px'}}></div>
        </div>
      </div>

      <div style={{padding: '0 20px'}}>
        {!selectedRoutine && (
          <>
            <div style={{display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '20px', margin: '0 -20px 20px', padding: '0 20px 20px'}}>
              {Object.keys(MOBILITY_DATA).map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    flexShrink: 0, padding: '10px 20px', borderRadius: '20px',
                    background: selectedDay === day ? 'var(--text)' : 'var(--card)',
                    color: selectedDay === day ? 'white' : 'var(--text)',
                    border: '1.5px solid ' + (selectedDay === day ? 'var(--text)' : 'var(--border)'),
                    textTransform: 'capitalize', fontWeight: 600
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
            <div>
              {selectedDay ? renderRoutines() : <p style={{color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px'}}>Select a day to view mobility routines.</p>}
            </div>
          </>
        )}

        {selectedRoutine && renderExercises()}
      </div>
    </div>
  );
};

export default Mobility;
