'use client';

import { useState, useEffect } from 'react';
import { useAuthCheck } from "@/lib/checkUser";
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  food: string;
  college: string | null;
  phone: number | null;
  food_served_at: string;
  created_at: string;
}

export default function Page() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userToUnserve, setUserToUnserve] = useState<User | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useAuthCheck('food');
  

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_food_received', true)
      .order('created_at', { ascending: false });

    if (!error) {
      setUsers(data || []);
      setFilteredUsers(data || []);
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
      const food = user.food?.toLowerCase() || '';

      return name.includes(query) ||
        email.includes(query) ||
        college.includes(query) ||
        phone.includes(query) ||
        food.includes(query);
    });

    setFilteredUsers(filtered);
  }

  const handleUnserve = async (user: User) => {
    setUserToUnserve(user);
    setShowConfirmDialog(true);
  };

  const confirmUnserve = async () => {
    if (!userToUnserve) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_food_received: false,
          food_served_at: null
        })
        .eq('id', userToUnserve.id);

      if (error) throw error;

      toast.success('Food service record removed');
      setShowConfirmDialog(false);
      setUserToUnserve(null);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update food service status');
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
                <BreadcrumbPage>Food Distribution List</BreadcrumbPage>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {user.name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleUnserve(user)}
                  >
                    Unserve
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Phone:</span>{' '}
                    <span className="font-mono">{user.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">College:</span>{' '}
                    {user.college || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Food Type:</span>{' '}
                    {user.food || 'Not specified'}
                  </div>
                  <div>
                    <span className="font-medium">Served At:</span>{' '}
                    {user.food_served_at ? new Date(user.food_served_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </Card>
            ))}
            {filteredUsers.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Food Served Yet</h3>
                <p className="text-muted-foreground">No users have been served food yet.</p>
              </div>
            )}
          </div>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Unserve</DialogTitle>
              <DialogDescription>
                Are you sure you want to mark food as not served for {userToUnserve?.name || 'this user'}?
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
                onClick={confirmUnserve}
              >
                Unserve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}