import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const InlineTimer = ({ initialSeconds = 60 }) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setIsRunning(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

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
        name: "Full Corrective Session",
        exercises: [
          { order: 1, name: "Foam Roller T-Spine Extension", sets: "2x10", load: "None", purpose: "Thoracic mobility", cue: "Extend over roller at each segment" },
          { order: 2, name: "Dead Bug (full)", sets: "3x10/side", load: "None", purpose: "Core anti-extension (BUTT WINK)", cue: "Low back STAYS on floor" },
          { order: 3, name: "Pallof Press", sets: "3x10/side", load: "Band/Cable", purpose: "Core anti-rotation (BUTT WINK)", cue: "No rotation, brace hard" },
          { order: 4, name: "Copenhagen Plank", sets: "3x8-12/side", load: "Bodyweight", purpose: "Adductor strength (GROIN)", cue: "Progress: bent → straight leg" },
          { order: 5, name: "90/90 Flow + Holds", sets: "3x5 transitions + 30s hold weak side", load: "None", purpose: "Hip rotation (HIPS)", cue: "Extra time on left" },
          { order: 6, name: "Wall Ankle Stretch (weighted)", sets: "3x45s each", load: "10kg plate", purpose: "Dorsiflexion (ANKLES)", cue: "Track knee over toe" },
          { order: 7, name: "Tibialis Raise", sets: "3x15", load: "Bodyweight or band", purpose: "Anterior ankle strength (ANKLES)", cue: "Toes up, control down" },
          { order: 8, name: "Jefferson Curl", sets: "3x8", load: "10-15kg", purpose: "Posterior chain under load", cue: "Slow, segmental" },
          { order: 9, name: "Cossack Squat", sets: "3x8 each", load: "Goblet 12-16kg", purpose: "Adductors + ankle (GROIN/ANKLES)", cue: "Heel down, chest up" },
          { order: 10, name: "ATG Split Squat", sets: "3x8 each", load: "DBs 5-10kg", purpose: "Hip flexor length (HIPS/BUTT WINK)", cue: "Back knee touches floor" },
          { order: 11, name: "Goblet Squat Hold + Pulses", sets: "2x30s + 10 pulses", load: "16-20kg", purpose: "End-range squat strength", cue: "Elbows push knees, stay deep" },
          { order: 12, name: "Glute Bridge w/ Posterior Tilt", sets: "3x12", load: "None", purpose: "Glute control at end-range (BUTT WINK)", cue: "Tuck pelvis, squeeze top" }
        ]
      }
    }
  },
  thursday: {
    name: "Thursday - Run",
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
  friday: {
    name: "Friday - Strength (Upper)",
    routines: {
      "pre-workout": {
        name: "Pre-Workout Support",
        exercises: [
          { order: 1, name: "Arm Circles (forward/back)", sets: "2 x 10 each direction", load: "None", purpose: "Shoulder warm-up", cue: "Small, controlled circles" },
          { order: 2, name: "Banded Shoulder Dislocates", sets: "2 x 10", load: "Band or dowel", purpose: "Shoulder mobility (right shoulder management)", cue: "Move arms overhead and behind, no pain" },
          { order: 3, name: "Banded Pull-Aparts", sets: "2 x 10", load: "Light band", purpose: "Scapular activation", cue: "Pull at chest level, squeeze blades" },
          { order: 4, name: "Band External Rotation", sets: "2 x 10 each arm", load: "Light band", purpose: "Rotator cuff prep", cue: "Elbow at side, rotate forearm out" },
          { order: 5, name: "Wall Slides", sets: "2x8", load: "None", purpose: "Shoulder + T-spine", cue: "Back stays on wall" },
          { order: 6, name: "Dead Bug", sets: "2x8 each side", load: "None", purpose: "Core anti-extension", cue: "Press low back into floor" }
        ]
      },
      "post-workout": {
        name: "Post-Workout Support",
        exercises: [
          { order: 1, name: "Prone Y-T-W", sets: "2x8 each position", load: "None or 1-2kg", purpose: "Thoracic extension + posture", cue: "Squeeze at top" },
          { order: 2, name: "Jefferson Curl", sets: "2x8", load: "5-10kg", purpose: "Posterior chain", cue: "Slow" }
        ]
      }
    }
  },
  saturday: {
    name: "Saturday - Flex / Sport",
    routines: {
      "pre-sport": {
        name: "Pre-Sport Activation",
        exercises: [
          { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "General prep", cue: "Full ROM" },
          { order: 2, name: "Leg Swings (lateral)", sets: "10 each leg", load: "None", purpose: "Adductor prep", cue: "Controlled" },
          { order: 3, name: "Walking Lunges", sets: "10 each leg", load: "None", purpose: "Hip activation", cue: "Upright torso" },
          { order: 4, name: "Calf Raises", sets: "2x10", load: "Bodyweight", purpose: "Calf activation", cue: "Full ROM" }
        ]
      }
    }
  },
  sunday: {
    name: "Sunday - Long Run",
    routines: {
      "pre-run": {
        name: "Pre-Long-Run Activation",
        exercises: [
          { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "Ankle prep", cue: "Slow, full ROM" },
          { order: 2, name: "Hip Airplane", sets: "2x5 each side", load: "None", purpose: "Hip control through ROM", cue: "Hinge at hip, rotate pelvis" },
          { order: 3, name: "Leg Swings (front/back)", sets: "10 each leg", load: "None", purpose: "Hip flexor/hamstring prep", cue: "Controlled swing" },
          { order: 4, name: "ATG Split Squat Hold", sets: "30s each side", load: "None", purpose: "Hip flexor + ankle stretch", cue: "Back knee to floor" }
        ]
      },
      "post-run": {
        name: "Post-Long-Run Cooldown",
        exercises: [
          { order: 1, name: "Wall Ankle Stretch (weighted)", sets: "3x45s each", load: "10kg plate", purpose: "Dorsiflexion (ANKLES)", cue: "Knee tracks over toe" },
          { order: 2, name: "Cossack Squat", sets: "3x8 each", load: "Goblet 12kg", purpose: "Adductors (GROIN)", cue: "Heel down" },
          { order: 3, name: "90/90 Flow", sets: "3x5 transitions", load: "None", purpose: "Hip rotation (HIPS)", cue: "Breathe into stretch" },
          { order: 4, name: "ATG Split Squat", sets: "2x8 each + 1 extra left", load: "Bodyweight", purpose: "Hip flexors (HIPS asymmetry)", cue: "Extra left side" },
          { order: 5, name: "Jefferson Curl", sets: "2x8", load: "5-10kg", purpose: "Hamstring cooldown", cue: "Slow" }
        ]
      }
    }
  }
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const Mobility = () => {
  const todayName = DAYS[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [selectedRoutine, setSelectedRoutine] = useState(null);

  const renderRoutines = () => {
    if (!selectedDay || !MOBILITY_DATA[selectedDay]) return null;
    const routines = MOBILITY_DATA[selectedDay].routines || {};
    const entries = Object.entries(routines);
    if (entries.length === 0) {
      return <p style={{color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px'}}>No mobility routine for this day. Tap another day above.</p>;
    }
    return entries.map(([key, rot]) => (
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
              {Object.keys(MOBILITY_DATA).map(day => {
                const isToday = day === todayName;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      flexShrink: 0, padding: '10px 20px', borderRadius: '20px',
                      background: selectedDay === day ? 'var(--text)' : 'var(--card)',
                      color: selectedDay === day ? 'white' : 'var(--text)',
                      border: isToday ? '2px solid var(--success)' : ('1.5px solid ' + (selectedDay === day ? 'var(--text)' : 'var(--border)')),
                      textTransform: 'capitalize', fontWeight: 600,
                      position: 'relative'
                    }}
                  >
                    {isToday && <span style={{position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--success)', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 800}}>TODAY</span>}
                    {day}
                  </button>
                );
              })}
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
