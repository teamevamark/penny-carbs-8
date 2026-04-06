import React, { useState, useEffect } from 'react';
import { useCustomerAddresses, CustomerAddress, CreateAddressInput } from '@/hooks/useCustomerAddresses';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { MapPin, Plus, Home, Building, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import GoogleMapPicker from '@/components/google-maps/GoogleMapPicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddressSelectorProps {
  selectedAddress: string;
  onAddressChange: (address: string) => void;
  onAddressSelect?: (address: CustomerAddress) => void;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  selectedAddress,
  onAddressChange,
  onAddressSelect,
}) => {
  const { addresses, isLoading, createAddress, updateAddress, deleteAddress, isCreating } = useCustomerAddresses();
  const { selectedPanchayat, selectedWardNumber } = useLocation();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Form state
  const [addressLabel, setAddressLabel] = useState('Home');
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);

  // Set initial selection
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        onAddressChange(defaultAddr.full_address);
        onAddressSelect?.(defaultAddr);
      }
    }
  }, [addresses, selectedAddressId, onAddressChange, onAddressSelect]);

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
    setShowAddDialog(true);
  };

  const openEditDialog = (address: CustomerAddress) => {
    setEditingAddress(address);
    setAddressLabel(address.address_label || 'Home');
    setFullAddress(address.full_address);
    setLandmark(address.landmark || '');
    setIsDefault(address.is_default);
    setAddressLat((address as any).latitude || null);
    setAddressLng((address as any).longitude || null);
    setShowAddDialog(true);
  };

  const handleSaveAddress = () => {
    if (!fullAddress.trim()) {
      toast({
        title: 'Address required',
        description: 'Please enter your delivery address',
        variant: 'destructive',
      });
      return;
    }

    const addressData: CreateAddressInput = {
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
      updateAddress({ id: editingAddress.id, ...addressData });
    } else {
      createAddress(addressData);
    }
    
    setShowAddDialog(false);
    resetForm();
  };

  const handleSelectAddress = (addressId: string) => {
    if (addressId === 'new') {
      setShowManualInput(true);
      setSelectedAddressId('');
      return;
    }

    setShowManualInput(false);
    setSelectedAddressId(addressId);
    const address = addresses.find(a => a.id === addressId);
    if (address) {
      onAddressChange(address.full_address);
      onAddressSelect?.(address);
    }
  };

  const getAddressIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return <Home className="h-4 w-4" />;
      case 'work':
      case 'office':
        return <Building className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.length > 0 && (
        <RadioGroup
          value={showManualInput ? '' : selectedAddressId}
          onValueChange={handleSelectAddress}
          className="space-y-2"
        >
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`cursor-pointer transition-colors ${
                selectedAddressId === address.id && !showManualInput
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground/30'
              }`}
              onClick={() => handleSelectAddress(address.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getAddressIcon(address.address_label)}
                      <span className="font-medium text-sm">{address.address_label}</span>
                      {address.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" /> Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {address.full_address}
                    </p>
                    {address.landmark && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Near: {address.landmark}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(address);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAddress(address.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* New Address Option */}
          <Card
            className={`cursor-pointer transition-colors ${
              showManualInput ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
            }`}
            onClick={() => handleSelectAddress('new')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="new" id="new-address" />
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Enter a new address</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      )}

      {/* Manual input when no addresses or new address selected */}
      {(addresses.length === 0 || showManualInput) && (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter your complete delivery address (House name, street, landmark...)"
            value={selectedAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            rows={3}
          />
          {selectedAddress.trim() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFullAddress(selectedAddress);
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Save this address
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Address Button */}
      {addresses.length > 0 && !showManualInput && (
        <Button variant="outline" size="sm" onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-1" /> Add New Address
        </Button>
      )}

      {/* Add/Edit Address Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
            <DialogDescription>
              Save your address for faster checkout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Address Label</Label>
              <div className="flex gap-2">
                {['Home', 'Work', 'Other'].map((label) => (
                  <Button
                    key={label}
                    variant={addressLabel === label ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAddressLabel(label)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-address">Full Address *</Label>
              <Textarea
                id="full-address"
                placeholder="House name, street, area..."
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landmark">Landmark (Optional)</Label>
              <Input
                id="landmark"
                placeholder="Near temple, opposite school..."
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is-default" className="cursor-pointer">
                Set as default address
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAddress} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAddress ? 'Update' : 'Save'} Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressSelector;
