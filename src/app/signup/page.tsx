
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
  const [phoneNumber, setPhoneNumber] = useState(''); // Added WhatsApp Number state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Basic phone number validation (adjust regex as needed for desired format)
  const isValidPhoneNumber = (num: string) => /^\+?[0-9\s-()]{7,}$/.test(num);

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

    if (!phoneNumber.trim()) {
        setError("WhatsApp Number is required.");
        toast({
            title: "Signup Failed",
            description: "Please enter your WhatsApp number.",
            variant: "destructive",
        });
        setLoading(false);
        return;
    }

     if (!isValidPhoneNumber(phoneNumber)) {
         setError("Please enter a valid phone number (e.g., +1234567890).");
         toast({
             title: "Signup Failed",
             description: "Please enter a valid phone number.",
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

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Firebase Auth profile (optional but good practice)
      await updateProfile(user, { displayName: displayName });

      // 3. Create user profile document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
       // New users start without a group and as 'member' role
      const newUserProfile: UserProfile = {
          uid: user.uid,
          email: user.email, // Still store email from auth
          displayName: displayName.trim(), // Save trimmed display name
          phoneNumber: phoneNumber.trim(), // Save trimmed phone number
          groupId: null, // Start without a group
          role: 'member', // Default role
          createdAt: Timestamp.now()
      };
      await setDoc(userDocRef, newUserProfile);

      toast({
          title: "Signup Successful",
          description: "Account created. Please wait to be added to a group by an admin.",
      });
      router.push('/'); // Redirect to home page (or a 'wait for admin' page)
    } catch (err: any) {
      console.error("Signup failed:", err);
      // Provide more specific error messages
      let friendlyError = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
          friendlyError = 'This email address is already in use. Please try logging in.';
      } else if (err.code === 'auth/weak-password') {
          friendlyError = 'The password is too weak. Please choose a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
           friendlyError = 'Please enter a valid email address.';
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
                required // Make required
                disabled={loading}
              />
            </div>
             <div>
              <Label htmlFor="phoneNumber">WhatsApp Number</Label>
              <Input
                id="phoneNumber"
                type="tel" // Use 'tel' type for phone numbers
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required // Make required
                placeholder="+1 123 456 7890"
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
