"use client";

import React, { useEffect, useState } from "react";
import { Receipt, ExternalLink, RefreshCw, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";

interface Payment {
  id: string;
  paymentIntentId?: string;
  courseName: string;
  courseId?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  refundable: boolean;
  refundDeadline?: string;
}

export default function MyInvoicesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchPayments();
    }
  }, [isAuthLoading, user]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Payment[]>('/api/payments/my-payments');
      if (response.success && response.data) {
        setPayments(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePayment) return;
    
    try {
      setDeleting(true);
      const response = await apiClient.delete(`/api/payments/${deletePayment.id}`);
      if (response.success) {
        toast.success("Invoice removed from view");
        fetchPayments();
      } else {
        toast.error(response.error || "Failed to remove invoice");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to remove invoice");
    } finally {
      setDeleting(false);
      setDeletePayment(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading || isAuthLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(5)].map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Invoices</h1>
          <p className="text-muted-foreground mt-1">
            View your purchase history and receipts
          </p>
        </div>
        <Button variant="outline" onClick={fetchPayments}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Purchase History
          </CardTitle>
          <CardDescription>
            All your course purchases and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No purchases yet</h3>
              <p className="text-muted-foreground">
                Your purchase history will appear here once you buy a course.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.courseName}</TableCell>
                    <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={payment.status === "paid" ? "default" : "secondary"}
                        className={payment.status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(payment.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {payment.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(payment.receiptUrl, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        )}
                        {payment.invoiceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(payment.invoiceUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Invoice
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletePayment(payment)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePayment} onOpenChange={() => setDeletePayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this invoice from your view? 
              This will hide the invoice but won't affect your purchase or access to the course.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
