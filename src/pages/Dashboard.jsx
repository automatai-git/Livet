import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Dashboard = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

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
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

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

  return (
    <>
      <header className="dashboard-header">
        <p className="label">Your tools</p>
        <h1 className="heading-serif dashboard-title">Life & Training <em className="dashboard-title-em">Hub</em></h1>
        <p className="tagline">Track your journey, optimize your performance</p>
      </header>

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
