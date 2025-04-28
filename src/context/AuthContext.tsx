'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading state

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setUserProfile(userDocSnap.data() as UserProfile);
            } else {
                // Handle case where user exists in Auth but not Firestore (e.g., profile creation pending)
                setUserProfile(null);
                 console.warn(`User profile not found in Firestore for UID: ${firebaseUser.uid}`);
                 // Optionally trigger profile creation flow here
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setUserProfile(null); // Ensure profile is null on error
        }

      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

   const isAdmin = userProfile?.role === 'admin';

  // Show a loading indicator while checking auth state
  if (loading && typeof window !== 'undefined') {
      return (
          <div className="flex items-center justify-center min-h-screen bg-background">
              <div className="space-y-4 p-8 rounded-lg shadow-lg bg-card w-full max-w-md">
                  <Skeleton className="h-8 w-3/4 mx-auto" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
                  <Skeleton className="h-10 w-full mt-6" />
              </div>
          </div>
      );
  }


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
