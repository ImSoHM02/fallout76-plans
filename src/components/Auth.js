import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setIsModalOpen(false);
        handleRedirect();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && window.location.hostname === 'snorl.ax') {
      window.location.href = process.env.REACT_APP_REDIRECT_URL;
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        alert(error.message);
      } else {
        alert('Registration successful! Please check your email for verification.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(error.message);
      } else {
        handleRedirect();
      }
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    console.log('Starting Google Sign In');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: process.env.REACT_APP_REDIRECT_URL
        }
      });
      if (error) {
        console.error('Error signing in with Google:', error);
      } else {
        console.log('Signed in successfully:', data);
        setIsModalOpen(false);
        handleRedirect();
      }
    } catch (error) {
      console.error('Caught error during sign in:', error);
    }
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)} className="custom-button">
        Sign In / Register
      </button>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setIsModalOpen(false)} className="modal-close">
              &times;
            </button>
            <h2>{isRegistering ? 'Register' : 'Sign In'}</h2>
            {loading ? (
              'Processing...'
            ) : (
              <>
                <form onSubmit={handleAuth}>
                  <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="submit" className="custom-button">
                    {isRegistering ? 'Register' : 'Sign In'}
                  </button>
                  <button onClick={handleGoogleSignIn} className="custom-button">
                  Login With Google
                </button>
                </form>

                <p>
                  {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
                  <button onClick={() => setIsRegistering(!isRegistering)} className="custom-button">
                    {isRegistering ? 'Sign In' : 'Register'}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Auth;