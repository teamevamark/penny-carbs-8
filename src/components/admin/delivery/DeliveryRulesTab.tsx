import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Truck, Loader2 } from 'lucide-react';
import { useDeliveryRules, type DeliveryRuleInput } from '@/hooks/useDeliveryRules';

const SERVICE_LABELS: Record<string, string> = {
  cloud_kitchen: 'Cloud Kitchen',
  homemade: 'Home Delivery',
};

const DeliveryRulesTab: React.FC = () => {
  const { rules, isLoading, createRule, updateRule, deleteRule } = useDeliveryRules();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState<DeliveryRuleInput>({
    service_type: 'cloud_kitchen',
    rule_name: '',
    min_delivery_charge: 0,
    free_delivery_above: null,
    per_km_charge: null,
    max_delivery_charge: null,
    charge_above_threshold: null,
    is_active: true,
  });

  const resetForm = () => {
    setForm({
      service_type: 'cloud_kitchen',
      rule_name: '',
      min_delivery_charge: 0,
      free_delivery_above: null,
      per_km_charge: null,
      max_delivery_charge: null,
      charge_above_threshold: null,
      is_active: true,
    });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (rule: any) => {
    setEditingId(rule.id);
    setForm({
      service_type: rule.service_type,
      rule_name: rule.rule_name,
      min_delivery_charge: rule.min_delivery_charge,
      free_delivery_above: rule.free_delivery_above,
      per_km_charge: rule.per_km_charge,
      max_delivery_charge: rule.max_delivery_charge,
      charge_above_threshold: rule.charge_above_threshold,
      is_active: rule.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.rule_name.trim()) return;
    if (editingId) {
      updateRule.mutate({ id: editingId, ...form }, {
        onSuccess: () => { setIsDialogOpen(false); resetForm(); },
      });
    } else {
      createRule.mutate(form, {
        onSuccess: () => { setIsDialogOpen(false); resetForm(); },
      });
    }
  };

  const handleToggleActive = (rule: any) => {
    updateRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const cloudRules = rules?.filter(r => r.service_type === 'cloud_kitchen') || [];
  const homemadeRules = rules?.filter(r => r.service_type === 'homemade') || [];

  const RuleCard = ({ rule }: { rule: any }) => (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{rule.rule_name}</h4>
              <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-xs">
                {rule.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Min Charge:</span>
              <span className="font-medium text-foreground">₹{rule.min_delivery_charge}</span>
              {rule.free_delivery_above != null && (
                <>
                  <span>Free Above:</span>
                  <span className="font-medium text-foreground">₹{rule.free_delivery_above}</span>
                </>
              )}
              {rule.per_km_charge != null && rule.per_km_charge > 0 && (
                <>
                  <span>Per KM:</span>
                  <span className="font-medium text-foreground">₹{rule.per_km_charge}</span>
                </>
              )}
              {rule.max_delivery_charge != null && (
                <>
                  <span>Max Charge:</span>
                  <span className="font-medium text-foreground">₹{rule.max_delivery_charge}</span>
                </>
              )}
              {rule.charge_above_threshold != null && rule.free_delivery_above != null && (
                <>
                  <span>Charge Above ₹{rule.free_delivery_above}:</span>
                  <span className="font-medium text-foreground">₹{rule.charge_above_threshold}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Switch
              checked={rule.is_active}
              onCheckedChange={() => handleToggleActive(rule)}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirmId(rule.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RuleSection = ({ title, items }: { title: string; items: any[] }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      {items.length > 0 ? (
        items.map(rule => <RuleCard key={rule.id} rule={rule} />)
      ) : (
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">No rules configured yet</p>
        </Card>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Charge Rules
          </h2>
          <p className="text-sm text-muted-foreground">Set minimum delivery charges for Cloud Kitchen & Home Delivery</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Rule
        </Button>
      </div>

      <RuleSection title="Cloud Kitchen" items={cloudRules} />
      <RuleSection title="Home Delivery (Homemade)" items={homemadeRules} />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} Delivery Rule</DialogTitle>
            <DialogDescription>
              Configure delivery charge for a specific service type
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[50vh] pr-4 overflow-y-auto">
            <div className="space-y-4 py-2 pb-6">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select
                  value={form.service_type}
                  onValueChange={(v) => setForm(prev => ({ ...prev, service_type: v }))}
                  disabled={!!editingId}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloud_kitchen">Cloud Kitchen</SelectItem>
                    <SelectItem value="homemade">Home Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input
                  placeholder="e.g. Standard Delivery"
                  value={form.rule_name}
                  onChange={(e) => setForm(prev => ({ ...prev, rule_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Delivery Charge (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.min_delivery_charge}
                  onChange={(e) => setForm(prev => ({ ...prev, min_delivery_charge: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Free Delivery Above (₹) <span className="text-muted-foreground text-xs">Optional</span></Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Leave empty if not applicable"
                  value={form.free_delivery_above ?? ''}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    free_delivery_above: e.target.value ? Number(e.target.value) : null,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Per KM Charge (₹) <span className="text-muted-foreground text-xs">Optional</span></Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.per_km_charge ?? ''}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    per_km_charge: e.target.value ? Number(e.target.value) : null,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Delivery Charge (₹) <span className="text-muted-foreground text-xs">Optional</span></Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Leave empty for no cap"
                  value={form.max_delivery_charge ?? ''}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    max_delivery_charge: e.target.value ? Number(e.target.value) : null,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Reduced Delivery Charge Above Threshold <span className="text-muted-foreground text-xs">Optional</span></Label>
                <p className="text-xs text-muted-foreground">
                  When order amount exceeds the "above" amount, apply the reduced delivery charge instead of min charge.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Order Above (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 500"
                      value={form.free_delivery_above ?? ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        free_delivery_above: e.target.value ? Number(e.target.value) : null,
                      }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Delivery Charge (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 20"
                      value={form.charge_above_threshold ?? ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        charge_above_threshold: e.target.value ? Number(e.target.value) : null,
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <Button
            className="w-full mt-2"
            onClick={handleSubmit}
            disabled={createRule.isPending || updateRule.isPending || !form.rule_name.trim()}
          >
            {(createRule.isPending || updateRule.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingId ? 'Save Changes' : 'Create Rule'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>Are you sure you want to delete this delivery rule? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteRule.mutate(deleteConfirmId, {
                    onSuccess: () => setDeleteConfirmId(null),
                  });
                }
              }}
              disabled={deleteRule.isPending}
            >
              {deleteRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryRulesTab;
