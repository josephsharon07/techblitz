'use client';

import { use, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthCheck } from "@/lib/checkUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface User {
  id: number;
  name: string | null;
  email: string;
  college: string | null;
  phone: string | null;
  is_checked_in: boolean;
}

interface TeamMember extends User {
  is_lead: boolean;
}

interface TeamMemberResponse {
  users: {
    id: number;
    name: string | null;
    email: string;
    college: string | null;
    phone: string | null;
    is_checked_in: boolean;
  }
}

interface Registration {
  id: number;
  team_id: number;
  is_checked_in: boolean;
  checked_in_at: string | null;
  extra_data: any;
  members: TeamMember[];
  is_single: boolean;
}

interface ParticipationData {
  user_id: number;
  users: {
    id: number;
    name: string | null;
    email: string;
    college: string | null;
    phone: string | null;
    is_checked_in: boolean;
  };
}

interface TeamData {
  lead: number;
}

export default function RegisteredList() {
  const params = useParams();
  const decodedEvent = decodeURIComponent(params.event as string);
  useAuthCheck(decodedEvent);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Registration | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  useEffect(() => {
    filterRegistrations();
  }, [registrations, searchQuery]);

  async function fetchRegistrations() {
    setIsLoading(true);
    try {
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .select(`
          id,
          team_id,
          is_checked_in,
          checked_in_at,
          extra_data
        `)
        .eq('event', decodedEvent);

      if (regError) throw regError;

      const registrationsWithMembers = await Promise.all(regData.map(async (reg) => {
        const { data: teamData } = await supabase
          .from('team')
          .select('lead')
          .eq('id', reg.team_id)
          .single();

        const { data: participationData } = await supabase
          .from('participation')
          .select(`
            user_id,
            users:user_id (
              id,
              name,
              email,
              college,
              phone,
              is_checked_in
            )
          `)
          .eq('team_id', reg.team_id)
          .eq('event_name', decodedEvent) as { data: ParticipationData[] | null };

        const members = (participationData || []).map((p: ParticipationData) => ({
          id: p.users.id,
          name: p.users.name,
          email: p.users.email,
          college: p.users.college,
          phone: p.users.phone,
          is_checked_in: p.users.is_checked_in,
          is_lead: p.users.id === (teamData as TeamData).lead
        }));

        return {
          id: reg.id,
          team_id: reg.team_id,
          is_checked_in: reg.is_checked_in,
          checked_in_at: reg.checked_in_at,
          extra_data: reg.extra_data,
          members,
          is_single: members.length === 1
        };
      }));

      setRegistrations(registrationsWithMembers);
      setFilteredRegistrations(registrationsWithMembers);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function filterRegistrations() {
    if (!searchQuery.trim()) {
      setFilteredRegistrations(registrations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = registrations.filter(reg => {
      return reg.members.some(member => {
        const name = member.name?.toLowerCase() || '';
        const email = member.email.toLowerCase();
        const college = member.college?.toLowerCase() || '';
        const phone = member.phone?.toString().toLowerCase() || '';

        return name.includes(query) ||
          email.includes(query) ||
          college.includes(query) ||
          phone.includes(query);
      });
    });

    setFilteredRegistrations(filtered);
  }

  const showTeamDetails = (team: Registration) => {
    setSelectedTeam(team);
    setShowDialog(true);
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
                <BreadcrumbPage>Registered Users: {decodedEvent}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search participants..."
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
              {filteredRegistrations.map((reg) => (
                <Card key={reg.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => showTeamDetails(reg)}>
                  <div className="flex items-center gap-2 mb-2">
                    {reg.is_single ? (
                      <User className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {reg.members.find(m => m.is_lead)?.name || reg.members[0]?.name || 'Unknown'}
                      {!reg.is_single && ' + ' + (reg.members.length - 1)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {reg.is_checked_in ? (
                      <span className="text-green-600">Checked In</span>
                    ) : (
                      <span className="text-yellow-600">Not Checked In</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Team Details</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-4">
                    {selectedTeam && (
                      <>
                        <div className="space-y-2">
                          {selectedTeam.members.map((member, index) => (
                            <div key={index} className="flex items-center gap-2">
                              {selectedTeam.is_single ? (
                                <User className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Users className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{member.name}</span>
                                  {member.is_lead && (
                                    <span className="text-xs text-primary">(Lead)</span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.email} • {member.college || 'No College'} • {member.phone || 'No Phone'}
                                </div>
                                <div className="text-sm mt-1">
                                  <span className={member.is_checked_in ? 'text-green-600' : 'text-yellow-600'}>
                                    {member.is_checked_in ? 'User Checked In' : 'User Not Checked In'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-sm space-y-1">
                          <div>
                            Event: <span className="font-medium">{decodedEvent}</span>
                          </div>
                          <div>
                            Status: <span className={selectedTeam.is_checked_in ? 'text-green-600' : 'text-yellow-600'}>
                              {selectedTeam.is_checked_in ? 'Team Checked In' : 'Team Not Checked In'}
                            </span>
                          </div>
                          {selectedTeam.checked_in_at && (
                            <div>
                              Checked in at: {new Date(selectedTeam.checked_in_at).toLocaleString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                hour12: true,
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                          {selectedTeam.extra_data && (
                            <div className="mt-4">
                              {selectedTeam.extra_data.projectTitle ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium">Project Details</h4>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Project Submission</span>
                                  </div>
                                  <div className="space-y-2 border rounded-lg p-3">
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        <span>Title</span>
                                        <span className="h-1 w-1 rounded-full bg-muted-foreground"></span>
                                        <span className="font-normal">{selectedTeam.extra_data.projectTitle}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        <span>Type</span>
                                        <span className="h-1 w-1 rounded-full bg-muted-foreground"></span>
                                        <span className="font-normal">{selectedTeam.extra_data.projectType}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium mb-1">Description</div>
                                      <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md border">
                                        {selectedTeam.extra_data.projectDescription}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : selectedTeam.extra_data.abstract ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium">Abstract</h4>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Paper Submission</span>
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md border">
                                    {selectedTeam.extra_data.abstract}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}