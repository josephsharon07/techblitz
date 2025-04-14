'use client';

import { use, useState, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users, User, Info } from "lucide-react";
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
  phone: string | null;
}

interface TeamMember extends User {
  is_lead: boolean;
}

interface ParticipationData {
  user_id: number;
  users: {
    id: number;
    name: string | null;
    email: string;
    college: string | null;
    phone: string | null;
  };
}

interface TeamData {
  lead: number;
}

interface Registration {
  id: number;
  team_id: number;
  checked_in_at: string | null;
  extra_data: any;
  members: TeamMember[];
  is_single: boolean;
}

interface Props {
  params: Promise<{
    event: string;
  }>;
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

export default function Page({ params }: Props) {
  const { event } = use(params);
  const decodedEvent = decodeURIComponent(event);
  useAuthCheck(decodedEvent);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [regToUncheck, setRegToUncheck] = useState<Registration | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
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
          checked_in_at,
          extra_data
        `)
        .eq('event', decodedEvent)
        .eq('is_checked_in', true);

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
              phone
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
          is_lead: p.users.id === teamData?.lead
        }));

        return {
          id: reg.id,
          team_id: reg.team_id,
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
      toast.error('Failed to load registrations');
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

  const handleUncheck = (reg: Registration) => {
    setRegToUncheck(reg);
    setShowConfirmDialog(true);
  };

  const confirmUncheck = async () => {
    if (!regToUncheck) return;

    try {
      const { error } = await supabase
        .from('registrations')
        .update({ 
          is_checked_in: false,
          checked_in_at: null
        })
        .eq('id', regToUncheck.id);

      if (error) throw error;

      toast.success('Check-in removed successfully');
      setShowConfirmDialog(false);
      setRegToUncheck(null);
      fetchRegistrations();
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
                <BreadcrumbPage>Event Check-ins: {decodedEvent}</BreadcrumbPage>
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
                <Card key={reg.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedReg(reg);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleUncheck(reg)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Checked in: {formatToIST(reg.checked_in_at)}
                  </div>
                </Card>
              ))}
              {filteredRegistrations.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Participants Checked In</h3>
                  <p className="text-muted-foreground">No one has checked in to this event yet.</p>
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
                {regToUncheck?.is_single ? (
                  <div>
                    Are you sure you want to remove the check-in for {regToUncheck.members[0].name || 'this participant'}?
                  </div>
                ) : (
                  <div>
                    Are you sure you want to remove the check-in for this team?
                    <div className="mt-2">
                      <div className="font-medium">Team Lead:</div>
                      <div>{regToUncheck?.members.find(m => m.is_lead)?.name || 'N/A'}</div>
                      {regToUncheck && regToUncheck.members.filter(m => !m.is_lead).length > 0 && (
                        <>
                          <div className="font-medium mt-2">Team Members:</div>
                          <div>{regToUncheck?.members.filter(m => !m.is_lead).map(m => m.name || 'Unnamed').join(', ')}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmUncheck}>
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Team Details</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4">
                  {selectedReg && (
                    <>
                      <div className="space-y-2">
                        {selectedReg.members.map((member, index) => (
                          <div key={index} className="flex items-center gap-2">
                            {selectedReg.is_single ? (
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
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-sm space-y-1">
                        <div>
                          Event: <span className="font-medium">{decodedEvent}</span>
                        </div>
                        <div>
                          Checked in at: {formatToIST(selectedReg.checked_in_at)}
                        </div>
                      </div>
                      {selectedReg.extra_data && (
                        <div className="mt-4">
                          {selectedReg.extra_data.projectTitle ? (
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
                                    <span className="font-normal">{selectedReg.extra_data.projectTitle}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    <span>Type</span>
                                    <span className="h-1 w-1 rounded-full bg-muted-foreground"></span>
                                    <span className="font-normal">{selectedReg.extra_data.projectType}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium mb-1">Description</div>
                                  <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md border">
                                    {selectedReg.extra_data.projectDescription}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : selectedReg.extra_data.abstract ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium">Abstract</h4>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Paper Submission</span>
                              </div>
                              <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md border">
                                {selectedReg.extra_data.abstract}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
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