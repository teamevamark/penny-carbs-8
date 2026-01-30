import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, User, ChevronDown, LogOut, ShoppingBag, Settings, Truck } from 'lucide-react';
import logo from '@/assets/logo.png';

interface AppHeaderProps {
  onSearch?: (query: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onSearch }) => {
  const navigate = useNavigate();
  const { user, profile, signOut, role } = useAuth();
  const { 
    panchayats, 
    selectedPanchayat, 
    selectedWardNumber, 
    setSelectedPanchayat, 
    setSelectedWardNumber,
    getWardsForPanchayat 
  } = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handlePanchayatChange = (panchayatId: string) => {
    const panchayat = panchayats.find(p => p.id === panchayatId);
    setSelectedPanchayat(panchayat || null);
    setSelectedWardNumber(null); // Reset ward when panchayat changes
  };

  const handleWardChange = (wardNumber: string) => {
    setSelectedWardNumber(parseInt(wardNumber, 10));
    setLocationDialogOpen(false);
  };

  const availableWards = selectedPanchayat ? getWardsForPanchayat(selectedPanchayat) : [];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center gap-4 px-4">
          {/* Logo */}
          <img 
            src={logo} 
            alt="Penny Carbs" 
            className="h-10 w-auto cursor-pointer hidden sm:block" 
            onClick={() => navigate('/')}
          />
          {/* Location Selector with Customer Login */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocationDialogOpen(true)}
              className="flex items-center gap-1 text-left"
            >
              <MapPin className="h-5 w-5 text-primary" />
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground">Deliver to</p>
                <p className="flex items-center text-sm font-medium">
                  {selectedWardNumber 
                    ? `Ward ${selectedWardNumber}, ${selectedPanchayat?.name}` 
                    : selectedPanchayat?.name || 'Select Location'}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </p>
              </div>
              <ChevronDown className="h-4 w-4 sm:hidden" />
            </button>
            {!user && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/customer-auth')}
                className="hidden sm:flex"
              >
                Login
              </Button>
            )}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search dishes or kitchens..."
                className="h-10 w-full pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuLabel>
                  <p className="font-medium">{profile?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.mobile_number}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/orders')}>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  My Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                {(role === 'super_admin' || role === 'admin') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/auth')} size="sm" variant="ghost" className="gap-1">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Delivery/Food Partner</span>
            </Button>
          )}
        </div>
      </header>

      {/* Location Selection Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Select Your Location
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Panchayat</label>
              <Select
                value={selectedPanchayat?.id || ''}
                onValueChange={handlePanchayatChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Panchayat" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {panchayats.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.ward_count} wards)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPanchayat && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Ward</label>
                <Select
                  value={selectedWardNumber?.toString() || ''}
                  onValueChange={handleWardChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Ward" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-60">
                    {availableWards.map((wardNum) => (
                      <SelectItem key={wardNum} value={wardNum.toString()}>
                        Ward {wardNum}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppHeader;
