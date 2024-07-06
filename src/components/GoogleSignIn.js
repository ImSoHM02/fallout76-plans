import { useEffect } from 'react';

const GoogleSignIn = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn
      });
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleSignIn = (response) => {
    // Handle the sign-in response here
    console.log('Signed in with Google:', response);
  };

  return null; // This component doesn't render anything
};

export default GoogleSignIn;