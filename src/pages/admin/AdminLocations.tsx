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
import { ArrowLeft, Plus, Edit2, Trash2, MapPin } from 'lucide-react';
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

  const isAdmin = role === 'super_admin' || role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-semibold">Locations</h1>
          </div>
          <Button size="sm" onClick={() => handleOpenPanchayatDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Panchayat
          </Button>
        </div>
      </header>

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
