'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, Search, UserX, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAuthCheck } from "@/lib/checkUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface User {
  id: number;
  name: string | null;
  email: string;
  college: string | null;
  phone: number | null;
  checked_in_at: string;
}

const formatToIST = (date: string | null) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Page() {
  useAuthCheck('registration');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userToUncheck, setUserToUncheck] = useState<User | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_checked_in', true)
        .order('checked_in_at', { ascending: false });

      if (!error) {
        setUsers(data || []);
        setFilteredUsers(data || []);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function filterUsers() {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => {
      const name = user.name?.toLowerCase() || '';
      const email = user.email.toLowerCase();
      const college = user.college?.toLowerCase() || '';
      const phone = user.phone?.toString() || '';

      return name.includes(query) ||
        email.includes(query) ||
        college.includes(query) ||
        phone.includes(query);
    });

    setFilteredUsers(filtered);
  }

  const handleUncheck = async (user: User) => {
    setUserToUncheck(user);
    setShowConfirmDialog(true);
  };

  const confirmUncheck = async () => {
    if (!userToUncheck) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_checked_in: false,
          checked_in_at: null
        })
        .eq('id', userToUncheck.id);

      if (error) throw error;

      toast.success('Check-in removed successfully');
      setShowConfirmDialog(false);
      setUserToUncheck(null);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update check-in status');
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Check-in List</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-[50vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">
                        {user.name || 'Unnamed'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleUncheck(user)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>{user.email}</div>
                    <div>Checked in: {formatToIST(user.checked_in_at)}</div>
                  </div>
                </Card>
              ))}
              {filteredUsers.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                  <UserX className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Users Checked In</h3>
                  <p className="text-muted-foreground">No users have checked in yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Remove Check-in</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove the check-in for {userToUncheck?.name || 'this user'}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmUncheck}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4">
                  {selectedUser && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{selectedUser.name || 'Unnamed'}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selectedUser.email}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">College:</span> {selectedUser.college || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span> {selectedUser.phone || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Checked in at:</span> {formatToIST(selectedUser.checked_in_at)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}