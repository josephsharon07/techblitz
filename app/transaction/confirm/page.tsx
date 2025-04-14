'use client';

import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuthCheck } from "@/lib/checkUser";

interface Transaction {
  id: number;
  created_at: string;
  transaction_id: string | null;
  upi_id: string | null;
  user: {
    name: string | null;
    email: string;
    phone: number | null;
    college: string | null;
  } | null;
}

export default function Page() {
  useAuthCheck('payment');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          user:users (
            name,
            email,
            phone,
            college
          )
        `)
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to fetch transactions');
        return;
      }

      setTransactions(data || []);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerification(id: number, status: boolean) {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ is_verified: status })
        .eq('id', id);

      if (error) {
        toast.error('Failed to update transaction');
        return;
      }

      toast.success(`Transaction ${status ? 'confirmed' : 'rejected'}`);
      await fetchTransactions();
      setCurrentIndex(prev => Math.min(prev, transactions.length - 2));
    } finally {
      setIsProcessing(false);
    }
  }

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
                <BreadcrumbPage>Verify Transactions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="p-4 h-[calc(100vh-4rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No pending transactions</p>
            </div>
          ) : (
            <Card className="w-full h-full flex flex-col">
              <CardContent className="flex-grow p-6">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Transaction Details</h2>
                    <div className="space-y-2">
                      <p><span className="font-medium">Transaction ID:</span> {transactions[currentIndex].transaction_id}</p>
                      <p><span className="font-medium">UPI ID:</span> {transactions[currentIndex].upi_id}</p>
                      <p><span className="font-medium">Date:</span> {new Date(transactions[currentIndex].created_at).toLocaleDateString()}</p>
                      <p><span className="font-medium">Time:</span> {new Date(transactions[currentIndex].created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-2">User Details</h2>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {transactions[currentIndex].user?.name}</p>
                      <p><span className="font-medium">Email:</span> {transactions[currentIndex].user?.email}</p>
                      <p><span className="font-medium">Phone:</span> {transactions[currentIndex].user?.phone}</p>
                      <p><span className="font-medium">College:</span> {transactions[currentIndex].user?.college}</p>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t p-6">
                <div className="flex justify-between items-center w-full">
                  <div className="flex gap-4">
                    <Button
                      className="bg-green-500 text-bold text-white"
                      variant="default"
                      size="lg"
                      onClick={() => handleVerification(transactions[currentIndex].id, true)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Processing...
                        </div>
                      ) : (
                        'Confirm'
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="default"
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                    >
                      Previous
                    </Button>
                    <span>
                      {currentIndex + 1} of {transactions.length}
                    </span>
                    <Button
                      variant="default"
                      onClick={() => setCurrentIndex(prev => Math.min(transactions.length - 1, prev + 1))}
                      disabled={currentIndex === transactions.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
