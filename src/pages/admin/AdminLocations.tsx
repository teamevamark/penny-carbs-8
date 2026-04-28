import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Panchayat } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit2, Trash2, MapPin, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminLocations: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const [panchayats, setPanchayats] = useState<Panchayat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Panchayat Dialog
  const [isPanchayatDialogOpen, setIsPanchayatDialogOpen] = useState(false);
  const [editingPanchayat, setEditingPanchayat] = useState<Panchayat | null>(null);
  const [panchayatFormData, setPanchayatFormData] = useState({ name: '', code: '', ward_count: '25' });

  // Google Maps API Keys
  type GMapsKey = {
    id: string;
    label: string;
    api_key: string;
    is_active: boolean;
    last_four: string | null;
    created_at: string;
  };
  const [gmapsKeys, setGmapsKeys] = useState<GMapsKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<GMapsKey | null>(null);
  const [keyFormData, setKeyFormData] = useState({ label: '', api_key: '' });
  const [showKeyValue, setShowKeyValue] = useState(false);

  const isAdmin = role === 'super_admin' || role === 'admin';
  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    fetchData();
    if (isSuperAdmin) {
      fetchGmapsKeys();
    } else {
      setIsLoadingKeys(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('panchayats')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setPanchayats(data as Panchayat[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Google Maps Keys =====
  const fetchGmapsKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const { data, error } = await supabase
        .from('google_maps_api_keys')
        .select('id, label, api_key, is_active, last_four, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGmapsKeys((data || []) as GMapsKey[]);
    } catch (err: any) {
      console.error('Error fetching gmaps keys:', err);
      toast({ title: 'Failed to load Google Maps keys', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleOpenKeyDialog = (key?: GMapsKey) => {
    if (key) {
      setEditingKey(key);
      setKeyFormData({ label: key.label, api_key: '' });
    } else {
      setEditingKey(null);
      setKeyFormData({ label: '', api_key: '' });
    }
    setShowKeyValue(false);
    setIsKeyDialogOpen(true);
  };

  const handleSaveKey = async () => {
    if (!keyFormData.label.trim()) {
      toast({ title: 'Label is required', variant: 'destructive' });
      return;
    }
    if (!editingKey && !keyFormData.api_key.trim()) {
      toast({ title: 'API key is required', variant: 'destructive' });
      return;
    }
    try {
      if (editingKey) {
        const update: Record<string, any> = { label: keyFormData.label.trim() };
        if (keyFormData.api_key.trim()) {
          update.api_key = keyFormData.api_key.trim();
          update.last_four = keyFormData.api_key.trim().slice(-4);
        }
        const { error } = await supabase
          .from('google_maps_api_keys')
          .update(update)
          .eq('id', editingKey.id);
        if (error) throw error;
        toast({ title: 'API key updated' });
      } else {
        const trimmed = keyFormData.api_key.trim();
        const { error } = await supabase
          .from('google_maps_api_keys')
          .insert({
            label: keyFormData.label.trim(),
            api_key: trimmed,
            last_four: trimmed.slice(-4),
            is_active: true,
          });
        if (error) throw error;
        toast({ title: 'API key added' });
      }
      setIsKeyDialogOpen(false);
      fetchGmapsKeys();
    } catch (err: any) {
      console.error('Error saving gmaps key:', err);
      toast({ title: 'Failed to save key', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleKeyActive = async (key: GMapsKey, checked: boolean) => {
    try {
      const { error } = await supabase
        .from('google_maps_api_keys')
        .update({ is_active: checked })
        .eq('id', key.id);
      if (error) throw error;
      toast({ title: checked ? 'Key activated' : 'Key deactivated' });
      fetchGmapsKeys();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteKey = async (key: GMapsKey) => {
    if (!confirm(`Delete key "${key.label}"?`)) return;
    try {
      const { error } = await supabase
        .from('google_maps_api_keys')
        .delete()
        .eq('id', key.id);
      if (error) throw error;
      toast({ title: 'Key deleted' });
      fetchGmapsKeys();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Panchayat handlers
  const handleOpenPanchayatDialog = (panchayat?: Panchayat) => {
    if (panchayat) {
      setEditingPanchayat(panchayat);
      setPanchayatFormData({ 
        name: panchayat.name, 
        code: panchayat.code || '',
        ward_count: panchayat.ward_count.toString()
      });
    } else {
      setEditingPanchayat(null);
      setPanchayatFormData({ name: '', code: '', ward_count: '25' });
    }
    setIsPanchayatDialogOpen(true);
  };

  const handleSavePanchayat = async () => {
    if (!panchayatFormData.name) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    const wardCount = parseInt(panchayatFormData.ward_count, 10);
    if (isNaN(wardCount) || wardCount < 1) {
      toast({ title: 'Ward count must be at least 1', variant: 'destructive' });
      return;
    }

    try {
      if (editingPanchayat) {
        const { error } = await supabase
          .from('panchayats')
          .update({ 
            name: panchayatFormData.name, 
            code: panchayatFormData.code || null,
            ward_count: wardCount
          })
          .eq('id', editingPanchayat.id);

        if (error) throw error;
        toast({ title: 'Panchayat updated' });
      } else {
        const { error } = await supabase
          .from('panchayats')
          .insert({ 
            name: panchayatFormData.name, 
            code: panchayatFormData.code || null,
            ward_count: wardCount
          });

        if (error) throw error;
        toast({ title: 'Panchayat created' });
      }

      setIsPanchayatDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving panchayat:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (panchayat: Panchayat, checked: boolean) => {
    try {
      const { error } = await supabase
        .from('panchayats')
        .update({ is_active: checked })
        .eq('id', panchayat.id);

      if (error) throw error;
      toast({ title: checked ? 'Panchayat activated' : 'Panchayat deactivated' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeletePanchayat = async (panchayat: Panchayat) => {
    if (!confirm(`Delete "${panchayat.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('panchayats')
        .delete()
        .eq('id', panchayat.id);

      if (error) throw error;
      toast({ title: 'Panchayat deleted' });
      fetchData();
    } catch (error) {
      console.error('Error deleting panchayat:', error);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Access Denied</p>
      </div>
    );
  }

  return (
    <div className="bg-background pb-6">
      {/* Page Header */}
      <div className="border-b bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold">Locations</h1>
          <Button size="sm" onClick={() => handleOpenPanchayatDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Panchayat
          </Button>
        </div>
      </div>

      <main className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : panchayats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <MapPin className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No locations yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add panchayats to get started
            </p>
            <Button className="mt-4" onClick={() => handleOpenPanchayatDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Panchayat
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {panchayats.map((panchayat) => (
              <Card key={panchayat.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{panchayat.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {panchayat.ward_count} wards (1 to {panchayat.ward_count})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={panchayat.is_active}
                      onCheckedChange={(checked) => handleToggleActive(panchayat, checked)}
                    />
                    <Badge variant={panchayat.is_active ? 'default' : 'secondary'}>
                      {panchayat.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenPanchayatDialog(panchayat)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDeletePanchayat(panchayat)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Panchayat Dialog */}
      <Dialog open={isPanchayatDialogOpen} onOpenChange={setIsPanchayatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPanchayat ? 'Edit Panchayat' : 'Add Panchayat'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="panchayat-name">Name *</Label>
              <Input
                id="panchayat-name"
                value={panchayatFormData.name}
                onChange={(e) => setPanchayatFormData({ ...panchayatFormData, name: e.target.value })}
                placeholder="Enter panchayat name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panchayat-code">Code (optional)</Label>
              <Input
                id="panchayat-code"
                value={panchayatFormData.code}
                onChange={(e) => setPanchayatFormData({ ...panchayatFormData, code: e.target.value })}
                placeholder="e.g., PNC001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward-count">Number of Wards *</Label>
              <Input
                id="ward-count"
                type="number"
                min="1"
                value={panchayatFormData.ward_count}
                onChange={(e) => setPanchayatFormData({ ...panchayatFormData, ward_count: e.target.value })}
                placeholder="e.g., 25"
              />
              <p className="text-xs text-muted-foreground">
                This will create wards numbered 1 to {panchayatFormData.ward_count || '0'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPanchayatDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePanchayat}>
              {editingPanchayat ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLocations;
