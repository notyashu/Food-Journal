'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
// Skeleton import is removed as the loading state here is removed

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
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const profileData = userDocSnap.data() as UserProfile;
                 // Basic validation
                 if (!profileData.uid || !profileData.email) {
                    console.error("Fetched user profile is missing essential fields (uid or email):", profileData);
                    setUserProfile(null);
                 } else {
                    setUserProfile(profileData);
                 }
            } else {
                // Handle case where user exists in Auth but not Firestore profile doc
                setUserProfile(null);
                console.warn(`User profile document not found in Firestore for UID: ${firebaseUser.uid}. User might need setup.`);
            }
        } catch (error) {
            // Log the specific error during profile fetch
            console.error(`Error fetching user profile for UID ${firebaseUser.uid}:`, error);
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

   // Determine admin status based on the fetched profile
   const isAdmin = !!userProfile && userProfile.role === 'admin';

  // Child components should use the `loading` state from the context
  // to determine their own rendering (e.g., show skeletons, redirect).

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
