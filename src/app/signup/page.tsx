
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react'; // Import Loader2

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic Validations
    if (!displayName.trim()) {
        setError("Display Name is required.");
        toast({
            title: "Signup Failed",
            description: "Please enter your display name.",
            variant: "destructive",
        });
        setLoading(false);
        return;
    }
    if (password.length < 6) {
        setError("Password should be at least 6 characters long.");
        toast({
            title: "Signup Failed",
            description: "Password should be at least 6 characters long.",
            variant: "destructive",
        });
        setLoading(false);
        return;
    }

    let user = null; // Define user variable outside try block

    try {
      // 1. Create user in Firebase Auth
      console.log("Attempting to create user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      console.log("Firebase Auth user created successfully:", user.uid);

      // 2. Update Firebase Auth profile
      console.log("Attempting to update Auth profile...");
      try {
          await updateProfile(user, { displayName: displayName.trim() });
          console.log("Firebase Auth profile updated successfully.");
      } catch (profileError: any) {
          console.error("Error updating Firebase Auth profile:", profileError);
          // Non-critical error, log it but continue. Firestore profile is more important.
          toast({
              title: "Profile Update Warning",
              description: `Could not update Auth profile display name: ${profileError.message}`,
              variant: "default", // Not destructive as signup might still succeed partially
          });
      }


      // 3. Create user profile document in Firestore
      console.log("Attempting to create Firestore user profile document...");
      const userDocRef = doc(db, 'users', user.uid);
       // New users start without a group, role 'member', and no FCM token yet
      const newUserProfile: Omit<UserProfile, 'groupName'> = { // Explicitly omit optional fields if not setting them
          uid: user.uid,
          email: user.email, // email might be null depending on provider, but usually available for email/pw
          displayName: displayName.trim(),
          fcmToken: null, // Initialize fcmToken as null
          groupId: null,
          role: 'member',
          createdAt: Timestamp.now()
      };

      try {
          await setDoc(userDocRef, newUserProfile);
          console.log("Firestore user profile document created successfully.");
      } catch (firestoreError: any) {
           console.error("Error creating Firestore user profile document:", firestoreError);
           // This is a more critical error, inform the user.
           // Consider deleting the auth user if Firestore creation fails, but this adds complexity.
           setError(`Failed to save profile data: ${firestoreError.message}. Please contact support.`);
           toast({
               title: "Signup Incomplete",
               description: `Account created, but profile data failed to save: ${firestoreError.message}. You may need assistance.`,
               variant: "destructive",
               duration: 10000, // Longer duration for important messages
           });
           setLoading(false); // Stop loading here as the process is incomplete
           return; // Prevent redirection
      }


      // If all steps succeed
      toast({
          title: "Signup Successful!",
          description: "Account created. Welcome!",
          variant: 'default', // Use default for success
      });
      console.log("Signup process completed successfully. Redirecting...");
      router.push('/'); // Redirect to home page

    } catch (authError: any) { // Catch specific auth errors
      console.error("Signup failed during Auth creation:", authError);
      let friendlyError = 'Failed to create account. Please try again.';
      if (authError.code === 'auth/email-already-in-use') {
          friendlyError = 'This email address is already in use. Please try logging in.';
      } else if (authError.code === 'auth/weak-password') {
          friendlyError = 'The password is too weak. Please choose a stronger password.';
      } else if (authError.code === 'auth/invalid-email') {
           friendlyError = 'Please enter a valid email address.';
      } else if (authError.code === 'auth/operation-not-allowed') {
          friendlyError = 'Email/password accounts are not enabled. Contact support.';
      } else if (authError.code === 'auth/network-request-failed') {
           friendlyError = 'Network error. Please check your internet connection and try again.';
      } else if (authError.code === 'auth/internal-error' || authError.code === 'auth/configuration-not-found') {
            friendlyError = 'Server configuration error. Please contact support.';
      }


      setError(friendlyError);
      toast({
          title: "Signup Failed",
          description: friendlyError,
          variant: "destructive",
      });
    } finally {
      // Always ensure loading is set to false when the process finishes or errors out
      // unless handled specifically within the catch block (like the firestore error case)
      // Check if it wasn't already set to false in a specific catch block
       if (loading) { // Check the state variable directly
          setLoading(false);
          console.log("Setting loading state to false in finally block.");
       } else {
           console.log("Loading state already false, skipping set in finally block.");
       }

    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription>Create your Food Journal account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="•••••••• (min. 6 characters)"
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : 'Sign Up'}
            </Button>
          </form>
           <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline text-primary hover:text-primary/80">
                Log In
              </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

