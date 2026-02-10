import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  Shield,
  ShieldCheck,
  Loader2,
  UserSearch
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AdminNavbar from '@/components/admin/AdminNavbar';

interface AdminUser {
  id: string;
  user_id: string;
  perm_items: string;
  perm_orders: string;
  perm_assign_orders: string;
  perm_cooks: string;
  perm_delivery_staff: string;
  perm_reports: string;
  perm_settlements: string;
  perm_banners: string;
  perm_categories: string;
  perm_locations: string;
  perm_special_offers: string;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string;
    mobile_number: string;
  };
}

interface SearchedUser {
  user_id: string;
  name: string;
  mobile_number: string;
}

const AdminAdmins: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  
  // User search state
  const [mobileSearch, setMobileSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  
  const [formData, setFormData] = useState({
    user_id: '',
    perm_items: 'none',
    perm_orders: 'none',
    perm_assign_orders: 'none',
    perm_cooks: 'none',
    perm_delivery_staff: 'none',
    perm_reports: 'none',
    perm_settlements: 'none',
  });

  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each admin
      const adminIds = data?.map(a => a.user_id) || [];
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, mobile_number')
          .in('user_id', adminIds);

        const adminsWithProfiles = data?.map(admin => ({
          ...admin,
          profile: profiles?.find(p => p.user_id === admin.user_id)
        })) || [];

        setAdmins(adminsWithProfiles);
      } else {
        setAdmins([]);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch admin users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByMobile = async () => {
    if (!mobileSearch.trim() || mobileSearch.length < 3) {
      toast({
        title: 'Enter Mobile Number',
        description: 'Please enter at least 3 digits to search',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedUser(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .ilike('mobile_number', `%${mobileSearch}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
      
      if (data?.length === 0) {
        toast({
          title: 'No Users Found',
          description: 'No users found with that mobile number',
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: SearchedUser) => {
    setSelectedUser(user);
    setFormData(prev => ({ ...prev, user_id: user.user_id }));
    setSearchResults([]);
  };

  const handleOpenDialog = (admin?: AdminUser) => {
    if (admin) {
      setEditingAdmin(admin);
      setSelectedUser(admin.profile ? {
        user_id: admin.user_id,
        name: admin.profile.name,
        mobile_number: admin.profile.mobile_number,
      } : null);
      setFormData({
        user_id: admin.user_id,
        perm_items: admin.perm_items,
        perm_orders: admin.perm_orders,
        perm_assign_orders: admin.perm_assign_orders,
        perm_cooks: admin.perm_cooks,
        perm_delivery_staff: admin.perm_delivery_staff,
        perm_reports: admin.perm_reports,
        perm_settlements: admin.perm_settlements,
      });
    } else {
      setEditingAdmin(null);
      setSelectedUser(null);
      setMobileSearch('');
      setSearchResults([]);
      setFormData({
        user_id: '',
        perm_items: 'none',
        perm_orders: 'none',
        perm_assign_orders: 'none',
        perm_cooks: 'none',
        perm_delivery_staff: 'none',
        perm_reports: 'none',
        perm_settlements: 'none',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveAdmin = async () => {
    if (!formData.user_id) {
      toast({
        title: 'Validation Error',
        description: 'User ID is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const permissionData = {
        user_id: formData.user_id,
        perm_items: formData.perm_items,
        perm_orders: formData.perm_orders,
        perm_assign_orders: formData.perm_assign_orders,
        perm_cooks: formData.perm_cooks,
        perm_delivery_staff: formData.perm_delivery_staff,
        perm_reports: formData.perm_reports,
        perm_settlements: formData.perm_settlements,
      };

      if (editingAdmin) {
        const { error } = await supabase
          .from('admin_permissions')
          .update(permissionData)
          .eq('id', editingAdmin.id);

        if (error) throw error;
        toast({ title: 'Admin permissions updated' });
      } else {
        // First, add admin role to user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: formData.user_id, role: 'admin' });

        if (roleError && !roleError.message.includes('duplicate')) {
          throw roleError;
        }

        // Then add permissions
        const { error } = await supabase
          .from('admin_permissions')
          .insert(permissionData);

        if (error) throw error;
        toast({ title: 'Admin added successfully' });
      }

      setIsDialogOpen(false);
      fetchAdmins();
    } catch (error) {
      console.error('Error saving admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to save admin',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!confirm(`Are you sure you want to remove admin permissions for this user?`)) return;

    try {
      const { error } = await supabase
        .from('admin_permissions')
        .delete()
        .eq('id', admin.id);

      if (error) throw error;

      // Also remove admin role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', admin.user_id)
        .eq('role', 'admin');

      setAdmins(prev => prev.filter(a => a.id !== admin.id));
      toast({ title: 'Admin removed successfully' });
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove admin',
        variant: 'destructive',
      });
    }
  };

  // Filter admins
  const filteredAdmins = admins.filter(admin => {
    const name = admin.profile?.name?.toLowerCase() || '';
    const mobile = admin.profile?.mobile_number || '';
    return name.includes(searchQuery.toLowerCase()) || mobile.includes(searchQuery);
  });

  const permissionLabels = [
    { key: 'perm_items', label: 'Manage Items' },
    { key: 'perm_orders', label: 'Manage Orders' },
    { key: 'perm_assign_orders', label: 'Assign Orders' },
    { key: 'perm_cooks', label: 'Register Cooks' },
    { key: 'perm_delivery_staff', label: 'Register Delivery Staff' },
    { key: 'perm_reports', label: 'Access Reports' },
    { key: 'perm_settlements', label: 'Approve Settlements' },
  ];

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Access Denied - Super Admin Only</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />

      {/* Page Header */}
      <div className="border-b bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Admin Management</h2>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Admin
          </Button>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <main className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Shield className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No admins found</h2>
            <p className="text-sm text-muted-foreground">Add admin users to help manage the platform</p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Admin
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAdmins.map((admin) => (
              <Card key={admin.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {admin.profile?.name || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {admin.profile?.mobile_number || admin.user_id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenDialog(admin)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteAdmin(admin)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {permissionLabels.map(({ key, label }) => (
                      admin[key as keyof AdminUser] !== 'none' && admin[key as keyof AdminUser] && (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAdmin ? 'Edit Admin Permissions' : 'Add New Admin'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!editingAdmin && (
              <div className="space-y-3">
                <Label>Search User by Mobile Number *</Label>
                <div className="flex gap-2">
                  <Input
                    value={mobileSearch}
                    onChange={(e) => setMobileSearch(e.target.value)}
                    placeholder="Enter mobile number..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchByMobile()}
                  />
                  <Button 
                    type="button" 
                    onClick={handleSearchByMobile}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserSearch className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Select a user:</p>
                    {searchResults.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted"
                        onClick={() => handleSelectUser(user)}
                      >
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.mobile_number}</p>
                        </div>
                        <Button variant="ghost" size="sm">Select</Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected User */}
                {selectedUser && (
                  <div className="rounded-md border border-primary bg-primary/5 p-3">
                    <p className="text-sm font-medium text-primary">Selected User:</p>
                    <p className="font-semibold">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.mobile_number}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Label>Permissions</Label>
              {permissionLabels.map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={formData[key as keyof typeof formData] !== 'none'}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, [key]: checked ? 'full' : 'none' })
                    }
                  />
                  <Label htmlFor={key} className="text-sm font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdmin}>
              {editingAdmin ? 'Save Changes' : 'Add Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAdmins;
