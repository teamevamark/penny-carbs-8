import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { FoodCategory, ServiceType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/admin/ImageUpload';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  GripVertical
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const serviceTypes: { value: ServiceType; label: string }[] = [
  { value: 'indoor_events', label: 'Indoor Events' },
  { value: 'cloud_kitchen', label: 'Cloud Kitchen' },
  { value: 'homemade', label: 'Homemade Food' },
];

const AdminCategories: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterServiceType, setFilterServiceType] = useState<string>('all');
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FoodCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    service_types: [] as string[],
    image_url: '' as string | null,
    is_active: true,
    display_order: 0,
  });

  const isAdmin = role === 'super_admin' || role === 'admin';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('food_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (category: FoodCategory) => {
    try {
      const { error } = await supabase
        .from('food_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;

      setCategories(prev => prev.map(c => 
        c.id === category.id ? { ...c, is_active: !c.is_active } : c
      ));

      toast({
        title: category.is_active ? 'Category disabled' : 'Category enabled',
        description: `${category.name} is now ${category.is_active ? 'inactive' : 'active'}`,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = (category?: FoodCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        service_types: category.service_types || [],
        image_url: category.image_url,
        is_active: category.is_active,
        display_order: category.display_order,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        service_types: [],
        image_url: null,
        is_active: true,
        display_order: categories.length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const serviceType = formData.service_types.length === 1 
        ? formData.service_types[0] as ServiceType 
        : null;
      
      const categoryData = {
        name: formData.name,
        service_types: formData.service_types,
        service_type: serviceType,
        image_url: formData.image_url,
        is_active: formData.is_active,
        display_order: formData.display_order,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('food_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: 'Category updated successfully' });
      } else {
        const { error } = await supabase
          .from('food_categories')
          .insert(categoryData);

        if (error) throw error;
        toast({ title: 'Category created successfully' });
      }

      setIsDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Error',
        description: 'Failed to save category',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (category: FoodCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('food_categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== category.id));
      toast({ title: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete category. It may have items linked to it.',
        variant: 'destructive',
      });
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isCommon = !cat.service_types || cat.service_types.length === 0;
    const matchesType = filterServiceType === 'all' || isCommon || cat.service_types?.includes(filterServiceType);
    return matchesSearch && matchesType;
  });

  const toggleServiceType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      service_types: prev.service_types.includes(type)
        ? prev.service_types.filter(t => t !== type)
        : [...prev.service_types, type]
    }));
  };

  const getServiceTypesLabel = (types: string[] | undefined) => {
    if (!types || types.length === 0) return 'Common (All Services)';
    if (types.length === 3) return 'All Services';
    return types.map(t => t.replace('_', ' ')).join(', ');
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
      <div className="border-b bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Food Categories</h2>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterServiceType} onValueChange={setFilterServiceType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Types</SelectItem>
              {serviceTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <main className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-6xl">📁</span>
            <h2 className="mt-4 text-lg font-semibold">No categories found</h2>
            <p className="text-sm text-muted-foreground">Create your first category</p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map((category) => (
              <Card key={category.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl">📁</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{category.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {getServiceTypesLabel(category.service_types)}
                    </p>
                    <Badge 
                      variant={category.is_active ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={() => handleToggleActive(category)}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDeleteCategory(category)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter category name"
              />
            </div>

            <div className="space-y-3">
              <Label>Service Types</Label>
              <p className="text-xs text-muted-foreground">
                Select which services this category applies to. Leave all unchecked for a common category.
              </p>
              <div className="space-y-2">
                {serviceTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.value}
                      checked={formData.service_types.includes(type.value)}
                      onCheckedChange={() => toggleServiceType(type.value)}
                    />
                    <Label htmlFor={type.value} className="font-normal cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category Image</Label>
              <ImageUpload
                bucket="food-categories"
                currentImageUrl={formData.image_url}
                onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                onRemove={() => setFormData({ ...formData, image_url: null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
