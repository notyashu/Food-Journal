
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

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  // Removed phoneNumber state
  // const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Removed phone number validation
  // const isValidPhoneNumber = (num: string) => /^\+?[0-9\s-()]{7,}$/.test(num);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

    // Removed phone number checks
    // if (!phoneNumber.trim()) { ... }
    // if (!isValidPhoneNumber(phoneNumber)) { ... }


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

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Firebase Auth profile
      await updateProfile(user, { displayName: displayName });

      // 3. Create user profile document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
       // New users start without a group, role 'member', and no FCM token yet
      const newUserProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: displayName.trim(),
          phoneNumber: '', // Set phone number to empty string or null if field still exists
          fcmToken: null, // Initialize fcmToken as null
          groupId: null,
          role: 'member',
          createdAt: Timestamp.now()
      };
      await setDoc(userDocRef, newUserProfile);

      toast({
          title: "Signup Successful",
          description: "Account created. Please wait to be added to a group by an admin.",
      });
      router.push('/'); // Redirect to home page
    } catch (err: any) {
      console.error("Signup failed:", err);
      let friendlyError = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
          friendlyError = 'This email address is already in use. Please try logging in.';
      } else if (err.code === 'auth/weak-password') {
          friendlyError = 'The password is too weak. Please choose a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
           friendlyError = 'Please enter a valid email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
          friendlyError = 'Email/password accounts are not enabled. Contact support.';
          // Make sure Email/Password sign-in is enabled in your Firebase project Authentication settings.
      }


      setError(friendlyError);
      toast({
          title: "Signup Failed",
          description: friendlyError,
          variant: "destructive",
      });
    } finally {
      setLoading(false);
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
             {/* Removed Phone Number Input Field */}
             {/* <div>
              <Label htmlFor="phoneNumber">WhatsApp Number</Label>
              <Input ... />
            </div> */}
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
              {loading ? 'Creating Account...' : 'Sign Up'}
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
