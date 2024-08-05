import React from 'react';

const themes = ['default', 'blue', 'amber', 'purple', 'cyan', 'yellow']; // Add more theme names as needed

const ThemeSwitcher = ({ currentTheme, setTheme }) => {
  return (
    <select 
      value={currentTheme} 
      onChange={(e) => setTheme(e.target.value)}
      className="custom-button"
    >
      {themes.map(theme => (
        <option key={theme} value={theme}>
          {theme.charAt(0).toUpperCase() + theme.slice(1)}
        </option>
      ))}
    </select>
  );
};

export default ThemeSwitcher;