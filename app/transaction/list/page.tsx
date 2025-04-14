'use client';

import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, Wallet, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthCheck } from "@/lib/checkUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Transaction {
  id: number;
  created_at: string;
  transaction_id: string | null;
  upi_id: string | null;
  is_verified: boolean | null;
  user: {
    name: string | null;
    email: string;
    phone: number | null;
  } | null;
}

export default function Page() {
  useAuthCheck('payment');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery]);

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
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (!error) {
        setTransactions(data || []);
        setFilteredTransactions(data || []);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function filterTransactions() {
    if (!searchQuery.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = transactions.filter(t => {
      const date = new Date(t.created_at).toLocaleDateString().toLowerCase();
      const time = new Date(t.created_at).toLocaleTimeString().toLowerCase();
      const transactionId = t.transaction_id?.toLowerCase() || '';
      const upiId = t.upi_id?.toLowerCase() || '';
      const name = t.user?.name?.toLowerCase() || '';
      const email = t.user?.email?.toLowerCase() || '';
      const phone = t.user?.phone?.toString() || '';
      const status = t.is_verified ? "verified" : t.is_verified === false ? "rejected" : "pending";

      return date.includes(query) ||
        time.includes(query) ||
        transactionId.includes(query) ||
        upiId.includes(query) ||
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        status.includes(query);
    });

    setFilteredTransactions(filtered);
  }

  async function updateVerificationStatus(transactionId: number, status: boolean) {
    const { error } = await supabase
      .from('transactions')
      .update({ is_verified: status })
      .eq('id', transactionId);

    if (!error) {
      setSelectedTransaction(prev => prev ? { ...prev, is_verified: status } : null);
      fetchTransactions();
    }
  }

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
                <BreadcrumbPage>Transactions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search transactions..."
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
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {transaction.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.user?.email || 'No Email'}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour12: true,
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <Badge 
                      variant={transaction.is_verified ? "default" : transaction.is_verified === false ? "destructive" : "secondary"}
                    >
                      {transaction.is_verified ? "Verified" : transaction.is_verified === false ? "Not Yet Verified" : "Pending"}
                    </Badge>
                  </div>
                </Card>
              ))}
              {filteredTransactions.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Transactions Found</h3>
                  <p className="text-muted-foreground">No transactions match your search.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4">
                  {selectedTransaction && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {selectedTransaction.user?.name || 'Unknown User'}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selectedTransaction.user?.email} • {selectedTransaction.user?.phone || 'No Phone'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Transaction ID:</span>{' '}
                          <span className="font-mono">{selectedTransaction.transaction_id || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium">UPI ID:</span>{' '}
                          <span className="font-mono">{selectedTransaction.upi_id || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium">Date & Time:</span>{' '}
                          {new Date(selectedTransaction.created_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour12: true,
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>{' '}
                          <Badge 
                            variant={selectedTransaction.is_verified ? "default" : selectedTransaction.is_verified === false ? "destructive" : "secondary"}
                          >
                            {selectedTransaction.is_verified ? "Verified" : selectedTransaction.is_verified === false ? "Not Yet Verified" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button
                          variant={selectedTransaction.is_verified ? "outline" : "default"}
                          onClick={() => updateVerificationStatus(selectedTransaction.id, true)}
                          disabled={selectedTransaction.is_verified === true}
                        >
                          Verify
                        </Button>
                        <Button
                          variant={selectedTransaction.is_verified === false ? "outline" : "destructive"}
                          onClick={() => updateVerificationStatus(selectedTransaction.id, false)}
                          disabled={selectedTransaction.is_verified === false}
                        >
                          Unverify
                        </Button>
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