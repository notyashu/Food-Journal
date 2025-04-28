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
import { Trash2 } from "lucide-react";

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
  const [isUpdating, setIsUpdating] = useState(false);

  // Effect to check admin status and redirect if necessary
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        toast({ title: "Access Denied", description: "You do not have permission to access the admin panel.", variant: "destructive" });
        router.push('/');
      }
    }
  }, [authLoading, user, isAdmin, router, toast]);

  // Effect to fetch group data, members, and potential members once admin status is confirmed
  useEffect(() => {
    if (isAdmin && userProfile?.groupId) {
      fetchGroupData(userProfile.groupId);
      fetchAllUsersWithoutGroup();
    } else if (isAdmin && !userProfile?.groupId) {
      // Admin doesn't have a group yet, allow creation
      setIsLoadingData(false);
    }
  }, [isAdmin, userProfile?.groupId]); // Depend on groupId


  const fetchGroupData = async (groupId: string) => {
    setIsLoadingData(true);
    try {
      const groupDocRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupDocRef);

      if (groupSnap.exists()) {
        const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
        setGroup(groupData);
        // Fetch profiles for members in the group
        if (groupData.memberIds && groupData.memberIds.length > 0) {
          const membersQuery = query(collection(db, 'users'), where('uid', 'in', groupData.memberIds));
          const membersSnap = await getDocs(membersQuery);
          const memberProfiles = membersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
          setMembers(memberProfiles);
        } else {
            setMembers([]);
        }
      } else {
        console.error("Group not found!");
        setGroup(null);
        setMembers([]);
        toast({ title: "Error", description: "Could not find your group data.", variant: "destructive" });
        // Maybe the admin's profile groupId is stale? Consider updating it.
      }
    } catch (error) {
      console.error("Error fetching group data: ", error);
      toast({ title: "Error", description: "Failed to load group data.", variant: "destructive" });
    } finally {
       setIsLoadingData(false);
    }
  };

  const fetchAllUsersWithoutGroup = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), where('groupId', '==', null));
      const usersSnap = await getDocs(usersQuery);
      const usersWithoutGroup = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setAllUsers(usersWithoutGroup);
    } catch (error) {
      console.error("Error fetching users without group: ", error);
      // Handle error appropriately
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
     e.preventDefault();
    if (!newGroupName.trim() || !user) return;
    setIsCreatingGroup(true);

    const newGroupId = doc(collection(db, 'groups')).id; // Generate new Group ID
    const groupDocRef = doc(db, 'groups', newGroupId);
    const userDocRef = doc(db, 'users', user.uid);

    const newGroupData: Group = {
        id: newGroupId,
        name: newGroupName.trim(),
        adminIds: [user.uid],
        memberIds: [user.uid], // Admin is also a member
        createdAt: Timestamp.now(),
    };

    const batch = writeBatch(db);

    try {
        batch.set(groupDocRef, newGroupData);
        batch.update(userDocRef, { groupId: newGroupId, role: 'admin' }); // Assign group and admin role to creator

        await batch.commit();

        toast({ title: "Success", description: `Group "${newGroupData.name}" created successfully!` });
        setGroup(newGroupData); // Update local state
        setMembers([{ ...userProfile!, groupId: newGroupId, role: 'admin' }]); // Update local members state
        setNewGroupName('');
        // Fetch users without group again as the current user is now in a group
        await fetchAllUsersWithoutGroup();
    } catch (error) {
        console.error("Error creating group: ", error);
        toast({ title: "Error", description: "Failed to create group.", variant: "destructive" });
    } finally {
        setIsCreatingGroup(false);
    }
  };


  const handleAddMember = async () => {
    if (!selectedUserToAdd || !group) return;
    setIsUpdating(true);

    const userDocRef = doc(db, 'users', selectedUserToAdd);
    const groupDocRef = doc(db, 'groups', group.id);

    const batch = writeBatch(db);
    try {
        batch.update(userDocRef, { groupId: group.id, role: 'member' }); // Add group ID and set role
        batch.update(groupDocRef, { memberIds: arrayUnion(selectedUserToAdd) });

        await batch.commit();

        toast({ title: "Success", description: "Member added successfully." });
        // Refresh data
        await fetchGroupData(group.id);
        await fetchAllUsersWithoutGroup();
        setSelectedUserToAdd(''); // Reset selection
    } catch (error) {
        console.error("Error adding member: ", error);
        toast({ title: "Error", description: "Failed to add member.", variant: "destructive" });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
      if (!group || memberUid === user?.uid) { // Prevent admin from removing themselves this way
          toast({ title: "Action Denied", description: "Admin cannot be removed.", variant: "destructive"});
          return;
      };
      setIsUpdating(true);

      const userDocRef = doc(db, 'users', memberUid);
      const groupDocRef = doc(db, 'groups', group.id);

      const batch = writeBatch(db);

      try {
          batch.update(userDocRef, { groupId: null, role: 'member' }); // Remove groupId, keep role as member for potential re-adding
          batch.update(groupDocRef, { memberIds: arrayRemove(memberUid) });

          await batch.commit();

          toast({ title: "Success", description: "Member removed successfully." });
          // Refresh data
          await fetchGroupData(group.id);
          await fetchAllUsersWithoutGroup();
      } catch (error) {
          console.error("Error removing member: ", error);
          toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
      } finally {
          setIsUpdating(false);
      }
  };

  // Render loading states
  if (authLoading || isLoadingData) {
    return (
        <main className="flex min-h-screen flex-col items-center p-6 bg-background">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-20 w-full" />
                     <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </main>
    );
  }

  // Render based on whether the admin has a group
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

        <CardContent className="space-y-8">
          {!group ? (
            // Section for creating a new group
            <Card>
              <CardHeader>
                <CardTitle>Create a New Group</CardTitle>
                <CardDescription>You need a group to start logging events. Create one here.</CardDescription>
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
                    />
                  </div>
                  <Button type="submit" disabled={isCreatingGroup || !newGroupName.trim()}>
                    {isCreatingGroup ? 'Creating...' : 'Create Group'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            // Section for managing the existing group
            <>
              <Card>
                 <CardHeader>
                    <CardTitle>Manage Group: {group.name}</CardTitle>
                     <CardDescription>Add or remove members from your group.</CardDescription>
                  </CardHeader>
                <CardContent className="space-y-6">
                   {/* Add Member Section */}
                   <div>
                      <Label htmlFor="addUserSelect">Add New Member</Label>
                      <div className="flex gap-2 mt-1">
                         <Select onValueChange={setSelectedUserToAdd} value={selectedUserToAdd} disabled={isUpdating}>
                             <SelectTrigger id="addUserSelect" className="flex-grow">
                                 <SelectValue placeholder="Select a user to add..." />
                             </SelectTrigger>
                             <SelectContent>
                                {allUsers.length === 0 && <SelectItem value="no-users" disabled>No users available to add</SelectItem>}
                                {allUsers.map((u) => (
                                 <SelectItem key={u.uid} value={u.uid}>
                                     {u.displayName || u.email} ({u.email})
                                 </SelectItem>
                                ))}
                             </SelectContent>
                         </Select>
                         <Button onClick={handleAddMember} disabled={!selectedUserToAdd || isUpdating}>
                             {isUpdating ? 'Adding...' : 'Add Member'}
                         </Button>
                      </div>
                      {allUsers.length === 0 && !isLoadingData && <p className="text-xs text-muted-foreground mt-1">No users found who aren't already in a group. New users need to sign up first.</p>}
                   </div>

                  {/* List Members Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Current Members</h3>
                    {members.length === 0 ? (
                      <p className="text-muted-foreground">No members in this group yet (besides you).</p>
                    ) : (
                      <ul className="space-y-2">
                        {members.map((member) => (
                          <li key={member.uid} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                            <span>
                                {member.displayName || member.email}
                                {member.role === 'admin' && <span className="ml-2 text-xs font-semibold text-primary">(Admin)</span>}
                            </span>
                            {member.uid !== user?.uid && member.role !== 'admin' && ( // Can't remove self or other admins
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" disabled={isUpdating}>
                                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Confirm Removal</DialogTitle>
                                        </DialogHeader>
                                        <p>Are you sure you want to remove <strong>{member.displayName || member.email}</strong> from the group?</p>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline">Cancel</Button>
                                            </DialogClose>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleRemoveMember(member.uid)}
                                                disabled={isUpdating}
                                            >
                                                {isUpdating ? 'Removing...' : 'Remove Member'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
               {/* Optional: Add section for group settings like renaming */}
                <Alert variant="destructive">
                   <Trash2 className="h-4 w-4" />
                   <AlertTitle>Danger Zone</AlertTitle>
                   <AlertDescription>
                       Deleting the group is permanent and cannot be undone. All event data will be lost. (Feature not implemented yet)
                       {/* <Button variant="destructive" className="mt-2" disabled>Delete Group</Button> */}
                   </AlertDescription>
               </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
