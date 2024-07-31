import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import PlanList from "./components/PlanList";
import ApparelList from "./components/ApparelList";
import Calculator from "./components/Calculator";
import Storage from "./components/Storage";
import ThemeSwitcher from "./components/ThemeSwitcher";
import "./App.css";
import "./themes.css";

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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
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
            <li>
              <button onClick={() => handleCategoryChange("storage")}>
                Storage
              </button>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          {session ? (
            <button onClick={handleSignOut} className="custom-button">
              Sign Out
            </button>
          ) : (
            <Auth />
          )}
        </div>
      </div>
      <div className="main">
        <header className="header-style">
          <div className="header-content">
            <div className="title-container">
              <h1>B.R.A.H.M.I.N</h1>
            </div>
          </div>
        </header>
        {selectedCategory === "plans" ? (
          <PlanList session={session} />
        ) : selectedCategory === "apparel" ? (
          <ApparelList session={session} />
        ) : selectedCategory === "calculator" ? (
          <Calculator />
        ) : selectedCategory === "storage" ? (
          <Storage session={session} />
        ) : null}
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