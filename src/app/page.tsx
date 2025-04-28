'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogButtons } from '@/components/food-journal/LogButtons';
import { EventHistory } from '@/components/food-journal/EventHistory';
import { ReminderButton } from '@/components/food-journal/ReminderButton'; // Assuming this is updated or handled elsewhere
import type { LogEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button'; // For Logout and Admin
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import auth for sign out
import Link from 'next/link'; // For linking to admin page


export default function Home() {
  const { user, userProfile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !user) {
      router.push('/login');
      return; // Stop further execution in this render cycle
    }

    // If user is authenticated and has a group ID, fetch events
    if (user && userProfile?.groupId) {
      setIsLoadingEvents(true);
      const eventsColRef = collection(db, 'groups', userProfile.groupId, 'events');
      const q = query(eventsColRef, orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedEvents: LogEvent[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Ensure timestamp is converted to Date object
            const timestamp = (data.timestamp as Timestamp)?.toDate ? (data.timestamp as Timestamp).toDate() : new Date();
            fetchedEvents.push({
                id: doc.id,
                ...data,
                timestamp: timestamp, // Use the converted Date object
            } as LogEvent); // Type assertion
        });
        setEvents(fetchedEvents);
        setIsLoadingEvents(false);
      }, (error) => {
        console.error("Error fetching events: ", error);
        setIsLoadingEvents(false);
        // Optionally show an error toast
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
    } else if (!loading && user && !userProfile?.groupId) {
        // Handle case where user is logged in but has no group assigned yet
        console.log("User logged in but no group assigned.");
        // You might want to show a message or redirect to a group selection/creation page
        setIsLoadingEvents(false); // Stop loading indicator
        setEvents([]); // Clear events
    } else if (!loading && !user) {
        // Ensure loading is false and clear events if user logs out
        setIsLoadingEvents(false);
        setEvents([]);
    }

  }, [user, userProfile, loading, router]);


  const handleLogEvent = async (newEventData: Omit<LogEvent, 'id' | 'groupId' | 'userId' | 'userName'>) => {
    if (!user || !userProfile?.groupId) {
      console.error("User not authenticated or no group ID found");
      // Optionally show a toast error
      return;
    }

    const eventWithUserDetails: Omit<LogEvent, 'id'> = {
        ...newEventData,
        timestamp: Timestamp.fromDate(new Date()), // Use Firestore Timestamp for consistency
        userId: user.uid,
        userName: userProfile.displayName || user.email || 'Unknown User', // Get name from profile or fallback
        groupId: userProfile.groupId,
    };

    try {
      const eventsColRef = collection(db, 'groups', userProfile.groupId, 'events');
      await addDoc(eventsColRef, eventWithUserDetails);
      // Firestore listener will automatically update the UI, no need to manually setEvents
      console.log("Event logged successfully");
      // Optionally show a success toast
    } catch (error) {
      console.error('Failed to log event:', error);
      // Optionally show an error toast
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); // Redirect to login page after successful logout
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally show an error toast
    }
  };


  // Find the latest food intake event *for the current group*
 const lastFoodIntakeEvent = events
    .filter(event => event.type === 'FOOD_INTAKE' && event.userId) // userId should always exist now
    .sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())[0]; // Ensure timestamps are Dates for comparison


  // Don't render anything substantial until loading is complete and user is verified
  if (loading || !user) {
    return null; // Or a minimal loading indicator if preferred, but AuthProvider handles the main loading screen
  }

  // Handle case where user is logged in but not yet in a group
  if (!userProfile?.groupId) {
      return (
          <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
               <Card className="w-full max-w-md text-center p-6 shadow-lg rounded-lg">
                   <CardHeader>
                       <CardTitle>Welcome!</CardTitle>
                   </CardHeader>
                   <CardContent>
                       <p className="text-muted-foreground mb-4">You are logged in but not yet part of a food journal group.</p>
                       <p className="text-muted-foreground mb-6">Please contact your group admin to be added.</p>
                       <Button onClick={handleLogout} variant="outline">Logout</Button>
                   </CardContent>
               </Card>
          </main>
      );
  }


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <Card className="w-full max-w-3xl shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-6 flex flex-row justify-between items-center">
          <div>
              <CardTitle className="text-3xl font-bold">Food Journal</CardTitle>
              <CardDescription className="text-primary-foreground/80 pt-1">
                Group: {userProfile?.groupId} {/* Display group ID or name if available */}
              </CardDescription>
          </div>
           <div className="flex items-center gap-2">
                 {isAdmin && (
                     <Link href="/admin" passHref>
                         <Button variant="secondary" size="sm">Admin Panel</Button>
                     </Link>
                 )}
                <Button onClick={handleLogout} variant="outline" size="sm" className="bg-background/20 hover:bg-background/30 text-primary-foreground border-primary-foreground/50">
                    Logout
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Log New Event</h2>
            {/* Pass simplified handler */}
            <LogButtons onLogEvent={handleLogEvent} />
          </div>

          <Separator />

           <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-lg font-semibold text-foreground">Need to Remind?</h2>
                 {/* ReminderButton needs update to fetch phone number from user profile based on userId */}
                 <ReminderButton lastFoodIntakeEvent={lastFoodIntakeEvent} />
             </div>
            <p className="text-sm text-muted-foreground">
               Send a WhatsApp reminder to the last person who logged eating (if they have a phone number in their profile).
            </p>
          </div>


          <Separator />

          <div className="space-y-4">
             {isLoadingEvents ? (
                <p className="text-center text-muted-foreground">Loading event history...</p>
              ) : (
                <EventHistory events={events} />
              )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
