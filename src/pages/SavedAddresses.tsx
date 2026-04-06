import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerAddresses, CustomerAddress, CreateAddressInput } from '@/hooks/useCustomerAddresses';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, MapPin, Plus, Home, Building, Pencil, Trash2, Star, Loader2,
} from 'lucide-react';
import GoogleMapPicker from '@/components/google-maps/GoogleMapPicker';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import BottomNav from '@/components/customer/BottomNav';

const SavedAddresses: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedPanchayat, selectedWardNumber } = useLocation();
  const {
    addresses, isLoading, createAddress, updateAddress, deleteAddress,
    setDefaultAddress, isCreating, isUpdating,
  } = useCustomerAddresses();

  const [showDialog, setShowDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);

  // Form state
  const [addressLabel, setAddressLabel] = useState('Home');
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);

  const resetForm = () => {
    setAddressLabel('Home');
    setFullAddress('');
    setLandmark('');
    setIsDefault(false);
    setEditingAddress(null);
    setAddressLat(null);
    setAddressLng(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (address: CustomerAddress) => {
    setEditingAddress(address);
    setAddressLabel(address.address_label || 'Home');
    setFullAddress(address.full_address);
    setLandmark(address.landmark || '');
    setIsDefault(address.is_default);
    setAddressLat(address.latitude || null);
    setAddressLng(address.longitude || null);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!fullAddress.trim()) {
      toast({ title: 'Address required', description: 'Please enter your address', variant: 'destructive' });
      return;
    }

    const data: CreateAddressInput = {
      address_label: addressLabel,
      full_address: fullAddress,
      landmark: landmark || undefined,
      panchayat_id: selectedPanchayat?.id,
      ward_number: selectedWardNumber || undefined,
      is_default: isDefault,
      latitude: addressLat || undefined,
      longitude: addressLng || undefined,
    };

    if (editingAddress) {
      updateAddress({ id: editingAddress.id, ...data });
    } else {
      createAddress(data);
    }
    setShowDialog(false);
    resetForm();
  };

  const getIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home': return <Home className="h-4 w-4" />;
      case 'work': case 'office': return <Building className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 pb-20">
        <MapPin className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Login to manage addresses</h2>
        <Button className="mt-6" onClick={() => navigate('/auth')}>Login / Sign Up</Button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold flex-1">Saved Addresses</h1>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </header>

      <main className="p-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No saved addresses</h3>
            <p className="text-sm text-muted-foreground mt-1">Add an address for faster checkout</p>
            <Button className="mt-4" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" /> Add Address
            </Button>
          </div>
        ) : (
          addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(address.address_label || 'Home')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{address.address_label || 'Home'}</span>
                      {address.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" /> Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{address.full_address}</p>
                    {address.landmark && (
                      <p className="text-xs text-muted-foreground mt-0.5">Near: {address.landmark}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!address.is_default && (
                      <Button size="sm" variant="ghost" onClick={() => setDefaultAddress(address.id)} className="text-xs">
                        Set Default
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(address)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteAddress(address.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <BottomNav />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            <DialogDescription>Save your address for faster checkout</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Address Label</Label>
              <div className="flex gap-2">
                {['Home', 'Work', 'Other'].map((label) => (
                  <Button key={label} variant={addressLabel === label ? 'default' : 'outline'} size="sm" onClick={() => setAddressLabel(label)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-address">Full Address *</Label>
              <Textarea id="full-address" placeholder="House name, street, area..." value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landmark">Landmark (Optional)</Label>
              <Input id="landmark" placeholder="Near temple, opposite school..." value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pin Location on Map (Optional)</Label>
              <GoogleMapPicker latitude={addressLat} longitude={addressLng} onLocationChange={(lat, lng) => { setAddressLat(lat); setAddressLng(lng); }} height="200px" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is-default" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
              <Label htmlFor="is-default" className="cursor-pointer">Set as default address</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating}>
              {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAddress ? 'Update' : 'Save'} Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedAddresses;
