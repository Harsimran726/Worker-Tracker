import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function useFirebase() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // Silently handle user cancellation
        return;
      }
      console.error("Login failed", err);
      let message = err.message;
      if (message.includes('org_internal') || err.code === 'auth/operation-not-allowed') {
        message = "OAuth Access Blocked: Your project is set to 'Internal'. Please go to Google Cloud Console > APIs & Services > OAuth Consent Screen and change User Type to 'External'.";
      }
      setError(message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout failed", err);
    }
  };

  return { user, loading, login, logout, error };
}
