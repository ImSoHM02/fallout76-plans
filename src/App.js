import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import UsernameSetup from "./components/UsernameSetup";
import PlanList from "./components/PlanList";
import ApparelList from "./components/ApparelList";
import Calculator from "./components/Calculator";
//import Storage from "./components/Storage";
//import TradeBoard from "./components/TradeBoard";
import PublicTradeProfile from "./components/PublicTradeProfile";
import ThemeSwitcher from "./components/ThemeSwitcher";
import "./App.css";
import "./themes.css";

const AuthButtons = ({ session, onSignOut, onLogin }) => {
  return (
    <div className="sidebar-auth-buttons">
      {session ? (
        <button onClick={onSignOut} className="custom-button">
          Sign Out
        </button>
      ) : (
        <Auth onLogin={onLogin} />
      )}
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [hasUsername, setHasUsername] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "default";
  });
  const [selectedCategory, setSelectedCategory] = useState("plans");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkUsername(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUsername(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const checkUsername = async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', userId)
      .single();

    if (error || !data) {
      setHasUsername(false);
    } else {
      setHasUsername(true);
    }
  };

  const handleLogin = (user) => {
    setSession({ user });
    checkUsername(user.id);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
    setSession(null);
    setHasUsername(true);
  };

  const handleUsernameSetup = () => {
    setHasUsername(true);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setIsSidebarOpen(false);
  };

  const renderMainContent = () => {
    switch (selectedCategory) {
      case "plans":
        return <PlanList session={session} />;
      case "apparel":
        return <ApparelList session={session} />;
      case "calculator":
        return <Calculator />;
//      case "storage":
//        return session ? <Storage session={session} /> : <div className="sign-in-message">Please sign in to access Storage.</div>;
//      case "tradeboard":
//        return session ? <TradeBoard session={session} /> : <div className="sign-in-message">Please sign in to access Trade Board.</div>;
      default:
        return null;
    }
  };

  return (
    <Router>
      <div className="wrapper">
        <div className="overlay"></div>
        <button
          className={`sidebar-toggle ${isSidebarOpen ? "open" : ""}`}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          &#9776;
        </button>
        <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <AuthButtons session={session} onSignOut={handleSignOut} onLogin={handleLogin} />
          </div>
          <nav>
            <ul>
              <li>
                <button onClick={() => handleCategoryChange("plans")}>
                  Plans
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryChange("apparel")}>
                  Apparel
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryChange("calculator")}>
                  Calculator
                </button>
              </li>
              {/* <li>
                <button onClick={() => handleCategoryChange("storage")}>
                  Storage
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryChange("tradeboard")}>
                  Trade Board
                </button>
              </li> */}
            </ul>
          </nav>
        </div>
        <div className="main">
          <header className="header-style">
            <div className="header-content">
              <div className="title-container">
                <h1>B.R.A.H.M.I.N</h1>
              </div>
            </div>
          </header>
          {!session && (selectedCategory === "storage" || selectedCategory === "tradeboard") ? (
            <div className="sign-in-message">Please sign in to access {selectedCategory === "storage" ? "Storage" : "Trade Board"}.</div>
          ) : !session || hasUsername ? (
            <Routes>
              <Route path="/trader/:userId" element={<PublicTradeProfile />} />
              <Route path="/" element={renderMainContent()} />
            </Routes>
          ) : (
            <UsernameSetup session={session} onComplete={handleUsernameSetup} />
          )}
        </div>
        <footer className="site-footer">
          <div className="footer-content">
            <nav className="footer-nav">
              Special thanks to{" "}
              <a href="https://fed76.info/plan-collectors">The Plan Collectors</a>{" "}
              <a href="https://discord.gg/ksF63Z2">(Discord)</a>
            </nav>
            <div className="theme-selector-footer">
              <ThemeSwitcher currentTheme={theme} setTheme={handleThemeChange} />
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;