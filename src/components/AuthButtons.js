import React from 'react';
import Auth from './Auth';
import { supabase } from '../supabaseClient';

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

export default AuthButtons;