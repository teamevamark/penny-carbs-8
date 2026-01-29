import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Clock, Home, AlertCircle } from 'lucide-react';
import BottomNav from '@/components/customer/BottomNav';

const HomemadeOrder: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedPanchayat, selectedWardNumber } = useLocation();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to place an order",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!selectedPanchayat || !selectedWardNumber) {
      toast({
        title: "Location Required",
        description: "Please select your delivery location",
        variant: "destructive",
      });
      return;
    }

    // Navigate to menu with homemade context
    navigate(`/menu/homemade`, {
      state: {
        deliveryAddress,
        deliveryInstructions,
        estimatedDeliveryMinutes: 60,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Homemade Food</h1>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Info Banner */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="flex items-center gap-3 p-4">
            <Home className="h-5 w-5 text-green-600 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-800 dark:text-green-200">
                Fresh Homemade Meals
              </p>
              <p className="text-green-700 dark:text-green-300">
                Order any dish anytime - no fixed time slots!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Time Info */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Estimated Delivery</p>
              <p className="text-sm text-muted-foreground">
                Approximately 60 minutes after order confirmation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Info */}
            {selectedPanchayat && selectedWardNumber ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Ward {selectedWardNumber}, {selectedPanchayat.name}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Please select your location first</span>
              </div>
            )}

            {/* Address */}
            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <Textarea
                placeholder="House name, landmark, street..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label>Delivery Instructions (Optional)</Label>
              <Textarea
                placeholder="Any special delivery instructions..."
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <span className="text-2xl">🍲</span>
            <p className="text-sm font-medium mt-2">Fresh Cooked</p>
            <p className="text-xs text-muted-foreground">Made to order</p>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-2xl">🏠</span>
            <p className="text-sm font-medium mt-2">Home Kitchen</p>
            <p className="text-xs text-muted-foreground">Local home cooks</p>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-2xl">⏰</span>
            <p className="text-sm font-medium mt-2">Anytime</p>
            <p className="text-xs text-muted-foreground">No time restrictions</p>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-2xl">🚗</span>
            <p className="text-sm font-medium mt-2">Door Delivery</p>
            <p className="text-xs text-muted-foreground">Right to your home</p>
          </Card>
        </div>

        {/* Continue Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!selectedPanchayat || !selectedWardNumber}
        >
          Browse Homemade Menu
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default HomemadeOrder;
