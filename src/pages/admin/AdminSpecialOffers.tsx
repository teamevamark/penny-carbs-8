import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import ImageUpload from '@/components/admin/ImageUpload';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit2, 
  Trash2,
  GripVertical,
  Star,
  Percent
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SpecialOffer {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  background_color: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface FeaturedItem {
  id: string;
  name: string;
  price: number;
  discount_percent: number;
  discount_amount: number;
  is_featured: boolean;
  is_available: boolean;
  primary_image?: string;
}

const AdminSpecialOffers: React.FC = () => {
  const { role } = useAuth();
  
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '' as string | null,
    background_color: '#16a34a',
    link_url: '',
    display_order: 0,
    is_active: true,
  });

  const isAdmin = role === 'super_admin' || role === 'admin';

  useEffect(() => {
    fetchOffers();
    fetchFeaturedItems();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('special_offers')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load special offers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeaturedItems = async () => {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select(`
          id,
          name,
          price,
          discount_percent,
          discount_amount,
          is_featured,
          is_available,
          images:food_item_images(image_url, is_primary)
        `)
        .eq('is_featured', true)
        .order('name');

      if (error) throw error;
      
      const itemsWithImages = (data || []).map(item => ({
        ...item,
        primary_image: item.images?.find((img: any) => img.is_primary)?.image_url || item.images?.[0]?.image_url
      }));
      
      setFeaturedItems(itemsWithImages);
    } catch (error) {
      console.error('Error fetching featured items:', error);
    }
  };

  const handleToggleActive = async (offer: SpecialOffer) => {
    try {
      const { error } = await supabase
        .from('special_offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offer.id);

      if (error) throw error;

      setOffers(prev => prev.map(o => 
        o.id === offer.id ? { ...o, is_active: !o.is_active } : o
      ));

      toast({
        title: offer.is_active ? 'Offer disabled' : 'Offer enabled',
      });
    } catch (error) {
      console.error('Error updating offer:', error);
      toast({
        title: 'Error',
        description: 'Failed to update offer',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = (offer?: SpecialOffer) => {
    if (offer) {
      setEditingOffer(offer);
      setFormData({
        title: offer.title,
        subtitle: offer.subtitle || '',
        image_url: offer.image_url,
        background_color: offer.background_color || '#16a34a',
        link_url: offer.link_url || '',
        display_order: offer.display_order,
        is_active: offer.is_active,
      });
    } else {
      setEditingOffer(null);
      setFormData({
        title: '',
        subtitle: '',
        image_url: null,
        background_color: '#16a34a',
        link_url: '',
        display_order: offers.length,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveOffer = async () => {
    if (!formData.title) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const offerData = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        image_url: formData.image_url,
        background_color: formData.background_color,
        link_url: formData.link_url || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('special_offers')
          .update(offerData)
          .eq('id', editingOffer.id);

        if (error) throw error;
        toast({ title: 'Offer updated successfully' });
      } else {
        const { error } = await supabase
          .from('special_offers')
          .insert(offerData);

        if (error) throw error;
        toast({ title: 'Offer created successfully' });
      }

      setIsDialogOpen(false);
      fetchOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      toast({
        title: 'Error',
        description: 'Failed to save offer',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOffer = async (offer: SpecialOffer) => {
    if (!confirm(`Are you sure you want to delete "${offer.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('special_offers')
        .delete()
        .eq('id', offer.id);

      if (error) throw error;

      setOffers(prev => prev.filter(o => o.id !== offer.id));
      toast({ title: 'Offer deleted successfully' });
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete offer',
        variant: 'destructive',
      });
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
      <div className="border-b bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Special Offers</h2>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Offer
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Small promotional cards displayed below banners
        </p>
      </div>

      <main className="p-4">
        <Tabs defaultValue="offers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="offers">Manual Offers ({offers.length})</TabsTrigger>
            <TabsTrigger value="featured">
              <Star className="h-4 w-4 mr-1.5" />
              Featured Items ({featuredItems.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="offers">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : offers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="text-6xl">🏷️</span>
                <h2 className="mt-4 text-lg font-semibold">No offers yet</h2>
                <p className="text-sm text-muted-foreground">Create your first special offer</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Offer
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <Card key={offer.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      
                      <div 
                        className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: offer.background_color || '#16a34a' }}
                      >
                        {offer.image_url ? (
                          <img
                            src={offer.image_url}
                            alt={offer.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-xs font-medium text-center px-1">
                            {offer.title.substring(0, 10)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{offer.title}</h3>
                        {offer.subtitle && (
                          <p className="text-sm text-muted-foreground truncate">
                            {offer.subtitle}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {offer.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={offer.is_active}
                          onCheckedChange={() => handleToggleActive(offer)}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenDialog(offer)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteOffer(offer)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="featured">
            {featuredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Star className="h-16 w-16 text-muted-foreground/30" />
                <h2 className="mt-4 text-lg font-semibold">No featured items</h2>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Go to Items → Edit an item → Enable "Featured Item" with a discount
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {featuredItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {item.primary_image ? (
                          <img
                            src={item.primary_image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xl">🍽️</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">₹{item.price}</p>
                          {(item.discount_percent > 0 || item.discount_amount > 0) && (
                            <Badge variant="destructive" className="text-xs">
                              <Percent className="h-3 w-3 mr-0.5" />
                              {item.discount_percent > 0 
                                ? `${item.discount_percent}% off` 
                                : `₹${item.discount_amount} off`}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={item.is_available ? 'default' : 'secondary'} className="mt-1">
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </div>

                      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                        Auto-listed
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOffer ? 'Edit Offer' : 'Add New Offer'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., New Deals, Every Hour"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g., DEAL RUSH"
              />
            </div>

            <div className="space-y-2">
              <Label>Offer Image (optional)</Label>
              <ImageUpload
                bucket="special-offers"
                currentImageUrl={formData.image_url}
                onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                onRemove={() => setFormData({ ...formData, image_url: null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="background_color">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="background_color"
                  type="color"
                  value={formData.background_color}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  className="w-14 h-10 p-1"
                />
                <Input
                  value={formData.background_color}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  placeholder="#16a34a"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_url">Link URL (optional)</Label>
              <Input
                id="link_url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="/cloud-kitchen or https://..."
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
            <Button onClick={handleSaveOffer}>
              {editingOffer ? 'Save Changes' : 'Create Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSpecialOffers;
