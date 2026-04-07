import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryRuleTier {
  id: string;
  rule_id: string;
  order_above: number;
  delivery_charge: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRule {
  id: string;
  service_type: string;
  rule_name: string;
  min_delivery_charge: number;
  free_delivery_above: number | null;
  per_km_charge: number | null;
  max_delivery_charge: number | null;
  charge_above_threshold: number | null;
  base_distance_km: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tiers?: DeliveryRuleTier[];
}

export interface DeliveryRuleInput {
  service_type: string;
  rule_name: string;
  min_delivery_charge: number;
  free_delivery_above?: number | null;
  per_km_charge?: number | null;
  max_delivery_charge?: number | null;
  charge_above_threshold?: number | null;
  base_distance_km?: number;
  is_active?: boolean;
}

export interface DeliveryRuleTierInput {
  rule_id: string;
  order_above: number;
  delivery_charge: number;
  display_order: number;
}

export const useDeliveryRules = (serviceType?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules, isLoading, error } = useQuery({
    queryKey: ['delivery-rules', serviceType],
    queryFn: async () => {
      let query = supabase
        .from('delivery_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (serviceType) {
        query = query.eq('service_type', serviceType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch tiers for all rules
      const ruleIds = (data || []).map((r: any) => r.id);
      let tiers: any[] = [];
      if (ruleIds.length > 0) {
        const { data: tierData, error: tierError } = await supabase
          .from('delivery_rule_tiers')
          .select('*')
          .in('rule_id', ruleIds)
          .order('order_above', { ascending: true });
        if (tierError) throw tierError;
        tiers = tierData || [];
      }

      return (data || []).map((rule: any) => ({
        ...rule,
        tiers: tiers.filter((t: any) => t.rule_id === rule.id),
      })) as DeliveryRule[];
    },
  });

  const createRule = useMutation({
    mutationFn: async (rule: DeliveryRuleInput) => {
      const { data, error } = await supabase
        .from('delivery_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rules'] });
      toast({ title: 'Rule Created', description: 'Delivery rule has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryRule> & { id: string }) => {
      const { tiers, ...ruleUpdates } = updates;
      const { data, error } = await supabase
        .from('delivery_rules')
        .update(ruleUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rules'] });
      toast({ title: 'Rule Updated', description: 'Delivery rule has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rules'] });
      toast({ title: 'Rule Deleted', description: 'Delivery rule has been deleted successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Tier mutations
  const addTier = useMutation({
    mutationFn: async (tier: DeliveryRuleTierInput) => {
      const { data, error } = await supabase
        .from('delivery_rule_tiers')
        .insert(tier)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rules'] });
      toast({ title: 'Tier Added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateTier = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryRuleTier> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_rule_tiers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rules'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_rule_tiers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rules'] });
      toast({ title: 'Tier Removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { rules, isLoading, error, createRule, updateRule, deleteRule, addTier, updateTier, deleteTier };
};
