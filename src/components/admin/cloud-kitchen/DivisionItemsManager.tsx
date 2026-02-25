import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Edit2, Leaf, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { formatSlotTime } from '@/hooks/useCloudKitchenSlots';
import {
  useCloudKitchenItems,
  useAvailableItems,
  useAssignItemToDivision,
  useUpdateItemSet,
  useRemoveItemFromDivision,
  useToggleItemComingSoon,
  type CloudKitchenItem,
} from '@/hooks/useCloudKitchenItems';
import type { Division } from '@/hooks/useCloudKitchenDivisions';

interface DivisionItemsManagerProps {
  division: Division;
  onBack: () => void;
}

const DivisionItemsManager: React.FC<DivisionItemsManagerProps> = ({
  division,
  onBack,
}) => {
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CloudKitchenItem | null>(null);
  const [setSize, setSetSize] = useState(1);
  const [minOrderSets, setMinOrderSets] = useState(1);

  const { data: items, isLoading } = useCloudKitchenItems(division.id);
  const { data: availableItems } = useAvailableItems();
  const assignItem = useAssignItemToDivision();
  const updateItemSet = useUpdateItemSet();
  const removeItem = useRemoveItemFromDivision();
  const toggleComingSoon = useToggleItemComingSoon();

  // Filter out items already assigned to this division
  const unassignedItems = availableItems?.filter(
    (item) => !item.cloud_kitchen_slot_id || item.cloud_kitchen_slot_id !== division.id
  );

  const handleAssignItem = async (item: CloudKitchenItem & { service_types: string[] | null }) => {
    await assignItem.mutateAsync({
      itemId: item.id,
      slotId: division.id,
      setSize,
      minOrderSets,
    });
    setSetSize(1);
    setMinOrderSets(1);
    setAddItemOpen(false);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;
    await updateItemSet.mutateAsync({
      itemId: selectedItem.id,
      setSize,
      minOrderSets,
    });
    setEditItemOpen(false);
    setSelectedItem(null);
  };

  const openEditDialog = (item: CloudKitchenItem) => {
    setSelectedItem(item);
    setSetSize(item.set_size || 1);
    setMinOrderSets(item.min_order_sets || 1);
    setEditItemOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{division.name}</h2>
          <p className="text-sm text-muted-foreground">
            {formatSlotTime(division.start_time)} - {formatSlotTime(division.end_time)}
          </p>
        </div>
        <Button className="ml-auto" onClick={() => setAddItemOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assigned Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : items?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No items assigned to this division yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Set Size</TableHead>
                  <TableHead>Min Sets</TableHead>
                  <TableHead>Total Min Qty</TableHead>
                  <TableHead>Coming Soon</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => {
                  const totalMinQty = (item.set_size || 1) * (item.min_order_sets || 1);
                  return (
                    <TableRow key={item.id} className={item.is_coming_soon ? 'bg-muted/40' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.is_vegetarian && (
                            <Leaf className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium">{item.name}</span>
                          {item.is_coming_soon && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>₹{item.price}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.set_size || 1} pcs/set</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.min_order_sets || 1} sets min</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{totalMinQty} pcs</span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_coming_soon}
                          onCheckedChange={(checked) =>
                            toggleComingSoon.mutate({ itemId: item.id, isComingSoon: checked })
                          }
                          disabled={toggleComingSoon.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Item to {division.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Set Size (pieces per set)</Label>
                <Input
                  type="number"
                  min="1"
                  value={setSize}
                  onChange={(e) => setSetSize(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Order Sets</Label>
                <Input
                  type="number"
                  min="1"
                  value={minOrderSets}
                  onChange={(e) => setMinOrderSets(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Customer will order minimum: {setSize * minOrderSets} pieces
            </p>

            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {unassignedItems?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No available items to add
                </p>
              ) : (
                unassignedItems?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {item.images?.[0]?.image_url && (
                        <img
                          src={item.images[0].image_url}
                          alt={item.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          {item.is_vegetarian && (
                            <Leaf className="h-3 w-3 text-green-600" />
                          )}
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">₹{item.price}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAssignItem(item)}
                      disabled={assignItem.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Set Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Set Configuration - {selectedItem?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Set Size (pieces per set)</Label>
              <Input
                type="number"
                min="1"
                value={setSize}
                onChange={(e) => setSetSize(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                e.g., 5 samosas per set
              </p>
            </div>

            <div className="space-y-2">
              <Label>Minimum Order Sets</Label>
              <Input
                type="number"
                min="1"
                value={minOrderSets}
                onChange={(e) => setMinOrderSets(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                e.g., minimum 3 sets required
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">
                Customer will order minimum: {setSize * minOrderSets} pieces
              </p>
              <p className="text-sm text-muted-foreground">
                ({minOrderSets} sets × {setSize} pieces/set)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updateItemSet.isPending}>
              {updateItemSet.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DivisionItemsManager;
