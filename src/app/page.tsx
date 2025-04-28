
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
import { db, app as firebaseApp } from '@/lib/firebase'; // Import client app instance
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { getMessaging, getToken, onMessage } from 'firebase/messaging'; // Import FCM functions
import { useToast } from '@/hooks/use-toast'; // Import useToast


export default function Home() {
  const { user, userProfile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
   const { toast } = useToast(); // Initialize toast

   // --- FCM Initialization Effect (kept for potential future use, but not currently triggering reminders) ---
   useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && user && userProfile && firebaseApp) {
        // Check if Notification permission is granted
        if (Notification.permission === 'granted') {
             const messaging = getMessaging(firebaseApp);

            // Request FCM token
            getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY }) // Replace with your VAPID key env variable
                .then((currentToken) => {
                    if (currentToken) {
                        console.log('FCM Token:', currentToken);
                        // Check if token needs to be updated in Firestore
                        if (userProfile.fcmToken !== currentToken) {
                            const userDocRef = doc(db, 'users', user.uid);
                            updateDoc(userDocRef, { fcmToken: currentToken })
                                .then(() => console.log('FCM token updated in Firestore.'))
                                .catch((err) => console.error('Error updating FCM token:', err));
                        }
                    } else {
                        // Show permission request UI
                        console.log('No registration token available. Request permission to generate one.');
                        // Potentially show a button or message asking the user to enable notifications
                         toast({
                            title: "Enable Notifications",
                            description: "Please allow notifications if you'd like to receive them in the future.",
                            variant: "default", // or "warning"
                         });
                    }
                }).catch((err) => {
                    console.error('An error occurred while retrieving token. ', err);
                    // Handle errors like no service worker, etc.
                     toast({
                        title: "Notification Error",
                        description: "Could not get permission for notifications.",
                        variant: "destructive",
                    });
                });

            // Handle foreground messages (optional)
            onMessage(messaging, (payload) => {
                console.log('Message received in foreground. ', payload);
                 // Show a toast or update UI based on the message
                toast({
                    title: payload.notification?.title || 'Notification',
                    description: payload.notification?.body || '',
                });
            });

        } else if (Notification.permission === 'default') {
            console.log("Notification permission not yet requested.");
            // Consider prompting the user later or via a button click
             // Example: show a button to request permission
        } else {
             console.log("Notification permission denied.");
              toast({
                  title: "Notifications Blocked",
                  description: "Push notifications are disabled. Please enable notifications in your browser settings if needed.",
                  variant: "warning",
              });
        }
    } else if (user && !userProfile) {
         console.log("User profile still loading or not available for FCM setup.");
    } else if (!user) {
         console.log("User not logged in, skipping FCM setup.");
    }

   }, [user, userProfile, firebaseApp, toast]); // Rerun when user or profile changes


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
         toast({ title: "Error", description: "Could not load event history.", variant: "destructive" });
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
    } else if (!loading && user && !userProfile?.groupId) {
        // Handle case where user is logged in but has no group assigned yet
        console.log("User logged in but no group assigned.");
        setIsLoadingEvents(false); // Stop loading indicator
        setEvents([]); // Clear events
    } else if (!loading && !user) {
        // Ensure loading is false and clear events if user logs out
        setIsLoadingEvents(false);
        setEvents([]);
    }

  }, [user, userProfile, loading, router, toast]);


  const handleLogEvent = async (newEventData: Omit<LogEvent, 'id' | 'groupId' | 'userId' | 'userName'>) => {
    if (!user || !userProfile?.groupId) {
      console.error("User not authenticated or no group ID found");
      toast({ title: "Error", description: "Cannot log event. Please log in.", variant: "destructive" });
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
       // Toast moved to LogButtons for immediate feedback

        // --- OneSignal/Alternative Reminder Logic ---
        // If the event type is 'FOOD_INTAKE', potentially trigger OneSignal Journey or schedule local notification
        if (eventWithUserDetails.type === 'FOOD_INTAKE') {
            console.log("FOOD_INTAKE event logged. Triggering reminder logic (not implemented yet).");
            // TODO: Implement OneSignal Journey trigger API call OR
            // TODO: Implement client-side local notification scheduling
            // Example (Conceptual - requires 'node-schedule' or similar on backend/serverless function for reliability):
            // scheduleReminder(user.uid, userProfile.groupId); // Pass necessary info
            // Example (Conceptual - client-side local notification):
            // scheduleLocalNotification();
        }

    } catch (error) {
      console.error('Failed to log event:', error);
       toast({ title: "Error", description: "Failed to save the event.", variant: "destructive" });
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


  // Calculation of lastFoodIntakeEvent removed as it's no longer used for the ReminderButton


  // Don't render anything substantial until loading is complete and user is verified
   if (loading) {
       // You might want a more integrated loading skeleton here matching the card layout
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
            <Card className="w-full max-w-3xl shadow-xl rounded-lg overflow-hidden">
                <CardHeader className="bg-primary/50 p-6 h-[92px] animate-pulse" />
                 <CardContent className="p-6 space-y-6">
                     <div className="h-10 bg-muted rounded animate-pulse w-1/2 mx-auto"></div>
                     <Separator />
                     {/* Removed reminder section skeleton */}
                     {/* <div className="h-10 bg-muted rounded animate-pulse w-1/3 ml-auto"></div> */}
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
                       <p className="text-muted-foreground mb-6">Please contact your group admin to add you, or create a group if you are the admin.</p>
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


  // Main authenticated view
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <Card className="w-full max-w-3xl shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-6 flex flex-row justify-between items-center flex-wrap gap-2">
          <div>
              <CardTitle className="text-3xl font-bold">Food Journal</CardTitle>
              <CardDescription className="text-primary-foreground/80 pt-1">
                Group: {userProfile?.groupName || userProfile?.groupId || 'Loading...'} {/* TODO: Fetch and display group name */}
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
           {/* <div className="space-y-4"> ... </div> */}
           {/* <Separator /> */}

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

// Helper to convert Firestore Timestamp or Date to Date object
function getDateFromTimestamp(timestamp: Date | Timestamp | undefined): Date {
     if (!timestamp) return new Date();
    if (timestamp instanceof Date) {
        return timestamp;
    }
    if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
        return (timestamp as Timestamp).toDate();
    }
    return new Date();
}
