import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminDishRequests, useReviewDishRequest } from '@/hooks/useCookDishes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Check, 
  X, 
  Clock, 
  Leaf, 
  ChefHat,
  Plus,
  UtensilsCrossed
} from 'lucide-react';
import { format } from 'date-fns';
import type { CookDishRequest } from '@/types/cook-dishes';

const DishRequestsTab: React.FC = () => {
  const { user } = useAuth();
  const { data: requests, isLoading } = useAdminDishRequests();
  const reviewMutation = useReviewDishRequest();

  const [selectedRequest, setSelectedRequest] = useState<CookDishRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [createFoodItem, setCreateFoodItem] = useState(true);
  const [allocateToCook, setAllocateToCook] = useState(true);

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const processedRequests = requests?.filter(r => r.status !== 'pending') || [];

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest || !user?.id) return;

    try {
      await reviewMutation.mutateAsync({
        requestId: selectedRequest.id,
        status,
        adminNotes,
        userId: user.id,
        createFoodItem: status === 'approved' && !selectedRequest.food_item_id ? createFoodItem : false,
        allocateToCook: status === 'approved' ? allocateToCook : false,
      });
      toast({ title: `Request ${status === 'approved' ? 'approved' : 'rejected'}` });
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error: any) {
      toast({ title: 'Failed to process', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderRequestCard = (request: CookDishRequest, showActions: boolean = true) => (
    <Card key={request.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge(request.status)}
              {request.food_item_id ? (
                <Badge variant="secondary" className="text-xs">Existing Dish</Badge>
              ) : (
                <Badge variant="default" className="text-xs"><Plus className="h-3 w-3 mr-1" />New Dish</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <ChefHat className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{request.cook?.kitchen_name}</span>
              <span className="text-xs text-muted-foreground">({request.cook?.mobile_number})</span>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-muted/50">
              {request.food_item_id ? (
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                  <span className="font-medium">{request.food_item?.name}</span>
                  {request.food_item?.is_vegetarian && <Leaf className="h-4 w-4 text-green-600" />}
                  <span className="text-sm text-muted-foreground">₹{request.food_item?.price}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{request.dish_name}</span>
                    {request.dish_is_vegetarian && <Leaf className="h-4 w-4 text-green-600" />}
                  </div>
                  {request.dish_description && (
                    <p className="text-xs text-muted-foreground">{request.dish_description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {request.dish_price && <span>Price: ₹{request.dish_price}</span>}
                    {request.dish_preparation_time_minutes && <span>• Time: {request.dish_preparation_time_minutes} min</span>}
                    {request.dish_category?.name && <span>• {request.dish_category.name}</span>}
                  </div>
                </div>
              )}
            </div>

            {request.admin_notes && (
              <div className="mt-2 p-2 rounded bg-muted text-xs">
                <strong>Admin Notes:</strong> {request.admin_notes}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Requested {format(new Date(request.created_at), 'dd MMM yyyy, hh:mm a')}
            </p>
          </div>

          {showActions && request.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => setSelectedRequest(request)}>
              Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Pending Requests ({pendingRequests.length})
        </h3>
        {pendingRequests.length === 0 ? (
          <Card className="p-6 text-center">
            <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p className="text-muted-foreground">No pending dish requests</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(req => renderRequestCard(req))}
          </div>
        )}
      </div>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Recent Processed ({processedRequests.length})</h3>
          <div className="space-y-3">
            {processedRequests.slice(0, 10).map(req => renderRequestCard(req, false))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Dish Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{selectedRequest.cook?.kitchen_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.food_item_id
                    ? `Wants to make: ${selectedRequest.food_item?.name}`
                    : `New dish request: ${selectedRequest.dish_name}`}
                </p>
              </div>

              {!selectedRequest.food_item_id && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="createFoodItem"
                      checked={createFoodItem}
                      onCheckedChange={(c) => setCreateFoodItem(c === true)}
                    />
                    <Label htmlFor="createFoodItem" className="text-sm">
                      Create new food item from this request
                    </Label>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="allocateToCook"
                  checked={allocateToCook}
                  onCheckedChange={(c) => setAllocateToCook(c === true)}
                />
                <Label htmlFor="allocateToCook" className="text-sm">
                  Allocate dish to cook upon approval
                </Label>
              </div>

              <div>
                <Label className="text-sm">Admin Notes (optional)</Label>
                <Textarea
                  placeholder="Add notes about this decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleReview('rejected')}
                  disabled={reviewMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview('approved')}
                  disabled={reviewMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DishRequestsTab;
