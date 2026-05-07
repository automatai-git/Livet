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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: '0.95rem', minWidth: 42 }}>
        {mins}:{secs < 10 ? '0' + secs : secs}
      </span>
      <button onClick={() => setIsRunning(!isRunning)} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
        {isRunning ? 'Pause' : 'Start'}
      </button>
      <button onClick={() => { setIsRunning(false); setTimeLeft(initialSeconds); }} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>Reset</button>
      <div style={{ flex: 1, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button onClick={() => setTimeLeft(60)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>1m</button>
        <button onClick={() => setTimeLeft(120)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>2m</button>
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
      return <p className="muted-row" style={{ textAlign: 'center', marginTop: 32 }}>No mobility routine for this day.</p>;
    }
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {entries.map(([key, rot]) => (
          <button
            key={key}
            className="tight-card"
            onClick={() => setSelectedRoutine(rot)}
            style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
          >
            <div>
              <div className="heading-serif" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{rot.name}</div>
              <div className="muted-row" style={{ marginTop: 2 }}>{rot.exercises.length} exercises</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>›</span>
          </button>
        ))}
      </div>
    );
  };

  const renderExercises = () => {
    if (!selectedRoutine) return null;
    return (
      <div>
        <button onClick={() => setSelectedRoutine(null)} className="back-home" style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, fontSize: '0.85rem' }}>
          ← Back
        </button>
        <h2 className="heading-serif" style={{ fontSize: '1.4rem', marginBottom: 14 }}>{selectedRoutine.name}</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {selectedRoutine.exercises.map((ex, i) => (
            <div key={i} className="tight-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ex.order}. {ex.name}</div>
                <span className="muted-row" style={{ whiteSpace: 'nowrap' }}>{ex.sets}</span>
              </div>
              {ex.load && ex.load !== 'None' && (
                <div className="muted-row" style={{ marginTop: 2 }}>{ex.load}</div>
              )}
              <div style={{ fontSize: '0.85rem', marginTop: 6, lineHeight: 1.5 }}>{ex.cue}</div>
              {ex.purpose && (
                <div style={{ marginTop: 6 }}>
                  <span className="tag-chip">{ex.purpose}</span>
                </div>
              )}
              <InlineTimer initialSeconds={60} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="sticky-header">
        <div className="header-row">
          <Link to="/" className="back-home">← Dashboard</Link>
          <h1 className="heading-serif" style={{ fontSize: '1.25rem' }}>Mobility</h1>
          <div style={{ width: 60 }} />
        </div>
      </div>

      <div style={{ padding: '4px 16px 24px', maxWidth: 720, margin: '0 auto' }}>
        {!selectedRoutine && (
          <>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14, marginBottom: 14, scrollbarWidth: 'none' }}>
              {Object.keys(MOBILITY_DATA).map(day => {
                const isToday = day === todayName;
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      flexShrink: 0, padding: '7px 14px', borderRadius: 999,
                      background: isSelected ? 'var(--primary)' : 'var(--card)',
                      color: isSelected ? '#fff' : 'var(--text)',
                      border: '1px solid ' + (isSelected ? 'var(--primary)' : 'var(--border)'),
                      textTransform: 'capitalize', fontWeight: 500, fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: isToday && !isSelected ? 'inset 0 0 0 1px var(--primary)' : 'none',
                    }}
                  >
                    {day}
                    {isToday && <span style={{ marginLeft: 6, fontSize: '0.62rem', color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--primary-light)', fontWeight: 600, letterSpacing: 0.5 }}>·TODAY</span>}
                  </button>
                );
              })}
            </div>
            {renderRoutines()}
          </>
        )}

        {selectedRoutine && renderExercises()}
      </div>
    </div>
  );
};

export default Mobility;
