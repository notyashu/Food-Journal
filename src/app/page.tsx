
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogButtons } from '@/components/food-journal/LogButtons';
import { EventHistory } from '@/components/food-journal/EventHistory';
// ReminderButton import removed
import type { LogEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase'; // Keep db import
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'; // Import specific types
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
// FCM imports removed: getMessaging, getToken, onMessage, app as firebaseApp
import { useToast } from '@/hooks/use-toast'; // Import useToast


export default function Home() {
  const { user, userProfile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
   const { toast } = useToast(); // Initialize toast

   // --- FCM Initialization Effect Removed ---


  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !user) {
      router.push('/login');
      return; // Stop further execution in this render cycle
    }

    let unsubscribe = () => {}; // Initialize unsubscribe to an empty function

    // If user is authenticated and has a group ID, fetch events
    if (user && userProfile?.groupId) {
      setIsLoadingEvents(true);
      try {
        const eventsColRef = collection(db, 'groups', userProfile.groupId, 'events');
        const q = query(eventsColRef, orderBy('timestamp', 'desc'));

        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedEvents: LogEvent[] = [];
          querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => { // Add type annotation
              const data = doc.data();
              // Basic validation of fetched data
              if (!data || typeof data !== 'object' || !data.type || !data.timestamp || !data.userId || !data.groupId) {
                  console.warn("Skipping invalid event data from Firestore:", doc.id, data);
                  return; // Skip this document
              }

              // Ensure timestamp is converted to Date object
              const timestamp = getDateFromTimestamp(data.timestamp); // Use helper function
              fetchedEvents.push({
                  id: doc.id,
                  type: data.type,
                  timestamp: timestamp, // Use the converted Date object
                  userId: data.userId,
                  userName: data.userName || 'Unknown User',
                  groupId: data.groupId,
                  // Spread any other potential fields if needed, or explicitly map them
                  // ...data, // Use explicit mapping instead of spread for better type safety
              } as LogEvent); // Type assertion (ensure all required fields are present)
          });
          setEvents(fetchedEvents);
          setIsLoadingEvents(false);
        }, (error) => {
          console.error(`Error fetching events via snapshot listener for group ${userProfile.groupId}: `, error);
          setIsLoadingEvents(false);
           toast({ title: "Error Loading History", description: "Could not load event history in real-time. Please refresh.", variant: "destructive" });
        });
      } catch (error) {
          console.error("Error setting up Firestore listener:", error);
          setIsLoadingEvents(false);
          toast({ title: "Setup Error", description: "Failed to set up event listener.", variant: "destructive" });
      }

    } else if (!loading && user && !userProfile?.groupId) {
        // Handle case where user is logged in but has no group assigned yet
        console.log("User logged in but no group assigned. Clearing events and stopping load.");
        setIsLoadingEvents(false); // Stop loading indicator
        setEvents([]); // Clear events
    } else if (!loading && !user) {
        // Ensure loading is false and clear events if user logs out
        console.log("User logged out or loading finished without user. Clearing events.");
        setIsLoadingEvents(false);
        setEvents([]);
    }

    // Cleanup listener on unmount or when dependencies change
    return () => {
        console.log("Cleaning up Firestore listener.");
        unsubscribe();
    };

  }, [user, userProfile?.groupId, loading, router, toast]); // Depend specifically on groupId


  const handleLogEvent = async (newEventData: Pick<LogEvent, 'type' | 'timestamp'>) => {
    if (!user || !userProfile?.groupId || !userProfile) { // Add null check for userProfile
      console.error("User not authenticated, profile incomplete, or no group ID found");
      toast({ title: "Error", description: "Cannot log event. Ensure you are logged in and assigned to a group.", variant: "destructive" });
      return;
    }

    // Ensure timestamp is Firestore Timestamp before saving
    const timestampToSave = newEventData.timestamp instanceof Date
        ? Timestamp.fromDate(newEventData.timestamp)
        : newEventData.timestamp; // Assume it's already a Timestamp if not a Date


    const eventWithUserDetails: Omit<LogEvent, 'id'> = {
        type: newEventData.type,
        timestamp: timestampToSave, // Use Firestore Timestamp for consistency
        userId: user.uid,
        userName: userProfile.displayName || user.email || 'Unknown User', // Get name from profile or fallback
        groupId: userProfile.groupId,
    };


    try {
      const eventsColRef = collection(db, 'groups', userProfile.groupId, 'events');
      const docRef = await addDoc(eventsColRef, eventWithUserDetails);
      console.log(`Event logged successfully with ID: ${docRef.id}`);
       // Toast moved to LogButtons for immediate feedback

        // --- OneSignal/Alternative Reminder Logic ---
        if (eventWithUserDetails.type === 'FOOD_INTAKE') {
            console.log("FOOD_INTAKE event logged. Reminder logic placeholder.");
            // TODO: Implement OneSignal Journey trigger API call OR client-side local notification
        }

    } catch (error) {
      console.error(`Failed to log event for user ${user.uid} in group ${userProfile.groupId}:`, error);
       toast({ title: "Error Saving Event", description: "Failed to save the event. Please try again.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    try {
      
      await signOut(auth);
      // Clear local state immediately for faster UI update
      setEvents([]);
      // FCM token cleanup might be handled by service worker or browser
      router.push('/login'); // Redirect to login page after successful logout
       toast({ title: "Logged Out", description: "You have been logged out successfully." });
    } catch (error) {
      console.error("Error signing out: ", error);
       toast({ title: "Logout Error", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };


  // Calculation of lastFoodIntakeEvent removed


   // Don't render anything substantial until loading is complete and user is verified
   if (loading) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
            <Card className="w-full max-w-3xl shadow-xl rounded-lg overflow-hidden">
                <CardHeader className="bg-primary/50 p-6 h-[92px] animate-pulse" />
                 <CardContent className="p-6 space-y-6">
                     <div className="h-10 bg-muted rounded animate-pulse w-1/2 mx-auto"></div>
                     <Separator />
                     {/* Removed reminder section skeleton */}
                     {/* <Separator /> */}
                     <div className="space-y-3 h-[400px] overflow-hidden">
                         <div className="h-12 bg-secondary rounded animate-pulse"></div>
                         <div className="h-12 bg-secondary rounded animate-pulse"></div>
                         <div className="h-12 bg-secondary rounded animate-pulse"></div>
                     </div>
                 </CardContent>
            </Card>
        </main>
    );
   }


  // Handle case where user is logged in but not yet in a group
  if (user && !userProfile?.groupId) {
      return (
          <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
               <Card className="w-full max-w-md text-center p-6 shadow-lg rounded-lg">
                   <CardHeader>
                       <CardTitle>Welcome, {userProfile?.displayName || user.email}!</CardTitle>
                   </CardHeader>
                   <CardContent>
                       <p className="text-muted-foreground mb-4">You are logged in but not yet part of a food journal group.</p>
                       <p className="text-muted-foreground mb-6">Please contact your group admin to add you{isAdmin ? ', or go to the admin panel to create/manage your group' : '.'}</p>
                         {isAdmin && ( // Show Admin button only if designated as admin
                           <Link href="/admin" passHref>
                               <Button variant="default" className="mb-2 mr-2">Go to Admin Panel</Button>
                           </Link>
                       )}
                       <Button onClick={handleLogout} variant="outline">Logout</Button>
                   </CardContent>
               </Card>
          </main>
      );
  }


  // Main authenticated view (user has a group)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <Card className="w-full max-w-3xl shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-6 flex flex-row justify-between items-center flex-wrap gap-2">
          <div>
              <CardTitle className="text-3xl font-bold">Food Journal</CardTitle>
              <CardDescription className="text-primary-foreground/80 pt-1">
                {/* Attempt to show group name if available */}
                Group: {userProfile?.groupName || `ID: ${userProfile?.groupId}` || 'Loading...'}
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
            <LogButtons onLogEvent={handleLogEvent} />
          </div>

          <Separator />

           {/* Reminder Section Removed */}

          <div className="space-y-4">
             {isLoadingEvents ? (
                <div className="text-center text-muted-foreground py-4">
                    <p>Loading event history...</p>
                    {/* Optional: Add a simple spinner or skeleton */}
                </div>
              ) : (
                 <EventHistory events={events} />
              )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

// Helper to convert Firestore Timestamp or Date to Date object
function getDateFromTimestamp(timestamp: unknown): Date {
     if (!timestamp) {
        console.warn("Received null or undefined timestamp, returning current date.");
        return new Date();
     }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    // Check if it's a Firestore Timestamp (duck typing for safety)
    if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
        return (timestamp as Timestamp).toDate();
    }
    // Handle potential string or number representations if necessary, though Firestore should send Timestamps
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        try {
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
                 console.warn("Received string/number timestamp, attempting conversion:", timestamp);
                return date;
            }
        } catch (e) {
            // Ignore conversion error, proceed to fallback
        }
    }

    console.error("Received unexpected timestamp format, returning current date as fallback:", timestamp);
    return new Date(); // Fallback
}
