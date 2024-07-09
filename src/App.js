import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import PlanList from "./components/PlanList";
import ApparelList from "./components/ApparelList";
import Calculator from "./components/Calculator"; // Import the new Calculator component
import ThemeSwitcher from "./components/ThemeSwitcher";
import "./App.css";
import "./themes.css";

const AuthButtons = ({ session }) => {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
  };

  return (
    <div className="auth-buttons">
      {session ? (
        <button onClick={handleSignOut} className="custom-button">
          Sign Out
        </button>
      ) : (
        <Auth />
      )}
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "default";
  });
  const [selectedCategory, setSelectedCategory] = useState("plans");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setIsSidebarOpen(false);
  };

  return (
    <div className="wrapper">
      <div className="overlay"></div>
      <button
        className={`sidebar-toggle ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        &#9776;
      </button>
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
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
        <AuthButtons session={session} />
        {selectedCategory === "plans" ? (
          <PlanList session={session} />
        ) : selectedCategory === "apparel" ? (
          <ApparelList session={session} />
        ) : (
          <Calculator />
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
  );
}

export default App;
