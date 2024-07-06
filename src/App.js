import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import PlanList from './components/PlanList';
import ThemeSwitcher from './components/ThemeSwitcher';
import './App.css';
import './themes.css';

// New AuthButtons component
const AuthButtons = ({ session }) => {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  return (
    <div className="auth-buttons">
      {session ? (
        <button onClick={handleSignOut} className="custom-button">Sign Out</button>
      ) : (
        <Auth />
      )}
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'default';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <div className="wrapper">
      <div className="overlay"></div>
      <div className="main">
        <header className="header-style">
          <div className="header-content">
            <div className="title-container">
              <h1>B.R.A.H.M.I.N</h1>
            </div>
          </div>
        </header>
        <AuthButtons session={session} /> {/* New AuthButtons component */}
        <PlanList session={session} />
      </div>
      <footer className="site-footer">
        <div className="footer-content">
          <nav className="footer-nav">
            Special thanks to <a href="https://fed76.info/plan-collectors">The Plan Collectors</a> <a href="https://discord.gg/ksF63Z2">(Discord)</a>
          </nav>
          <div className="theme-selector-footer">
            <ThemeSwitcher currentTheme={theme} setTheme={handleThemeChange} />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;