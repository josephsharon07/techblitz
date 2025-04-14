'use client';

import { use } from 'react';
import { useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Camera, StopCircle, AlertCircle, User, Users } from "lucide-react";
import { useAuthCheck } from "@/lib/checkUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface Props {
  params: Promise<{
    event: string;
  }>;
}

export default function Page({ params }: Props) {
  const { event } = use(params);
  const decodedEvent = decodeURIComponent(event);
  useAuthCheck(decodedEvent);
  const [showDialog, setShowDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDescription, setErrorDescription] = useState('');
  const [userData, setUserData] = useState<Registration | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  const startScanning = async () => {
    try {
      const html5QrCode = new Html5Qrcode("reader");
      setScanner(html5QrCode);
      setIsScanning(true);

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleDecode,
        (error: Error | string) => {
          if (typeof error === 'object' && error?.message?.includes("NotFoundException")) {
            return;
          }
          console.warn(error);
        }
      );
    } catch (err) {
      toast.error("Failed to start camera. Please check permissions.");
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scanner) {
      await scanner.stop();
      setScanner(null);
    }
    setIsScanning(false);
  };

  const handleDecode = async (decodedText: string) => {
    try {
      await stopScanning();
      let decodedId;
      
      try {
        decodedId = atob(decodedText);
      } catch (error) {
        setErrorMessage('Invalid QR Code');
        setErrorDescription('The scanned QR code is not valid. Please try again.');
        setShowErrorDialog(true);
        return;
      }

      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', decodedId)
        .single();

      if (userError) {
        setErrorMessage('User Not Found');
        setErrorDescription('The scanned QR code is not associated with any user.');
        setShowErrorDialog(true);
        return;
      }

      if (!userData.is_checked_in) {
        setErrorMessage('Not Checked In');
        setErrorDescription('Please check in at the registration desk first.');
        setShowErrorDialog(true);
        return;
      }

      // Get participation and team data
      const { data: participationData, error: participationError } = await supabase
        .from('participation')
        .select(`
          team_id,
          event_name
        `)
        .eq('user_id', decodedId)
        .eq('event_name', decodedEvent)
        .single();

      if (participationError) {
        setErrorMessage('Not Registered');
        setErrorDescription(`${userData.name || 'This user'} is not registered for this event.`);
        setShowErrorDialog(true);
        return;
      }

      // Get team information
      const { data: teamData } = await supabase
        .from('team')
        .select('lead')
        .eq('id', participationData.team_id)
        .single();

      // Get all team members
      const { data: teamMembersData } = await supabase
        .from('participation')
        .select(`
          users (
            id,
            name,
            email,
            college,
            phone,
            is_checked_in
          )
        `)
        .eq('team_id', participationData.team_id)
        .eq('event_name', decodedEvent) as { data: TeamMemberResponse[] | null };

      const members = teamMembersData?.map(p => ({
        id: p.users.id,
        name: p.users.name,
        email: p.users.email,
        college: p.users.college,
        phone: p.users.phone,
        is_checked_in: p.users.is_checked_in,
        is_lead: p.users.id === teamData?.lead
      })) || [];

      // Check if all team members are registered
      const unregisteredMembers = members.filter(member => !member.is_checked_in);
      if (unregisteredMembers.length > 0) {
        const names = unregisteredMembers.map(m => m.name || 'Unnamed member').join(', ');
        setErrorMessage('Team Not Fully Registered');
        setErrorDescription(`Some team members haven't checked in at registration desk: ${names}`);
        setShowErrorDialog(true);
        return;
      }

      // Check registration status
      const { data: registrationData, error: registrationError } = await supabase
        .from('registrations')
        .select('*')
        .eq('event', decodedEvent)
        .eq('team_id', participationData.team_id)
        .single();

      if (registrationError) {
        setErrorMessage('Registration Error');
        setErrorDescription('Could not find event registration.');
        setShowErrorDialog(true);
        return;
      }

      if (registrationData.is_checked_in) {
        setErrorMessage('Already Checked In');
        setErrorDescription(`${userData.name || 'This user'} and team have already checked in to this event.`);
        setShowErrorDialog(true);
        return;
      }

      // Set full team and registration data
      setUserData({
        ...registrationData,
        team_id: participationData.team_id,
        members,
        is_single: members.length === 1
      });
      setShowDialog(true);
    } catch (error) {
      console.error('Scanning error:', error);
      setErrorMessage('Scanner Error');
      setErrorDescription('Failed to process the QR code. Please try again.');
      setShowErrorDialog(true);
    }
  };

  const handleCheckIn = async () => {
    if (!userData) return;

    try {
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ 
          is_checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('event', decodedEvent)
        .eq('team_id', userData.team_id);

      if (updateError) throw updateError;

      toast.success('Event check-in successful');
      setShowDialog(false);
      setUserData(null);
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
                <BreadcrumbPage>Event Check-in: {decodedEvent}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="p-6">
          <Card className="w-full max-w-xl mx-auto">
            <div className="p-4">
              <div id="reader" className="mb-4"></div>
              <div className="text-center">
                {!isScanning ? (
                  <Button 
                    onClick={startScanning}
                    className="w-full"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start Scanning
                  </Button>
                ) : (
                  <Button 
                    onClick={stopScanning}
                    variant="destructive"
                    className="w-full"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop Scanning
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Event Check-in</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {userData?.members?.map((member, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {userData.is_single ? (
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
                    <div className="text-sm">
                      Event: <span className="font-medium">{decodedEvent}</span>
                    </div>
                    {userData?.extra_data && (
                      <div className="mt-4">
                        {userData.extra_data.projectTitle ? (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium">Project Details</h4>
                            <div className="space-y-2">
                              <div>
                                <div className="font-medium">Title</div>
                                <div className="text-sm">{userData.extra_data.projectTitle}</div>
                              </div>
                              <div>
                                <div className="font-medium">Type</div>
                                <div className="text-sm">{userData.extra_data.projectType}</div>
                              </div>
                              <div>
                                <div className="font-medium">Description</div>
                                <div className="text-sm whitespace-pre-wrap bg-muted p-2 rounded-md">
                                  {userData.extra_data.projectDescription}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : userData.extra_data.abstract ? (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium">Abstract</h4>
                            <div className="text-sm whitespace-pre-wrap bg-muted p-2 rounded-md">
                              {userData.extra_data.abstract}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCheckIn}>
                  Check In Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
            <DialogContent>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <DialogTitle>{errorMessage}</DialogTitle>
                </div>
                <DialogDescription>{errorDescription}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => {
                  setShowErrorDialog(false);
                  startScanning();
                }}>
                  Try Again
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}