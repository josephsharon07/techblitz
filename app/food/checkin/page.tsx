'use client';

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
import { Camera, StopCircle, AlertCircle } from "lucide-react";
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
  is_food_received: boolean;
  is_checked_in: boolean;
  food: string;
}

export default function Page() {
  const [showDialog, setShowDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDescription, setErrorDescription] = useState('');
  const [userData, setUserData] = useState<User | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  useAuthCheck('food');

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
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decodedId)
        .single();

      if (error) {
        setErrorMessage('User Not Found');
        setErrorDescription('The scanned QR code is not associated with any user.');
        setShowErrorDialog(true);
        return;
      }

      if (!data.is_checked_in) {
        setErrorMessage('Not Registered');
        setErrorDescription(`${data.name || 'This user'} needs to check in at the registration desk first.`);
        setShowErrorDialog(true);
        return;
      }
      
      if (data.is_food_received) {
        setErrorMessage('Food Already Served');
        setErrorDescription(`${data.name || 'This user'} has already received food and cannot be served twice.`);
        setShowErrorDialog(true);
        return;
      }

      setUserData(data);
      setShowDialog(true);
    } catch (error) {
      console.error('Scanning error:', error);
      setErrorMessage('Scanner Error');
      setErrorDescription('Failed to process the QR code. Please try again.');
      setShowErrorDialog(true);
    }
  };

  const handleServeFood = async () => {
    if (!userData) return;

    try {
        const istTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const istDate = new Date(istTime);
      const { error } = await supabase
        .from('users')
        .update({ 
          is_food_received: true,
          food_served_at: istDate.toISOString()
        })
        .eq('id', userData.id);

      if (error) throw error;

      toast.success('Food served successfully');
      setShowDialog(false);
      setUserData(null);
    } catch (error) {
      toast.error('Failed to update status');
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
                <BreadcrumbPage>Food Check-in</BreadcrumbPage>
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
                <DialogTitle>Confirm Food Service</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2">
                    <div>Serve food to {userData?.name} ({userData?.email})?</div>
                    <div className="font-medium">Food Type: {userData?.food || 'Not specified'}</div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleServeFood}
                >
                  Serve Food
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