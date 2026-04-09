import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { trainingData } from '../data/workout-data.js';

const Dashboard = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [todayAgenda, setTodayAgenda] = useState({ meal: null, workout: null, loading: true });

  useEffect(() => {
    // Check if the device is iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setShowInstallPrompt(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isIosDevice) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    fetchAgenda();
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const fetchAgenda = async () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const dayName = days[today.getDay()];
    
    // DD.MM.YYYY format for workouts
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}.${mm}.${yyyy}`;

    try {
      const [mealRes, workoutRes] = await Promise.all([
        supabase.from('weekly_menu').select('meals(emoji, name)').eq('day_of_week', dayName).maybeSingle(),
        supabase.from('workouts').select('session_type, main_workout').eq('date', dateStr).maybeSingle()
      ]);

      setTodayAgenda({
        meal: mealRes.data?.meals,
        workout: workoutRes.data,
        loading: false
      });
    } catch (e) {
      console.error(e);
      setTodayAgenda(prev => ({...prev, loading: false}));
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleMigrateData = async () => {
    try {
      // 1. Migrate Workouts
      let workoutInserts = [];
      trainingData.weeks.forEach(week => {
        week.days.forEach(day => {
          workoutInserts.push({
            week_num: week.week,
            start_date: week.startDate,
            end_date: week.endDate,
            phase: week.phase,
            date: day.date,
            day_name: day.day,
            session_type: day.session,
            main_workout: day.mainWorkout,
            support: day.support,
            rpe: day.rpe,
            notes: day.notes,
            comments: day.comments
          });
        });
      });
      console.log('Inserting', workoutInserts.length, 'workouts...');
      const { error: wError } = await supabase.from('workouts').insert(workoutInserts);
      if (wError) throw wError;

      // 2. Migrate Timeline
      const localTimeline = JSON.parse(localStorage.getItem('lifeTimelinePWA') || '[]');
      if (localTimeline.length > 0) {
        let timelineInserts = localTimeline.map(item => ({
          what: item.what,
          when_date: item.when,
          why: item.why || '',
          icon: item.icon || '📍'
        }));
        console.log('Inserting', timelineInserts.length, 'timeline events...');
        const { error: tError } = await supabase.from('timeline_events').insert(timelineInserts);
        if (tError) throw tError;
      }
      
      alert('Data migration to Supabase completed successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to migrate: ' + err.message);
    }
  };

  return (
    <>
      <header className="dashboard-header">
        <p className="label">Your tools</p>
        <h1 className="heading-serif dashboard-title">Life & Training <em className="dashboard-title-em">Hub</em></h1>
        <p className="tagline">Track your journey, optimize your performance</p>
      </header>

      {/* TODAY'S AGENDA WIDGET */}
      <div style={{ background: 'var(--card)', margin: '0 20px 20px', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 className="heading-serif" style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--text)' }}>⚡ Today's Agenda</h2>
        {todayAgenda.loading ? (
           <p style={{ color: 'var(--text-muted)' }}>Loading agenda...</p>
        ) : (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <Link to="/menu" style={{ textDecoration: 'none', color: 'var(--text)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg)', padding: '12px', borderRadius: '12px', transition: 'transform 0.2s' }}>
                 <div style={{ fontSize: '1.5rem', background: 'var(--card)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍽️</div>
                 <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Dinner</div>
                    <div style={{ fontWeight: 600 }}>{todayAgenda.meal ? `${todayAgenda.meal.emoji} ${todayAgenda.meal.name}` : 'Not planned'}</div>
                 </div>
               </div>
             </Link>
             
             <Link to="/workout" style={{ textDecoration: 'none', color: 'var(--text)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg)', padding: '12px', borderRadius: '12px', transition: 'transform 0.2s' }}>
                 <div style={{ fontSize: '1.5rem', background: 'var(--card)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💪</div>
                 <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Workout</div>
                    <div style={{ fontWeight: 600 }}>{todayAgenda.workout ? `${todayAgenda.workout.session_type}: ${todayAgenda.workout.main_workout}` : 'Rest Day'}</div>
                 </div>
               </div>
             </Link>
           </div>
        )}
      </div>

      {showInstallPrompt && (
        <div className="install-prompt show">
          <button className="close-prompt" onClick={() => setShowInstallPrompt(false)}>×</button>
          <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '5px' }}>Install App</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
            Add to your home screen for quick access
          </p>
          {isIOS ? (
             <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '10px', borderRadius: '10px'}}>
               To install: tap the <strong>Share</strong> icon (square with arrow pointing up) and select <strong>Add to Home Screen</strong>.
             </div>
          ) : (
            <button className="install-btn" onClick={handleInstallClick}>Install</button>
          )}
        </div>
      )}

      <div className="app-grid">
        <Link to="/menu" className="app-card featured">
          <div className="app-icon">🍽️</div>
          <div className="app-title">Menu <em>Planner</em></div>
          <p className="app-description">
            Plan dinners, build shopping lists, track what you've cooked and get suggestions for what to make next.
          </p>
          <div className="cta-row">
            <span className="arrow">↗</span>
            Open planner
          </div>
        </Link>

        <Link to="/timeline" className="app-card">
          <div className="app-icon">📍</div>
          <div className="app-title">Milestone Timeline</div>
          <p className="app-description">
            Track and visualize life's significant moments with a beautiful snaking timeline.
          </p>
          <span className="app-badge">Life Planning</span>
        </Link>

        <Link to="/mobility" className="app-card">
          <div className="app-icon">🧘</div>
          <div className="app-title">Mobility Tracker</div>
          <p className="app-description">
            Structured weekly mobility workouts with progress tracking.
          </p>
          <span className="app-badge">Wellness</span>
        </Link>

        <Link to="/workout" className="app-card">
          <div className="app-icon">💪</div>
          <div className="app-title">Workout Finder</div>
          <p className="app-description">
            Access your structured Block 3 training plan and daily sessions.
          </p>
          <span className="app-badge">Fitness</span>
        </Link>

        <Link to="/colour" className="app-card">
          <div className="app-icon" style={{background: 'linear-gradient(135deg, #8FA387, #7389A2, #C4929B)'}}>🎨</div>
          <div className="app-title">Soft Summer Palette</div>
          <p className="app-description">
            Your personal colour analysis guide and outfit combinations.
          </p>
          <span className="app-badge">Style</span>
        </Link>

        <Link to="/bucket" className="app-card">
          <div className="app-icon" style={{background: 'linear-gradient(135deg, #3d5a32, #5a7a4a)'}}>🌍</div>
          <div className="app-title">Bucket List</div>
          <p className="app-description">
            Your 425 lifetime experiences to track and unlock.
          </p>
          <span className="app-badge">Goals</span>
        </Link>
      </div>

      <footer className="dashboard-footer">
        <p>Personal productivity ecosystem · v2.0 React</p>
        <button 
          onClick={handleMigrateData} 
          style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}
        >
          🚀 MIGRATE DATA TO SUPABASE
        </button>
        <br/>
        <button 
          onClick={() => supabase.auth.signOut()} 
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', marginTop: '10px', fontSize: '0.8rem' }}
        >
          Logout
        </button>
      </footer>
    </>
  );
};

export default Dashboard;
