"use client"
import { AppSidebar } from "@/components/app-sidebar"
import React, { useState, useEffect } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { useRouter } from 'next/navigation';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabaseClient"
import { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Shield, UtensilsCrossed, UserPlus, Group } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [foodStats, setFoodStats] = useState({ lunch: 0 });
  const [eventStats, setEventStats] = useState<{ [key: string]: { total: number; checkedIn: number } }>({});
  const [eventDetailedStats, setEventDetailedStats] = useState<{ 
    [key: string]: { 
      teams: number; 
      members: number;
      checkedIn: number;
    } 
  }>({});
  const [eventLoading, setEventLoading] = useState(true);
  const [eventDetailedLoading, setEventDetailedLoading] = useState(true);
  
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<{ name?: string; [key: string]: any }>({});

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
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
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchStats = async () => {
      // Get total registrations
      const { count: totalCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get checked in users
      const { count: checkedInCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_checked_in', true);

      setStats({
        total: totalCount || 0,
        checkedIn: checkedInCount || 0
      });

      // Get food stats
      const { data: foodData } = await supabase
        .from('users')
        .select('id')
        .eq('is_food_received', true);

      const lunchServed = new Set();
      foodData?.forEach(item => {
        lunchServed.add(item.id);
      });

      setFoodStats({
        lunch: lunchServed.size
      });
    };

    const fetchEventStats = async () => {
      setEventLoading(true);
      try {
        // Get event stats
        const events = [
          'Technical Connection',
          'Debugging',
          'Paper Presentation',
          'Project Expo',
          'Prompt Engineering',
          'Treasure Hunt',
          'Bioscope',
          'Lyric Detective',
          'Meme Creation',
          'Video Editing & Photography'
        ];

        const eventData: { [key: string]: { total: number; checkedIn: number } } = {};
        
        for (const event of events) {
          const { count: totalReg } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event', event);

          const { count: checkedIn } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event', event)
            .eq('is_checked_in', true);

          eventData[event] = {
            total: totalReg || 0,
            checkedIn: checkedIn || 0
          };
        }

        setEventStats(eventData);
      } finally {
        setEventLoading(false);
      }
    };

    const fetchDetailedEventStats = async () => {
      setEventDetailedLoading(true);
      try {
        const events = [
          'Technical Connection',
          'Debugging',
          'Paper Presentation',
          'Project Expo',
          'Prompt Engineering',
          'Treasure Hunt',
          'Bioscope',
          'Lyric Detective',
          'Meme Creation',
          'Video Editing & Photography'
        ];

        const detailedEventData: { 
          [key: string]: { 
            teams: number; 
            members: number; 
            checkedIn: number; 
          } 
        } = {};
        
        for (const event of events) {
          // Get registrations for this event
          const { data: registrations } = await supabase
            .from('registrations')
            .select('team_id, is_checked_in')
            .eq('event', event);

          // Get unique teams and checked in count
          const uniqueTeams = new Set(registrations?.map(r => r.team_id) || []);
          const checkedIn = registrations?.filter(r => r.is_checked_in).length || 0;

          // Get all participants for these teams
          const { data: participants } = await supabase
            .from('participation')
            .select('team_id')
            .eq('event_name', event)
            .in('team_id', Array.from(uniqueTeams));

          detailedEventData[event] = {
            teams: uniqueTeams.size,
            members: participants?.length || 0,
            checkedIn: checkedIn
          };
        }

        setEventDetailedStats(detailedEventData);
      } finally {
        setEventDetailedLoading(false);
      }
    };

    checkAuth();
    fetchStats();
    fetchEventStats();
    fetchDetailedEventStats();
  }, [router]);

  const LoadingSkeleton = () => (
    <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
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
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? <LoadingSkeleton /> : (
                  <div className="text-2xl font-bold">{stats.total}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checked In</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <LoadingSkeleton />
                    <div className="mt-2 h-2 animate-pulse rounded bg-muted"></div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.checkedIn}</div>
                    <Progress className="mt-2" value={(stats.checkedIn / stats.total) * 100} />
                  </>
                )}
              </CardContent>
            </Card>


            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  Food Service Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-6 animate-pulse rounded bg-muted"></div>
                    <div className="h-2 animate-pulse rounded bg-muted"></div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span>{foodStats.lunch} / {stats.total}</span>
                    </div>
                    <Progress value={(foodStats.lunch / stats.total) * 100} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Event Check-in Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eventLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 animate-pulse rounded bg-muted"></div>
                      <div className="h-2 animate-pulse rounded bg-muted"></div>
                    </div>
                  ))
                ) : (
                  Object.entries(eventStats).map(([event, stats]) => (
                    <div key={event}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="truncate">{event}</span>
                        <span>{stats.checkedIn} / {stats.total}</span>
                      </div>
                      <Progress value={(stats.checkedIn / stats.total) * 100} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Event Registration Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {eventDetailedLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="space-y-4">
                      <div className="h-6 w-48 animate-pulse rounded bg-muted"></div>
                      <div className="grid grid-cols-3 gap-4">
                        {Array(3).fill(0).map((_, j) => (
                          <div key={j} className="h-12 animate-pulse rounded bg-muted"></div>
                        ))}
                      </div>
                      <div className="h-2 animate-pulse rounded bg-muted"></div>
                    </div>
                  ))
                ) : (
                  Object.entries(eventDetailedStats).map(([event, stats]) => (
                    <div key={event}>
                      <div className="font-medium mb-2">{event}</div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Group className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">Teams</div>
                            <div className="font-medium">{stats.teams}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">Members</div>
                            <div className="font-medium">{stats.members}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">Checked In</div>
                            <div className="font-medium">{stats.checkedIn}</div>
                          </div>
                        </div>
                      </div>
                      <Progress className="mt-2" value={(stats.checkedIn / stats.teams) * 100} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-muted"></div>
                  ))
                ) : (
                  authUser && (
                    <>
                      <div>
                        <span className="font-medium">Name:</span> {permissions.name}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {authUser.email}
                      </div>
                      <div>
                        <span className="font-medium">Admin ID:</span> {authUser.id}
                      </div>
                      <div>
                        <span className="font-medium">Last Sign In:</span>{' '}
                        {authUser.last_sign_in_at 
                          ? new Date(authUser.last_sign_in_at).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata'
                            })
                          : 'N/A'}
                      </div>
                    </>
                  )
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array(6).fill(0).map((_, i) => (
                      <div key={i} className="h-6 animate-pulse rounded bg-muted"></div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(permissions)
                      .filter(([key]) => key !== 'id' && key !== 'created_at')
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
