import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ChefHat, Truck } from 'lucide-react';
import { toast } from 'sonner';
import UsersFilters from '@/components/admin/users/UsersFilters';
import CustomersTable from '@/components/admin/users/CustomersTable';
import CooksTable from '@/components/admin/users/CooksTable';
import DeliveryStaffTable from '@/components/admin/users/DeliveryStaffTable';
import EditUserDialog from '@/components/admin/users/EditUserDialog';
import DeleteUserDialog from '@/components/admin/users/DeleteUserDialog';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('customers');
  const [selectedPanchayat, setSelectedPanchayat] = useState('all');
  
  // Edit/Delete dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserType, setSelectedUserType] = useState<'customer' | 'cook' | 'delivery'>('customer');

  // Fetch panchayats
  const { data: panchayats = [] } = useQuery({
    queryKey: ['panchayats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panchayats')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch customers (profiles)
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, panchayats(name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch cooks
  const { data: cooks = [], isLoading: cooksLoading } = useQuery({
    queryKey: ['admin-cooks-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooks')
        .select(`*, panchayats(name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch delivery staff
  const { data: deliveryStaff = [], isLoading: deliveryLoading } = useQuery({
    queryKey: ['admin-delivery-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_staff')
        .select(`*, panchayats(name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Mutations
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          mobile_number: data.mobile_number,
          panchayat_id: data.panchayat_id,
          is_active: data.is_active,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Customer updated successfully');
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update customer: ' + error.message);
    }
  });

  const updateCookMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('cooks')
        .update({
          kitchen_name: data.kitchen_name,
          mobile_number: data.mobile_number,
          panchayat_id: data.panchayat_id,
          is_active: data.is_active,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cooks-list'] });
      toast.success('Cook updated successfully');
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update cook: ' + error.message);
    }
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('delivery_staff')
        .update({
          name: data.name,
          mobile_number: data.mobile_number,
          vehicle_type: data.vehicle_type,
          panchayat_id: data.panchayat_id,
          is_active: data.is_active,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-list'] });
      toast.success('Delivery staff updated successfully');
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update delivery staff: ' + error.message);
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Customer deleted successfully');
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to delete customer: ' + error.message);
    }
  });

  const deleteCookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cooks')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cooks-list'] });
      toast.success('Cook deleted successfully');
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to delete cook: ' + error.message);
    }
  });

  const deleteDeliveryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_staff')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-list'] });
      toast.success('Delivery staff deleted successfully');
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to delete delivery staff: ' + error.message);
    }
  });

  // Filter functions
  const filterBySearch = (items: any[], nameKey: string) => {
    return items.filter(item =>
      item[nameKey]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mobile_number?.includes(searchTerm)
    );
  };

  const filterByPanchayat = (items: any[]) => {
    if (selectedPanchayat === 'all') return items;
    return items.filter(item => item.panchayat_id === selectedPanchayat);
  };

  const filteredCustomers = useMemo(() => {
    return filterByPanchayat(filterBySearch(customers, 'name'));
  }, [customers, searchTerm, selectedPanchayat]);

  const filteredCooks = useMemo(() => {
    return filterByPanchayat(filterBySearch(cooks, 'kitchen_name'));
  }, [cooks, searchTerm, selectedPanchayat]);

  const filteredDelivery = useMemo(() => {
    return filterByPanchayat(filterBySearch(deliveryStaff, 'name'));
  }, [deliveryStaff, searchTerm, selectedPanchayat]);

  // Handlers
  const handleEdit = (user: any, type: 'customer' | 'cook' | 'delivery') => {
    setSelectedUser(user);
    setSelectedUserType(type);
    setEditDialogOpen(true);
  };

  const handleDelete = (user: any, type: 'customer' | 'cook' | 'delivery') => {
    setSelectedUser(user);
    setSelectedUserType(type);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = async (user: any, type: 'customer' | 'cook' | 'delivery') => {
    const newStatus = !user.is_active;
    const mutation = type === 'customer' 
      ? updateCustomerMutation 
      : type === 'cook' 
        ? updateCookMutation 
        : updateDeliveryMutation;
    
    mutation.mutate({ ...user, is_active: newStatus });
  };

  const handleSaveEdit = (data: any) => {
    switch (selectedUserType) {
      case 'customer':
        updateCustomerMutation.mutate(data);
        break;
      case 'cook':
        updateCookMutation.mutate(data);
        break;
      case 'delivery':
        updateDeliveryMutation.mutate(data);
        break;
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedUser) return;
    switch (selectedUserType) {
      case 'customer':
        deleteCustomerMutation.mutate(selectedUser.id);
        break;
      case 'cook':
        deleteCookMutation.mutate(selectedUser.id);
        break;
      case 'delivery':
        deleteDeliveryMutation.mutate(selectedUser.id);
        break;
    }
  };

  // Export functions
  const getExportData = () => {
    switch (activeTab) {
      case 'customers':
        return filteredCustomers.map(c => ({
          Name: c.name,
          Mobile: c.mobile_number,
          Panchayat: c.panchayats?.name || '-',
          Ward: c.ward_number || '-',
          Status: c.is_active ? 'Active' : 'Inactive',
        }));
      case 'cooks':
        return filteredCooks.map(c => ({
          'Kitchen Name': c.kitchen_name,
          Mobile: c.mobile_number,
          Panchayat: c.panchayats?.name || '-',
          Rating: c.rating?.toFixed(1) || '0.0',
          Orders: c.total_orders || 0,
          Status: c.is_active ? 'Active' : 'Inactive',
          Available: c.is_available ? 'Yes' : 'No',
        }));
      case 'delivery':
        return filteredDelivery.map(d => ({
          Name: d.name,
          Mobile: d.mobile_number,
          Panchayat: d.panchayats?.name || '-',
          Vehicle: d.vehicle_type,
          Deliveries: d.total_deliveries || 0,
          Approved: d.is_approved ? 'Yes' : 'No',
          Available: d.is_available ? 'Yes' : 'No',
        }));
      default:
        return [];
    }
  };

  const handleExportCSV = () => {
    const data = getExportData();
    const filename = `${activeTab}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(data, filename);
    toast.success(`Exported ${data.length} records to CSV`);
  };

  const handleExportExcel = () => {
    const data = getExportData();
    const filename = `${activeTab}_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(data, filename);
    toast.success(`Exported ${data.length} records to Excel`);
  };

  const getUserName = () => {
    if (!selectedUser) return '';
    switch (selectedUserType) {
      case 'customer':
        return selectedUser.name;
      case 'cook':
        return selectedUser.kitchen_name;
      case 'delivery':
        return selectedUser.name;
      default:
        return '';
    }
  };

  return (
    <div className="bg-background pb-6">

      <main className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>
        
        <UsersFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          panchayats={panchayats}
          selectedPanchayat={selectedPanchayat}
          onPanchayatChange={setSelectedPanchayat}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customers" className="gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="cooks" className="gap-2">
              <ChefHat className="h-4 w-4" />
              Cooks
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              <Truck className="h-4 w-4" />
              Delivery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomersTable
                  customers={filteredCustomers}
                  isLoading={customersLoading}
                  onEdit={(c) => handleEdit(c, 'customer')}
                  onDelete={(c) => handleDelete(c, 'customer')}
                  onToggleActive={(c) => handleToggleActive(c, 'customer')}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cooks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Food Partners ({filteredCooks.length})</span>
                  <Button size="sm" onClick={() => navigate('/admin/cooks')}>
                    Manage Cooks
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CooksTable
                  cooks={filteredCooks}
                  isLoading={cooksLoading}
                  onEdit={(c) => handleEdit(c, 'cook')}
                  onDelete={(c) => handleDelete(c, 'cook')}
                  onToggleActive={(c) => handleToggleActive(c, 'cook')}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Delivery Staff ({filteredDelivery.length})</span>
                  <Button size="sm" onClick={() => navigate('/admin/delivery-staff')}>
                    Manage Staff
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryStaffTable
                  deliveryStaff={filteredDelivery}
                  isLoading={deliveryLoading}
                  onEdit={(d) => handleEdit(d, 'delivery')}
                  onDelete={(d) => handleDelete(d, 'delivery')}
                  onToggleActive={(d) => handleToggleActive(d, 'delivery')}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        userType={selectedUserType}
        user={selectedUser}
        panchayats={panchayats}
        onSave={handleSaveEdit}
        isLoading={
          updateCustomerMutation.isPending ||
          updateCookMutation.isPending ||
          updateDeliveryMutation.isPending
        }
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userName={getUserName()}
        userType={selectedUserType}
        onConfirm={handleConfirmDelete}
        isLoading={
          deleteCustomerMutation.isPending ||
          deleteCookMutation.isPending ||
          deleteDeliveryMutation.isPending
        }
      />
    </div>
  );
};

export default AdminUsers;
