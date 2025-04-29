
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
          console.warn("Error updating Firebase Auth profile:", profileError);
          // Non-critical error, log it but continue. Firestore profile is more important.
          toast({
              title: "Profile Update Warning",
              description: `Could not update Auth profile display name: ${profileError.message || 'Unknown error'}. Proceeding with Firestore profile creation.`,
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
           // This is a critical error. We still need to let the finally block handle loading state.
           // We need to throw the error so it's caught by the outer catch block, which then lets finally run.
           setError(`Failed to save profile data: ${firestoreError.message}. Please contact support.`);
           toast({
               title: "Signup Incomplete",
               description: `Account created, but profile data failed to save: ${firestoreError.message}. You may need assistance.`,
               variant: "destructive",
               duration: 10000, // Longer duration for important messages
           });
           // Throw the error to prevent redirection and let the outer catch handle it.
           throw firestoreError;
      }


      // If all steps succeed (Auth Create, Auth Update, Firestore Create)
      toast({
          title: "Signup Successful!",
          description: "Account created. Redirecting to login...",
          variant: 'default', // Use default for success
      });
      console.log("Signup process completed successfully. Redirecting to login...");
      router.push('/login'); // Redirect to login page

    } catch (error: any) { // Catch errors from Auth creation OR thrown Firestore error
      console.error("Signup failed:", error);

      // Handle Auth errors specifically
      if (error.code && typeof error.code === 'string' && error.code.startsWith('auth/')) {
          let friendlyError = 'Failed to create account. Please try again.';
          if (error.code === 'auth/email-already-in-use') {
              friendlyError = 'This email address is already in use. Please try logging in.';
          } else if (error.code === 'auth/weak-password') {
              friendlyError = 'The password is too weak. Please choose a stronger password.';
          } else if (error.code === 'auth/invalid-email') {
               friendlyError = 'Please enter a valid email address.';
          } else if (error.code === 'auth/operation-not-allowed') {
              friendlyError = 'Email/password accounts are not enabled. Contact support.';
          } else if (error.code === 'auth/network-request-failed') {
               friendlyError = 'Network error. Please check your internet connection and try again.';
          } else if (error.code === 'auth/internal-error' || error.code === 'auth/configuration-not-found') {
                friendlyError = 'Server configuration error. Please contact support.';
          } else if (error.code === 'auth/api-key-not-valid') {
                 friendlyError = 'Invalid Firebase API Key. Please check your environment configuration.';
          }
           // Set error state only for Auth errors here, Firestore errors set it inside the inner try/catch
          setError(friendlyError);
          toast({
              title: "Signup Failed",
              description: friendlyError,
              variant: "destructive",
          });
      } else {
          // Handle errors thrown from Firestore setDoc or other unexpected errors
          // Error state and toast are already set inside the Firestore catch block if it originated there.
          // If it's another unexpected error, set a generic message.
          if (!error) { // Check if error state was already set by Firestore catch
             setError(error.message || 'An unexpected error occurred during signup.');
             toast({
                 title: "Signup Error",
                 description: error.message || 'An unexpected error occurred.',
                 variant: "destructive",
             });
          }
      }
      // Ensure loading is set to false even if there's an error before the finally block (though finally should handle it)
      setLoading(false);

    } finally {
      // Always reset loading state regardless of success or failure
      setLoading(false);
      console.log("Signup attempt finished. Loading state set to false.");
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
