import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wallet, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HomeDeliverySettlementsProps {
  onBack: () => void;
}

const HomeDeliverySettlements: React.FC<HomeDeliverySettlementsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch delivery wallets with staff info
  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['delivery-wallets-settlements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_wallets')
        .select('*, delivery_staff(id, name, mobile_number)');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch pending wallet transactions
  const { data: pendingTransactions, isLoading: txLoading } = useQuery({
    queryKey: ['pending-wallet-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*, delivery_staff(name, mobile_number)')
        .eq('status', 'pending')
        .eq('transaction_type', 'collection')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const approveSettlementMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-wallets-settlements'] });
      toast.success('Settlement approved');
    },
    onError: () => toast.error('Failed to approve settlement'),
  });

  const totalPendingCollection = wallets?.reduce(
    (sum, w) => sum + (w.collected_amount || 0) - (w.total_settled || 0),
    0
  ) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">Cash Settlement</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Wallet className="h-6 w-6 mx-auto mb-1 text-amber-600" />
            <p className="text-xl font-bold text-amber-600">₹{totalPendingCollection.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending Collection</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-blue-600" />
            <p className="text-xl font-bold text-blue-600">{pendingTransactions?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Pending Approvals</p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Staff Wallets */}
      <h3 className="font-medium text-sm mt-4">Delivery Staff Wallets</h3>
      {walletsLoading ? (
        <Card className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
      ) : wallets?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            No delivery staff wallets found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets?.map((wallet: any) => (
            <Card key={wallet.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{wallet.delivery_staff?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{wallet.delivery_staff?.mobile_number}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-bold text-amber-600">₹{(wallet.collected_amount || 0).toLocaleString()}</p>
                    <p className="text-muted-foreground">Collected</p>
                  </div>
                  <div>
                    <p className="font-bold text-green-600">₹{(wallet.job_earnings || 0).toLocaleString()}</p>
                    <p className="text-muted-foreground">Earnings</p>
                  </div>
                  <div>
                    <p className="font-bold text-blue-600">₹{(wallet.total_settled || 0).toLocaleString()}</p>
                    <p className="text-muted-foreground">Settled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Transactions */}
      <h3 className="font-medium text-sm mt-4">Pending Approvals</h3>
      {txLoading ? (
        <Card className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
      ) : pendingTransactions?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            No pending transactions
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingTransactions?.map((tx: any) => (
            <Card key={tx.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{tx.delivery_staff?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.description} • {format(new Date(tx.created_at), 'dd MMM, hh:mm a')}
                    </p>
                    <p className="font-bold text-primary mt-1">₹{tx.amount?.toLocaleString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approveSettlementMutation.mutate(tx.id)}
                    disabled={approveSettlementMutation.isPending}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeDeliverySettlements;
