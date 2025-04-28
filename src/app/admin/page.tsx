'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  Timestamp,
  query,
  where,
  FirestoreError, // Import FirestoreError for type checking
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Group } from '@/lib/types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, Loader2 } from "lucide-react"; // Add Loader2 for loading states

export default function AdminPage() {
  const { user, userProfile, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // Users without a group
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isUpdating, setIsUpdating] = useState<{ [key: string]: boolean }>({}); // Use object for granular loading state per user
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);

  // Effect to check admin status and redirect if necessary
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log("AdminPage: User not logged in, redirecting to /login");
        router.push('/login');
      } else if (!isAdmin) {
        console.log("AdminPage: User is not admin, redirecting to /");
        toast({ title: "Access Denied", description: "You do not have permission to access the admin panel.", variant: "destructive" });
        router.push('/');
      } else {
        console.log("AdminPage: User is admin, proceeding.");
      }
    }
  }, [authLoading, user, isAdmin, router, toast]);

  // Effect to fetch group data and potential members once admin status is confirmed
  useEffect(() => {
    if (isAdmin && user) { // Ensure user object is available too
      if (userProfile?.groupId) {
        console.log(`AdminPage: Fetching group data for groupId: ${userProfile.groupId}`);
        fetchGroupData(userProfile.groupId);
        fetchAllUsersWithoutGroup();
      } else {
        console.log("AdminPage: Admin has no group, fetching users without group.");
        // Admin doesn't have a group yet, allow creation
        fetchAllUsersWithoutGroup(); // Fetch users even if admin has no group
        setIsLoadingData(false);
      }
    }
  }, [isAdmin, user, userProfile?.groupId]); // Depend on user and groupId


  const fetchGroupData = async (groupId: string) => {
    setIsLoadingData(true);
    console.log(`Fetching group data for ID: ${groupId}`);
    try {
      const groupDocRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupDocRef);

      if (groupSnap.exists()) {
        const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
        console.log("Group data found:", groupData);
        setGroup(groupData);

        // Fetch profiles for members in the group
        if (groupData.memberIds && groupData.memberIds.length > 0) {
          console.log(`Fetching member profiles for IDs: ${groupData.memberIds.join(', ')}`);
           // Fetch in chunks if necessary, Firestore 'in' query limit is 30
           const MAX_IN_QUERY_SIZE = 30;
           let memberProfiles: UserProfile[] = [];
           for (let i = 0; i < groupData.memberIds.length; i += MAX_IN_QUERY_SIZE) {
              const chunkIds = groupData.memberIds.slice(i, i + MAX_IN_QUERY_SIZE);
              if (chunkIds.length === 0) continue;
              const membersQuery = query(collection(db, 'users'), where('uid', 'in', chunkIds));
              const membersSnap = await getDocs(membersQuery);
              const chunkProfiles = membersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
              memberProfiles = [...memberProfiles, ...chunkProfiles];
           }
          console.log("Member profiles fetched:", memberProfiles);
          setMembers(memberProfiles);
        } else {
            console.log("Group has no member IDs listed.");
            setMembers([]);
        }
      } else {
        console.error(`Group with ID ${groupId} not found!`);
        setGroup(null);
        setMembers([]);
        toast({ title: "Error", description: `Could not find group data for ID: ${groupId}. It might have been deleted.`, variant: "destructive" });
        // Maybe the admin's profile groupId is stale? Consider prompting update or handling gracefully.
         // Optionally update admin's profile if group doesn't exist
         if (user) {
             const userDocRef = doc(db, 'users', user.uid);
             try {
                 await updateDoc(userDocRef, { groupId: null });
                 console.log(`Removed stale groupId ${groupId} from admin profile ${user.uid}`);
                 // Refresh userProfile in context might be needed here or trigger a page reload/refetch
             } catch (updateError) {
                 console.error(`Failed to remove stale groupId from admin profile ${user.uid}:`, updateError);
             }
         }
      }
    } catch (error) {
      console.error("Error fetching group data: ", error);
      const firestoreError = error as FirestoreError;
      toast({
          title: "Error Loading Group",
          description: `Failed to load group data. ${firestoreError.message || ''}`,
          variant: "destructive"
      });
    } finally {
       setIsLoadingData(false);
       console.log("Finished fetching group data.");
    }
  };

  const fetchAllUsersWithoutGroup = async () => {
    if (!isAdmin || isFetchingUsers) return; // Only run if admin and not already fetching
    setIsFetchingUsers(true);
    console.log("Fetching all users without a group assigned.");
    try {
      // Query users where groupId is explicitly null
      const usersQuery = query(collection(db, 'users'), where('groupId', '==', null));
      const usersSnap = await getDocs(usersQuery);
      const usersWithoutGroup = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      console.log("Users without group found:", usersWithoutGroup);
      setAllUsers(usersWithoutGroup);
    } catch (error) {
      console.error("Error fetching users without group: ", error);
      const firestoreError = error as FirestoreError;
      toast({
          title: "Error Loading Users",
          description: `Failed to load users available to add. ${firestoreError.message || ''}`,
          variant: "destructive"
      });
    } finally {
       setIsFetchingUsers(false);
       console.log("Finished fetching users without group.");
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
     e.preventDefault();
    if (!newGroupName.trim() || !user || !userProfile) return; // Ensure userProfile exists
    setIsCreatingGroup(true);
    console.log(`Attempting to create group "${newGroupName.trim()}" by admin ${user.uid}`);

    const newGroupId = doc(collection(db, 'groups')).id; // Generate new Group ID
    const groupDocRef = doc(db, 'groups', newGroupId);
    const userDocRef = doc(db, 'users', user.uid);

    const newGroupData: Group = {
        id: newGroupId,
        name: newGroupName.trim(),
        adminIds: [user.uid],
        memberIds: [user.uid], // Admin is also a member
        createdAt: Timestamp.now(),
        // Add any other necessary group fields
    };

    const batch = writeBatch(db);

    try {
        // Check if admin already has a group ID - should not happen based on UI flow, but good failsafe
        if (userProfile.groupId) {
            throw new Error("Admin already belongs to a group.");
        }

        batch.set(groupDocRef, newGroupData);
        batch.update(userDocRef, { groupId: newGroupId, role: 'admin' }); // Update role just in case, assign group

        await batch.commit();

        console.log(`Group "${newGroupData.name}" (ID: ${newGroupId}) created successfully.`);
        toast({ title: "Success", description: `Group "${newGroupData.name}" created successfully!` });

        // Update local state to reflect the new group
        setGroup(newGroupData);
        setMembers([{ ...userProfile, groupId: newGroupId, role: 'admin' }]); // Update local admin profile
        setNewGroupName('');
        // Refetch users without group as the current admin is now in one
        await fetchAllUsersWithoutGroup();
    } catch (error) {
        console.error("Error creating group: ", error);
         const firestoreError = error as FirestoreError;
        toast({
            title: "Error Creating Group",
            description: `Failed to create group. ${firestoreError.message || (error as Error).message || ''}`,
            variant: "destructive"
        });
    } finally {
        setIsCreatingGroup(false);
    }
  };


  const handleAddMember = async () => {
    if (!selectedUserToAdd || !group || isUpdating[selectedUserToAdd]) return;
    setIsUpdating(prev => ({ ...prev, [selectedUserToAdd]: true }));
    console.log(`Attempting to add user ${selectedUserToAdd} to group ${group.id}`);

    const userDocRef = doc(db, 'users', selectedUserToAdd);
    const groupDocRef = doc(db, 'groups', group.id);

    const batch = writeBatch(db);
    try {
        // Optional: Fetch the user doc first to ensure they don't already have a group
        const userToAddSnap = await getDoc(userDocRef);
        if (!userToAddSnap.exists()) throw new Error("User to add does not exist.");
        const userToAddData = userToAddSnap.data() as UserProfile;
        if (userToAddData.groupId) {
            throw new Error(`User ${userToAddData.displayName || userToAddData.email} already belongs to group ${userToAddData.groupId}.`);
        }

        batch.update(userDocRef, { groupId: group.id, role: 'member' }); // Add group ID and set role
        batch.update(groupDocRef, { memberIds: arrayUnion(selectedUserToAdd) });

        await batch.commit();

        console.log(`User ${selectedUserToAdd} added successfully to group ${group.id}.`);
        toast({ title: "Success", description: "Member added successfully." });
        // Refresh data
        await fetchGroupData(group.id);
        await fetchAllUsersWithoutGroup();
        setSelectedUserToAdd(''); // Reset selection
    } catch (error) {
        console.error("Error adding member: ", error);
         const firestoreError = error as FirestoreError;
        toast({
            title: "Error Adding Member",
            description: `Failed to add member. ${firestoreError.message || (error as Error).message || ''}`,
            variant: "destructive" });
    } finally {
        setIsUpdating(prev => ({ ...prev, [selectedUserToAdd]: false }));
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
      if (!group || memberUid === user?.uid || isUpdating[memberUid]) {
          if(memberUid === user?.uid) {
              toast({ title: "Action Denied", description: "Admin cannot remove themselves.", variant: "destructive"});
          }
          return;
      };
      setIsUpdating(prev => ({ ...prev, [memberUid]: true }));
      console.log(`Attempting to remove user ${memberUid} from group ${group.id}`);

      const userDocRef = doc(db, 'users', memberUid);
      const groupDocRef = doc(db, 'groups', group.id);

      const batch = writeBatch(db);

      try {
           // Optional: Verify the user is actually in the group first
           const groupSnap = await getDoc(groupDocRef);
           if (!groupSnap.exists()) throw new Error("Group does not exist.");
           const currentGroupData = groupSnap.data() as Group;
           if (!currentGroupData.memberIds?.includes(memberUid)) {
               throw new Error("User is not a member of this group.");
           }
           // Optional: Ensure the user being removed is not the only admin if that's a requirement
           if (currentGroupData.adminIds?.includes(memberUid) && currentGroupData.adminIds.length === 1) {
                throw new Error("Cannot remove the only admin of the group.");
           }


          batch.update(userDocRef, { groupId: null, role: 'member' }); // Remove groupId, ensure role is member
          batch.update(groupDocRef, {
              memberIds: arrayRemove(memberUid),
              adminIds: arrayRemove(memberUid) // Also remove from admins if they were one
            });

          await batch.commit();

          console.log(`User ${memberUid} removed successfully from group ${group.id}.`);
          toast({ title: "Success", description: "Member removed successfully." });
          // Refresh data
          await fetchGroupData(group.id);
          await fetchAllUsersWithoutGroup();
      } catch (error) {
          console.error("Error removing member: ", error);
          const firestoreError = error as FirestoreError;
          toast({
              title: "Error Removing Member",
              description: `Failed to remove member. ${firestoreError.message || (error as Error).message || ''}`,
              variant: "destructive"
          });
      } finally {
          setIsUpdating(prev => ({ ...prev, [memberUid]: false }));
      }
  };

  // Render loading states
  if (authLoading || (isAdmin && isLoadingData)) { // Show loading if auth is loading OR if admin is loading group data
    return (
        <main className="flex min-h-screen flex-col items-center p-6 bg-background justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-20 w-full" />
                     <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </main>
    );
  }

   // If user is admin but doesn't have a group (and not loading data), show create group form
   if (isAdmin && !group && !isLoadingData) {
     return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8 lg:p-12 bg-background justify-center">
           <Card className="w-full max-w-xl shadow-xl rounded-lg">
              <CardHeader className="flex flex-row justify-between items-center">
                   <div>
                      <CardTitle className="text-2xl font-bold">Admin Panel</CardTitle>
                      <CardDescription>Manage your food journal group.</CardDescription>
                   </div>
                    <Link href="/" passHref>
                        <Button variant="outline">Back to Journal</Button>
                    </Link>
               </CardHeader>
             <CardContent className="pt-6">
               <Card>
                 <CardHeader>
                   <CardTitle>Create a New Group</CardTitle>
                   <CardDescription>You need a group to manage members and view events.</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <form onSubmit={handleCreateGroup} className="space-y-4">
                     <div>
                       <Label htmlFor="newGroupName">Group Name</Label>
                       <Input
                         id="newGroupName"
                         value={newGroupName}
                         onChange={(e) => setNewGroupName(e.target.value)}
                         placeholder="e.g., Family Kitchen, Office Fridge"
                         required
                         disabled={isCreatingGroup}
                         className="mt-1"
                       />
                     </div>
                     <Button type="submit" disabled={isCreatingGroup || !newGroupName.trim()} className="w-full sm:w-auto">
                       {isCreatingGroup ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Group'}
                     </Button>
                   </form>
                 </CardContent>
               </Card>
             </CardContent>
           </Card>
        </main>
     );
   }

  // Render group management view if admin has a group
  if (isAdmin && group) {
      return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8 lg:p-12 bg-background">
          <Card className="w-full max-w-3xl shadow-xl rounded-lg">
             <CardHeader className="flex flex-row justify-between items-center">
                 <div>
                    <CardTitle className="text-2xl font-bold">Admin Panel</CardTitle>
                    <CardDescription>Manage your food journal group.</CardDescription>
                  </div>
                   <Link href="/" passHref>
                       <Button variant="outline">Back to Journal</Button>
                   </Link>
              </CardHeader>

            <CardContent className="space-y-8 pt-6">
                  <Card>
                     <CardHeader>
                        <CardTitle>Manage Group: {group.name}</CardTitle>
                         <CardDescription>Add or remove members from your group.</CardDescription>
                      </CardHeader>
                    <CardContent className="space-y-6">
                       {/* Add Member Section */}
                       <div>
                          <Label htmlFor="addUserSelect">Add New Member</Label>
                          <div className="flex flex-col sm:flex-row gap-2 mt-1">
                             <Select
                                onValueChange={setSelectedUserToAdd}
                                value={selectedUserToAdd}
                                disabled={isFetchingUsers || Object.values(isUpdating).some(Boolean)}
                             >
                                 <SelectTrigger id="addUserSelect" className="flex-grow">
                                     <SelectValue placeholder={isFetchingUsers ? "Loading users..." : "Select a user to add..."} />
                                 </SelectTrigger>
                                 <SelectContent>
                                    {isFetchingUsers && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                                    {!isFetchingUsers && allUsers.length === 0 && <SelectItem value="no-users" disabled>No users available to add</SelectItem>}
                                    {!isFetchingUsers && allUsers.map((u) => (
                                     <SelectItem key={u.uid} value={u.uid}>
                                         {u.displayName || u.email} {u.email ? `(${u.email})` : ''}
                                     </SelectItem>
                                    ))}
                                 </SelectContent>
                             </Select>
                             <Button
                                onClick={handleAddMember}
                                disabled={!selectedUserToAdd || isUpdating[selectedUserToAdd] || isFetchingUsers}
                                className="w-full sm:w-auto"
                            >
                                {isUpdating[selectedUserToAdd] ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : 'Add Member'}
                             </Button>
                          </div>
                          {!isFetchingUsers && allUsers.length === 0 && <p className="text-xs text-muted-foreground mt-1">No users found who aren't already in a group. New users need to sign up first.</p>}
                       </div>

                      {/* List Members Section */}
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Current Members ({members.length})</h3>
                        {members.length === 0 ? (
                          <p className="text-muted-foreground">No members in this group yet (besides you).</p>
                        ) : (
                          <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {members.map((member) => (
                              <li key={member.uid} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                <span className="truncate mr-2">
                                    {member.displayName || member.email}
                                    {group.adminIds?.includes(member.uid) && <span className="ml-2 text-xs font-semibold text-primary">(Admin)</span>}
                                </span>
                                {/* Prevent removing self or the only admin */}
                                {member.uid !== user?.uid && (!group.adminIds?.includes(member.uid) || (group.adminIds?.length ?? 0) > 1) && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 px-2" disabled={isUpdating[member.uid]}>
                                                {isUpdating[member.uid] ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" /> Remove</>}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Confirm Removal</DialogTitle>
                                            </DialogHeader>
                                            <p>Are you sure you want to remove <strong>{member.displayName || member.email}</strong> from the group "{group.name}"?</p>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">Cancel</Button>
                                                </DialogClose>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleRemoveMember(member.uid)}
                                                    disabled={isUpdating[member.uid]}
                                                >
                                                    {isUpdating[member.uid] ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing...</> : 'Confirm Removal'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                                {/* Indicate if user is self and cannot be removed */}
                                {member.uid === user?.uid && (
                                     <span className="text-xs text-muted-foreground">(You)</span>
                                )}
                                {/* Indicate if user is the only admin */}
                                {member.uid !== user?.uid && group.adminIds?.includes(member.uid) && (group.adminIds?.length ?? 0) <= 1 && (
                                      <span className="text-xs text-muted-foreground">(Only Admin)</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                   {/* TODO: Add group renaming/deletion later */}
                   {/*
                    <Alert variant="destructive">
                       <Trash2 className="h-4 w-4" />
                       <AlertTitle>Danger Zone</AlertTitle>
                       <AlertDescription>
                           Deleting the group is permanent. (Feature not implemented)
                       </AlertDescription>
                   </Alert>
                   */}
            </CardContent>
          </Card>
        </main>
      );
  }

  // Fallback for non-admin users or unexpected states (should be caught by initial checks)
  return (
     <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
         <p>Loading or unauthorized...</p>
         {/* Optionally add a button to go back or logout */}
         <Link href="/" passHref>
            <Button variant="outline" className="mt-4">Go Back</Button>
         </Link>
     </main>
  );
}
