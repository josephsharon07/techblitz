"use client"
import { AppSidebar } from "@/components/app-sidebar"
import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Separator } from "@/components/ui/separator"
import { useRouter } from 'next/navigation';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const PERMISSIONS = [
  'payment',
  'registration',
  'food',
  'technical_connection',
  'debugging',
  'paper_presentation',
  'project_expo',
  'prompt_engineering',
  'treasure_hunt',
  'bioscope',
  'lyric_detective',
  'meme_creation',
  'video_editing_photography',
  'super_admin'
] as const;

export default function Page() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  interface Admin {
    id: string;
    name: string;
    email: string;
    [key: string]: any;
  }
  
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [permissions, setPermissions] = useState<Record<(typeof PERMISSIONS)[number], boolean>>({} as Record<(typeof PERMISSIONS)[number], boolean>);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      } else {
        setAuthUser(session.user);
        const { data: adminData } = await supabase
          .from('admin')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setPermissions(adminData || {});

        if (!adminData?.super_admin) {
          toast.error('Access denied');
          router.replace('/');
        }
      }
      setLoading(false);
    };

    const fetchAdmins = async () => {
      try {
        const { data: admins, error } = await supabase
          .from('admin')
          .select('*')
          .order('name');

        if (error) {
          toast.error('Failed to fetch admins');
          return;
        }
        setAdmins(admins || []);
      } catch (error) {
        toast.error('Failed to fetch admins');
      }
    };

    checkAuth();
    fetchAdmins();
  }, [router]);

  const togglePermission = async (adminId: string, permission: string) => {
    const admin = admins.find(a => a.id === adminId);
    if (!admin) {
      toast.error('Admin not found');
      return;
    }
    const newValue = !admin[permission];

    try {
      const { error } = await supabase
        .from('admin')
        .update({ [permission]: newValue })
        .eq('id', adminId);

      if (error) throw error;

      setAdmins(admins.map(a => 
        a.id === adminId 
          ? { ...a, [permission]: newValue }
          : a
      ));

      toast.success('Permission updated');
    } catch (error) {
      toast.error('Failed to update permission');
    }
  };

  const removeAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('admin')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      setAdmins(admins.filter(admin => admin.id !== adminId));
      toast.success('Admin removed successfully');
    } catch (error) {
      toast.error('Failed to remove admin');
    }
  };

  const formatPermissionName = (permission: string) => {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex sticky top-0 bg-background h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Admin Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Management
              </CardTitle>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Search admins..."
                  className="w-full p-2 rounded-md border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAdmins.map((admin) => (
                    <Card key={admin.id} className="bg-card/50">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{admin.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSelectedAdmin(admin)}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={admin.id === authUser?.id}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove admin access for {admin.name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => removeAdmin(admin.id)}
                                  >
                                    Remove Admin
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={!!selectedAdmin} onOpenChange={() => setSelectedAdmin(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedAdmin?.name} - Permissions</DialogTitle>
                <DialogDescription>Manage admin permissions</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-4">
                {PERMISSIONS.map(permission => (
                  <div key={permission} className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium">{formatPermissionName(permission)}</span>
                    <Switch
                      checked={selectedAdmin?.[permission] ?? false}
                      onCheckedChange={() => selectedAdmin && togglePermission(selectedAdmin.id, permission)}
                      disabled={permission === 'super_admin' && selectedAdmin?.id === authUser?.id}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedAdmin(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {PERMISSIONS.map(permission => (
                  <div key={permission} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${permissions[permission] ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="capitalize">{formatPermissionName(permission)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
