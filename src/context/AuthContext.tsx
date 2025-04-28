'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
// Skeleton import is removed as the loading state here is removed
// import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextProps {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Initialize loading to true

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Keep setLoading(true) at the beginning if you want immediate feedback
      // setLoading(true); // Optional: Uncomment if you want loading=true during the async check

      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setUserProfile(userDocSnap.data() as UserProfile);
            } else {
                // Handle case where user exists in Auth but not Firestore
                setUserProfile(null);
                 console.warn(`User profile not found in Firestore for UID: ${firebaseUser.uid}`);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setUserProfile(null); // Ensure profile is null on error
        }
      } else {
        setUserProfile(null);
      }
      // Set loading to false only after all checks/fetches are complete
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

   const isAdmin = userProfile?.role === 'admin';

  // Remove the conditional rendering block that caused hydration issues.
  // Child components should use the `loading` state from the context
  // to determine their own rendering (e.g., show skeletons, redirect).
  // if (loading && typeof window !== 'undefined') { ... } // REMOVED

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
