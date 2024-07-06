import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import PlanList from './components/PlanList';
import ThemeSwitcher from './components/ThemeSwitcher';
import './App.css';
import './themes.css';

function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or default to 'default'
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
    // Save theme to localStorage whenever it changes
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
        {!session && <Auth />}
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