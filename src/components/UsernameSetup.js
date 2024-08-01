import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const UsernameSetup = ({ session, onComplete }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
  
    const { error } = await supabase
      .from('user_profiles')
      .insert([
        { id: session.user.id, username: username }
      ]);
  
    if (error) {
      if (error.code === '23505') {
        setError('This username is already taken. Please choose another.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } else {
      onComplete();
    }
  };

  return (
    <div className="username-setup">
      <h2>Set Your Username</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your desired username"
          required
        />
        <button type="submit">Set Username</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default UsernameSetup;