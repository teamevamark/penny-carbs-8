import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { useDeliveryRules, type DeliveryRuleInput, type DeliveryRule } from '@/hooks/useDeliveryRules';
import DeliveryRuleTiersManager from './DeliveryRuleTiersManager';

const DeliveryRulesTab: React.FC = () => {
  const { rules, isLoading, createRule, updateRule, deleteRule } = useDeliveryRules();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const [form, setForm] = useState<DeliveryRuleInput & { base_distance_km?: number }>({
    service_type: 'cloud_kitchen',
    rule_name: '',
    min_delivery_charge: 0,
    free_delivery_above: null,
    per_km_charge: null,
    max_delivery_charge: null,
    charge_above_threshold: null,
    is_active: true,
    base_distance_km: 5,
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
      base_distance_km: 5,
    });
    setEditingId(null);
  };

  const openCreate = () => { resetForm(); setIsDialogOpen(true); };

  const openEdit = (rule: DeliveryRule) => {
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
      base_distance_km: (rule as any).base_distance_km ?? 5,
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

  const handleToggleActive = (rule: DeliveryRule) => {
    updateRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const cloudRules = rules?.filter(r => r.service_type === 'cloud_kitchen') || [];
  const homemadeRules = rules?.filter(r => r.service_type === 'homemade') || [];

  const RuleCard = ({ rule }: { rule: DeliveryRule }) => (
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
              <span>Base Distance:</span>
              <span className="font-medium text-foreground">{(rule as any).base_distance_km ?? 5} km</span>
              {rule.per_km_charge != null && rule.per_km_charge > 0 && (
                <>
                  <span>Per KM (extra):</span>
                  <span className="font-medium text-foreground">₹{rule.per_km_charge}</span>
                </>
              )}
              {rule.max_delivery_charge != null && (
                <>
                  <span>Max Charge:</span>
                  <span className="font-medium text-foreground">₹{rule.max_delivery_charge}</span>
                </>
              )}
            </div>

            {/* Tiers summary */}
            {rule.tiers && rule.tiers.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Threshold Tiers:</p>
                {rule.tiers.map(tier => (
                  <p key={tier.id} className="text-xs text-muted-foreground">
                    Above ₹{tier.order_above} → {tier.delivery_charge === 0 ? <span className="text-green-600">Free</span> : `₹${tier.delivery_charge}`}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Switch checked={rule.is_active} onCheckedChange={() => handleToggleActive(rule)} />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirmId(rule.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {expandedRuleId === rule.id && (
          <div className="mt-4 border-t pt-4">
            <DeliveryRuleTiersManager ruleId={rule.id} tiers={rule.tiers || []} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const RuleSection = ({ title, items }: { title: string; items: DeliveryRule[] }) => (
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
          <p className="text-sm text-muted-foreground">Set delivery charges with multiple threshold tiers</p>
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
            <DialogDescription>Configure delivery charge for a specific service type</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[50vh] pr-4 overflow-y-auto">
            <div className="space-y-4 py-2 pb-6">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm(prev => ({ ...prev, service_type: v }))} disabled={!!editingId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloud_kitchen">Cloud Kitchen</SelectItem>
                    <SelectItem value="homemade">Home Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input placeholder="e.g. Standard Delivery" value={form.rule_name} onChange={(e) => setForm(prev => ({ ...prev, rule_name: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Minimum Delivery Charge (₹)</Label>
                <Input type="number" min="0" value={form.min_delivery_charge} onChange={(e) => setForm(prev => ({ ...prev, min_delivery_charge: Number(e.target.value) }))} />
              </div>

              <div className="space-y-2">
                <Label>Per KM Charge (₹) <span className="text-muted-foreground text-xs">Optional</span></Label>
                <Input type="number" min="0" placeholder="0" value={form.per_km_charge ?? ''} onChange={(e) => setForm(prev => ({ ...prev, per_km_charge: e.target.value ? Number(e.target.value) : null }))} />
              </div>

              <div className="space-y-2">
                <Label>Max Delivery Charge (₹) <span className="text-muted-foreground text-xs">Optional</span></Label>
                <Input type="number" min="0" placeholder="Leave empty for no cap" value={form.max_delivery_charge ?? ''} onChange={(e) => setForm(prev => ({ ...prev, max_delivery_charge: e.target.value ? Number(e.target.value) : null }))} />
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                💡 Use the <strong>+</strong> button on a rule card to add multiple threshold tiers (e.g. Above ₹300 → ₹30, Above ₹500 → ₹20, Above ₹1000 → Free).
              </p>
            </div>
          </ScrollArea>

          <Button className="w-full mt-2" onClick={handleSubmit} disabled={createRule.isPending || updateRule.isPending || !form.rule_name.trim()}>
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
            <DialogDescription>Are you sure? This will also delete all threshold tiers.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirmId) deleteRule.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) }); }} disabled={deleteRule.isPending}>
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
