import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, Truck, Phone, MapPin, CheckCircle, XCircle, 
  Bike, Car, Plus, Search, User, Loader2, X, Pencil, Trash2, Settings 
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { DeliveryStaff } from '@/types/delivery';

const vehicleIcons: Record<string, React.ReactNode> = {
  bicycle: <Bike className="h-4 w-4" />,
  motorcycle: <Bike className="h-4 w-4" />,
  scooter: <Bike className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
};

const AdminDeliveryStaff: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Add staff dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchMobile, setSearchMobile] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    user_id: string;
    name: string;
    mobile_number: string;
  }>>([]);
  const [selectedUser, setSelectedUser] = useState<{
    user_id: string;
    name: string;
    mobile_number: string;
  } | null>(null);
  const [newStaffData, setNewStaffData] = useState({
    vehicle_type: 'motorcycle',
    vehicle_number: '',
    staff_type: 'registered_partner' as 'fixed_salary' | 'registered_partner',
  });

  // Edit/Manage dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<DeliveryStaff | null>(null);
  const [editPanchayats, setEditPanchayats] = useState<string[]>([]);
  // Wards per panchayat: { panchayatId: [ward1, ward2, ...] }
  const [editWardsByPanchayat, setEditWardsByPanchayat] = useState<Record<string, number[]>>({});
  const [editVehicleType, setEditVehicleType] = useState('motorcycle');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editStaffType, setEditStaffType] = useState<'fixed_salary' | 'registered_partner'>('registered_partner');

  // Delete confirmation
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<DeliveryStaff | null>(null);

  // Fetch panchayats for selection
  const { data: panchayats } = useQuery({
    queryKey: ['panchayats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panchayats')
        .select('id, name, ward_count')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
  
  // Multi-panchayat selection for Add dialog
  const [selectedPanchayats, setSelectedPanchayats] = useState<string[]>([]);

  const togglePanchayat = (panchayatId: string) => {
    setSelectedPanchayats(prev => 
      prev.includes(panchayatId) 
        ? prev.filter(id => id !== panchayatId)
        : [...prev, panchayatId]
    );
  };

  // Edit dialog helpers
  const toggleEditPanchayat = (panchayatId: string) => {
    setEditPanchayats(prev => {
      if (prev.includes(panchayatId)) {
        // Remove panchayat and its wards
        setEditWardsByPanchayat(current => {
          const updated = { ...current };
          delete updated[panchayatId];
          return updated;
        });
        return prev.filter(id => id !== panchayatId);
      }
      // Add panchayat with empty wards
      setEditWardsByPanchayat(current => ({ ...current, [panchayatId]: [] }));
      return [...prev, panchayatId];
    });
  };

  const toggleEditWard = (panchayatId: string, ward: number) => {
    setEditWardsByPanchayat(prev => {
      const currentWards = prev[panchayatId] || [];
      const updatedWards = currentWards.includes(ward)
        ? currentWards.filter(w => w !== ward)
        : [...currentWards, ward];
      return { ...prev, [panchayatId]: updatedWards };
    });
  };

  const selectAllWardsForPanchayat = (panchayatId: string) => {
    const panchayat = panchayats?.find(p => p.id === panchayatId);
    if (panchayat) {
      const allWards = Array.from({ length: panchayat.ward_count || 25 }, (_, i) => i + 1);
      setEditWardsByPanchayat(prev => ({ ...prev, [panchayatId]: allWards }));
    }
  };

  const clearWardsForPanchayat = (panchayatId: string) => {
    setEditWardsByPanchayat(prev => ({ ...prev, [panchayatId]: [] }));
  };

  // Get flat array of all selected wards for saving
  const getAllSelectedWards = (): number[] => {
    const allWards = new Set<number>();
    Object.values(editWardsByPanchayat).forEach(wards => {
      wards.forEach(w => allWards.add(w));
    });
    return Array.from(allWards).sort((a, b) => a - b);
  };

  const openEditDialog = (staff: DeliveryStaff) => {
    setEditingStaff(staff);
    const assignedPanchayatIds = staff.assigned_panchayat_ids || [];
    setEditPanchayats(assignedPanchayatIds);
    
    // Initialize wards by panchayat - distribute existing wards across selected panchayats
    const wardsByPanchayat: Record<string, number[]> = {};
    const existingWards = staff.assigned_wards || [];
    
    assignedPanchayatIds.forEach(panchayatId => {
      const panchayat = panchayats?.find(p => p.id === panchayatId);
      if (panchayat) {
        // Filter wards that are valid for this panchayat
        const validWards = existingWards.filter(w => w <= (panchayat.ward_count || 25));
        wardsByPanchayat[panchayatId] = validWards;
      } else {
        wardsByPanchayat[panchayatId] = [];
      }
    });
    
    setEditWardsByPanchayat(wardsByPanchayat);
    setEditVehicleType(staff.vehicle_type);
    setEditVehicleNumber(staff.vehicle_number || '');
    setEditStaffType(staff.staff_type);
    setIsEditDialogOpen(true);
  };

  // Search users by mobile
  const handleSearchUsers = async () => {
    if (searchMobile.length < 4) {
      toast({ title: "Enter at least 4 digits", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .ilike('mobile_number', `%${searchMobile}%`)
        .limit(10);
      if (error) throw error;
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        toast({ title: "No users found", description: "Try a different mobile number" });
      }
    } catch (error) {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // Add delivery staff mutation (no ward selection)
  const addStaffMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error('No user selected');
      
      // Check if already a delivery staff
      const { data: existing } = await supabase
        .from('delivery_staff')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();
      
      if (existing) throw new Error('User is already registered as delivery staff');

      // Check if user is already a cook
      const { data: existingCook } = await supabase
        .from('cooks')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();
      
      if (existingCook) throw new Error('This user is already registered as cook. A user can only be cook OR delivery staff.');
      
      const { error } = await supabase
        .from('delivery_staff')
        .insert({
          user_id: selectedUser.user_id,
          name: selectedUser.name,
          mobile_number: selectedUser.mobile_number,
          vehicle_type: newStaffData.vehicle_type,
          vehicle_number: newStaffData.vehicle_number || null,
          staff_type: newStaffData.staff_type,
          panchayat_id: selectedPanchayats[0] || null,
          assigned_panchayat_ids: selectedPanchayats,
          assigned_wards: [], // No ward selection during creation
          is_approved: true,
          approved_at: new Date().toISOString(),
        });
      
      if (error) throw error;

      // Update user role to delivery_staff
      await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedUser.user_id,
          role: 'delivery_staff',
        }, { onConflict: 'user_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-approved'] });
      toast({ title: "Delivery staff added successfully" });
      setIsAddDialogOpen(false);
      resetAddForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    },
  });

  // Update delivery staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async () => {
      if (!editingStaff) throw new Error('No staff selected');
      
      const { error } = await supabase
        .from('delivery_staff')
        .update({
          vehicle_type: editVehicleType,
          vehicle_number: editVehicleNumber || null,
          staff_type: editStaffType,
          panchayat_id: editPanchayats[0] || null,
          assigned_panchayat_ids: editPanchayats,
          assigned_wards: getAllSelectedWards(),
        })
        .eq('id', editingStaff.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-approved'] });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-pending'] });
      toast({ title: "Staff updated successfully" });
      setIsEditDialogOpen(false);
      setEditingStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  // Delete delivery staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      // First get user_id to remove role
      const { data: staffData } = await supabase
        .from('delivery_staff')
        .select('user_id')
        .eq('id', staffId)
        .single();

      const { error } = await supabase
        .from('delivery_staff')
        .delete()
        .eq('id', staffId);
      
      if (error) throw error;

      // Remove delivery_staff role
      if (staffData?.user_id) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', staffData.user_id)
          .eq('role', 'delivery_staff');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-approved'] });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-pending'] });
      toast({ title: "Staff deleted successfully" });
      setDeleteConfirmStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const resetAddForm = () => {
    setSearchMobile('');
    setSearchResults([]);
    setSelectedUser(null);
    setNewStaffData({ vehicle_type: 'motorcycle', vehicle_number: '', staff_type: 'registered_partner' });
    setSelectedPanchayats([]);
  };

  const { data: pendingStaff, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-delivery-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_staff')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(staff => ({
        ...staff,
        assigned_panchayat_ids: staff.assigned_panchayat_ids || [],
        assigned_wards: staff.assigned_wards || [],
      })) as DeliveryStaff[];
    },
  });

  const { data: approvedStaff, isLoading: approvedLoading } = useQuery({
    queryKey: ['admin-delivery-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_staff')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(staff => ({
        ...staff,
        assigned_panchayat_ids: staff.assigned_panchayat_ids || [],
        assigned_wards: staff.assigned_wards || [],
      })) as DeliveryStaff[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ staffId, approve }: { staffId: string; approve: boolean }) => {
      if (approve) {
        const { error } = await supabase
          .from('delivery_staff')
          .update({
            is_approved: true,
            approved_at: new Date().toISOString(),
          })
          .eq('id', staffId);
        if (error) throw error;

        // Add delivery_staff role
        const { data: staff } = await supabase
          .from('delivery_staff')
          .select('user_id')
          .eq('id', staffId)
          .single();

        if (staff?.user_id) {
          await supabase
            .from('user_roles')
            .insert({
              user_id: staff.user_id,
              role: 'delivery_staff',
            });
        }
      } else {
        const { error } = await supabase
          .from('delivery_staff')
          .delete()
          .eq('id', staffId);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-approved'] });
      toast({
        title: variables.approve ? "Application Approved" : "Application Rejected",
        description: variables.approve 
          ? "Delivery partner can now accept orders" 
          : "Application has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process application",
        variant: "destructive",
      });
    },
  });

  const toggleStatus = async (staffId: string, isActive: boolean) => {
    try {
      await supabase
        .from('delivery_staff')
        .update({ is_active: !isActive })
        .eq('id', staffId);

      queryClient.invalidateQueries({ queryKey: ['admin-delivery-approved'] });
      toast({
        title: "Status Updated",
        description: `Staff ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const StaffCard = ({ staff, showActions = false, isPending = false }: { 
    staff: DeliveryStaff; 
    showActions?: boolean;
    isPending?: boolean;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{staff.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {staff.mobile_number}
              </p>
              {/* Show multiple panchayats or single panchayat */}
              {staff.assigned_panchayat_ids && staff.assigned_panchayat_ids.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {panchayats?.filter(p => staff.assigned_panchayat_ids.includes(p.id)).slice(0, 2).map((p, idx, arr) => (
                    <span key={p.id}>
                      {p.name}{idx < arr.length - 1 && ', '}
                    </span>
                  ))}
                  {staff.assigned_panchayat_ids.length > 2 && (
                    <span className="text-muted-foreground">+{staff.assigned_panchayat_ids.length - 2} more</span>
                  )}
                </div>
              ) : staff.panchayat && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {staff.panchayat.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={staff.staff_type === 'fixed_salary' ? 'default' : 'secondary'}>
              {staff.staff_type === 'fixed_salary' ? 'Fixed Salary' : 'Partner'}
            </Badge>
            {!isPending && (
              <Badge variant={staff.is_active ? "outline" : "destructive"}>
                {staff.is_active ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          {vehicleIcons[staff.vehicle_type] || <Truck className="h-4 w-4" />}
          <span className="capitalize">{staff.vehicle_type}</span>
          {staff.vehicle_number && <span>• {staff.vehicle_number}</span>}
        </div>

        {staff.assigned_wards.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Wards:</span>
            {staff.assigned_wards.slice(0, 5).map((ward) => (
              <Badge key={ward} variant="outline" className="text-xs">
                {ward}
              </Badge>
            ))}
            {staff.assigned_wards.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{staff.assigned_wards.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {showActions && isPending && (
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => approveMutation.mutate({ staffId: staff.id, approve: false })}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => approveMutation.mutate({ staffId: staff.id, approve: true })}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        )}

        {showActions && !isPending && (
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditDialog(staff)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Manage
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteConfirmStaff(staff)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={staff.is_active ? "secondary" : "default"}
              onClick={() => toggleStatus(staff.id, staff.is_active)}
            >
              {staff.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Delivery Staff</h1>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Delivery Staff</DialogTitle>
                <DialogDescription>Search by mobile number to add an existing user as delivery staff</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Search Section */}
                <div className="space-y-2">
                  <Label>Search User by Mobile</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter mobile number..."
                      value={searchMobile}
                      onChange={(e) => setSearchMobile(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    />
                    <Button onClick={handleSearchUsers} disabled={isSearching}>
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                      {searchResults.map((user) => (
                        <div
                          key={user.user_id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            selectedUser?.user_id === user.user_id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.mobile_number}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff Details */}
                {selectedUser && (
                  <>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">{selectedUser.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedUser.mobile_number}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Staff Type</Label>
                      <Select value={newStaffData.staff_type} onValueChange={(v) => setNewStaffData(prev => ({ ...prev, staff_type: v as 'fixed_salary' | 'registered_partner' }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registered_partner">Registered Partner</SelectItem>
                          <SelectItem value="fixed_salary">Fixed Salary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Vehicle Type</Label>
                      <Select value={newStaffData.vehicle_type} onValueChange={(v) => setNewStaffData(prev => ({ ...prev, vehicle_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bicycle">Bicycle</SelectItem>
                          <SelectItem value="motorcycle">Motorcycle</SelectItem>
                          <SelectItem value="scooter">Scooter</SelectItem>
                          <SelectItem value="car">Car</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Vehicle Number (Optional)</Label>
                      <Input
                        placeholder="KL-XX-XXXX"
                        value={newStaffData.vehicle_number}
                        onChange={(e) => setNewStaffData(prev => ({ ...prev, vehicle_number: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Panchayats (Select multiple)</Label>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                        {panchayats?.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => togglePanchayat(p.id)}
                          >
                            <Checkbox
                              checked={selectedPanchayats.includes(p.id)}
                              onCheckedChange={() => togglePanchayat(p.id)}
                            />
                            <span className="text-sm">{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">({p.ward_count} wards)</span>
                          </div>
                        ))}
                      </div>
                      {selectedPanchayats.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedPanchayats.map(pId => {
                            const p = panchayats?.find(x => x.id === pId);
                            return p ? (
                              <Badge key={pId} variant="secondary" className="flex items-center gap-1">
                                {p.name}
                                <X 
                                  className="h-3 w-3 cursor-pointer" 
                                  onClick={(e) => { e.stopPropagation(); togglePanchayat(pId); }}
                                />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Ward assignments can be configured after adding the staff.
                      </p>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => addStaffMutation.mutate()}
                      disabled={addStaffMutation.isPending}
                    >
                      {addStaffMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add as Delivery Staff
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Edit/Manage Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingStaff(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Delivery Staff</DialogTitle>
            <DialogDescription>
              Update staff details, panchayats, and ward assignments
            </DialogDescription>
          </DialogHeader>
          
          {editingStaff && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{editingStaff.name}</p>
                <p className="text-xs text-muted-foreground">{editingStaff.mobile_number}</p>
              </div>

              <div className="space-y-2">
                <Label>Staff Type</Label>
                <Select value={editStaffType} onValueChange={(v) => setEditStaffType(v as 'fixed_salary' | 'registered_partner')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered_partner">Registered Partner</SelectItem>
                    <SelectItem value="fixed_salary">Fixed Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select value={editVehicleType} onValueChange={setEditVehicleType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bicycle">Bicycle</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="scooter">Scooter</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vehicle Number (Optional)</Label>
                <Input
                  placeholder="KL-XX-XXXX"
                  value={editVehicleNumber}
                  onChange={(e) => setEditVehicleNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Panchayats (Select multiple)</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {panchayats?.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleEditPanchayat(p.id)}
                    >
                      <Checkbox
                        checked={editPanchayats.includes(p.id)}
                        onCheckedChange={() => toggleEditPanchayat(p.id)}
                      />
                      <span className="text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">({p.ward_count} wards)</span>
                    </div>
                  ))}
                </div>
                {editPanchayats.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editPanchayats.map(pId => {
                      const p = panchayats?.find(x => x.id === pId);
                      return p ? (
                        <Badge key={pId} variant="secondary" className="flex items-center gap-1">
                          {p.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={(e) => { e.stopPropagation(); toggleEditPanchayat(pId); }}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {editPanchayats.length > 0 && (
                <div className="space-y-4">
                  <Label>Ward Selection by Panchayat</Label>
                  {editPanchayats.map(panchayatId => {
                    const panchayat = panchayats?.find(p => p.id === panchayatId);
                    if (!panchayat) return null;
                    const wardCount = panchayat.ward_count || 25;
                    const selectedWards = editWardsByPanchayat[panchayatId] || [];
                    
                    return (
                      <div key={panchayatId} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{panchayat.name}</span>
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => selectAllWardsForPanchayat(panchayatId)}
                            >
                              All
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => clearWardsForPanchayat(panchayatId)}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-28 overflow-y-auto">
                          <div className="grid grid-cols-6 gap-1">
                            {Array.from({ length: wardCount }, (_, i) => i + 1).map(ward => (
                              <div
                                key={ward}
                                className={`flex items-center justify-center p-1.5 rounded cursor-pointer text-xs border transition-colors ${
                                  selectedWards.includes(ward) 
                                    ? 'bg-primary text-primary-foreground border-primary' 
                                    : 'hover:bg-muted border-border'
                                }`}
                                onClick={() => toggleEditWard(panchayatId, ward)}
                              >
                                {ward}
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedWards.length} ward(s) selected
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={() => updateStaffMutation.mutate()}
                disabled={updateStaffMutation.isPending}
              >
                {updateStaffMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmStaff} onOpenChange={(open) => { if (!open) setDeleteConfirmStaff(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Delivery Staff</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirmStaff?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmStaff(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmStaff && deleteStaffMutation.mutate(deleteConfirmStaff.id)}
              disabled={deleteStaffMutation.isPending}
            >
              {deleteStaffMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="container px-4 py-4">
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingStaff && pendingStaff.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {pendingStaff.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pendingLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)
            ) : pendingStaff && pendingStaff.length > 0 ? (
              pendingStaff.map((staff) => (
                <StaffCard key={staff.id} staff={staff} showActions isPending />
              ))
            ) : (
              <Card className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground">No pending applications</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3">
            {approvedLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)
            ) : approvedStaff && approvedStaff.length > 0 ? (
              approvedStaff.map((staff) => (
                <StaffCard key={staff.id} staff={staff} showActions />
              ))
            ) : (
              <Card className="p-6 text-center">
                <Truck className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No approved delivery staff</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDeliveryStaff;
