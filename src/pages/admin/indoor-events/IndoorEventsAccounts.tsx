import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import IndoorEventsShell from './IndoorEventsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Wallet, IndianRupee, CheckCircle, Clock, ChefHat, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CookWithSettlements {
  id: string;
  user_id: string | null;
  kitchen_name: string;
  mobile_number: string;
  panchayat?: { name: string };
  pending_amount: number;
  total_earned: number;
  pending_settlements: Settlement[];
}

interface Settlement {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  order_id: string | null;
  order?: { order_number: string };
}

const IndoorEventsAccounts: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCook, setSelectedCook] = useState<CookWithSettlements | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  // Fetch cooks with their settlements
  const { data: cooksWithSettlements, isLoading } = useQuery({
    queryKey: ['cook-settlements-admin', statusFilter],
    queryFn: async () => {
      // Fetch all active cooks
      const { data: cooks, error: cookError } = await supabase
        .from('cooks')
        .select('id, user_id, kitchen_name, mobile_number, panchayat:panchayats(name)')
        .eq('is_active', true)
        .order('kitchen_name');

      if (cookError) throw cookError;

      // Get settlements for all cooks
      const cookUserIds = cooks?.filter(c => c.user_id).map(c => c.user_id!) || [];
      
      let settlementsQuery = supabase
        .from('settlements')
        .select('id, user_id, amount, status, created_at, order_id')
        .in('user_id', cookUserIds)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        settlementsQuery = settlementsQuery.eq('status', statusFilter);
      }

      const { data: settlements } = await settlementsQuery;

      // Fetch order numbers for settlements
      const orderIds = settlements?.filter(s => s.order_id).map(s => s.order_id!) || [];
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number')
        .in('id', orderIds);

      const orderMap = new Map(orders?.map(o => [o.id, o]) || []);

      // Aggregate settlements by cook
      const cookSettlements = new Map<string, { pending: number; total: number; items: Settlement[] }>();
      
      settlements?.forEach(s => {
        const existing = cookSettlements.get(s.user_id) || { pending: 0, total: 0, items: [] };
        existing.total += Number(s.amount);
        if (s.status === 'pending') {
          existing.pending += Number(s.amount);
        }
        existing.items.push({
          ...s,
          order: s.order_id ? orderMap.get(s.order_id) : undefined,
        });
        cookSettlements.set(s.user_id, existing);
      });

      return cooks?.map(cook => ({
        ...cook,
        pending_amount: cook.user_id ? (cookSettlements.get(cook.user_id)?.pending || 0) : 0,
        total_earned: cook.user_id ? (cookSettlements.get(cook.user_id)?.total || 0) : 0,
        pending_settlements: cook.user_id ? (cookSettlements.get(cook.user_id)?.items.filter(i => i.status === 'pending') || []) : [],
      })) as CookWithSettlements[];
    },
  });

  // Mutation to approve/payout settlements
  const payoutMutation = useMutation({
    mutationFn: async ({ settlementIds, cookId }: { settlementIds: string[]; cookId: string }) => {
      const { error } = await supabase
        .from('settlements')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .in('id', settlementIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Payout Approved',
        description: 'Settlement marked as paid successfully',
      });
      setPayoutDialogOpen(false);
      setSelectedCook(null);
      queryClient.invalidateQueries({ queryKey: ['cook-settlements-admin'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process payout',
        variant: 'destructive',
      });
    },
  });

  const handlePayoutAll = () => {
    if (!selectedCook || selectedCook.pending_settlements.length === 0) return;
    
    const settlementIds = selectedCook.pending_settlements.map(s => s.id);
    payoutMutation.mutate({ settlementIds, cookId: selectedCook.id });
  };

  const totalPending = cooksWithSettlements?.reduce((sum, c) => sum + c.pending_amount, 0) || 0;
  const cooksWithPending = cooksWithSettlements?.filter(c => c.pending_amount > 0) || [];

  return (
    <IndoorEventsShell title="Accounts & Payouts">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Total Pending</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ₹{totalPending.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ChefHat className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Cooks Pending</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {cooksWithPending.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Settlements</SelectItem>
            <SelectItem value="pending">Pending Only</SelectItem>
            <SelectItem value="approved">Approved Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cook Payouts Table */}
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : cooksWithSettlements?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No cook settlements found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Cook Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cook</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cooksWithSettlements?.map((cook) => (
                  <TableRow key={cook.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cook.kitchen_name}</p>
                        <p className="text-xs text-muted-foreground">{cook.mobile_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {cook.pending_amount > 0 ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          ₹{cook.pending_amount.toLocaleString()}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">₹0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{cook.total_earned.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {cook.pending_amount > 0 && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCook(cook);
                            setPayoutDialogOpen(true);
                          }}
                        >
                          Payout
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Process Payout
            </DialogTitle>
            <DialogDescription>
              Approve pending settlements for {selectedCook?.kitchen_name}
            </DialogDescription>
          </DialogHeader>

          {selectedCook && (
            <div className="space-y-4 py-4">
              {/* Cook Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <ChefHat className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{selectedCook.kitchen_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCook.mobile_number}</p>
                </div>
              </div>

              {/* Pending Settlements */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Pending Settlements ({selectedCook.pending_settlements.length})</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedCook.pending_settlements.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <div>
                        <p className="font-medium">₹{Number(s.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.order?.order_number || 'N/A'} • {format(new Date(s.created_at), 'dd MMM')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600">Pending</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="font-medium">Total Payout</span>
                <span className="text-xl font-bold text-primary flex items-center gap-1">
                  <IndianRupee className="h-4 w-4" />
                  {selectedCook.pending_amount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePayoutAll}
              disabled={payoutMutation.isPending}
            >
              {payoutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IndoorEventsShell>
  );
};

export default IndoorEventsAccounts;
