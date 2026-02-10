import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  CalendarHeart,
  Users,
  Utensils,
  Sparkles,
  ClipboardList,
  Layers,
  Send,
} from 'lucide-react';
import BottomNav from '@/components/customer/BottomNav';

// New Card-based Components
import PlannerStepCard from '@/components/indoor-events/PlannerStepCard';
import StepDialog from '@/components/indoor-events/StepDialog';

// Step Content Components
import EventTypeStep from '@/components/indoor-events/EventTypeStep';
import GuestCountStep from '@/components/indoor-events/GuestCountStep';
import FoodSelectionStep from '@/components/indoor-events/FoodSelectionStep';
import ServicesStep, { AVAILABLE_SERVICES } from '@/components/indoor-events/ServicesStep';
import ServiceOptionDialog from '@/components/indoor-events/ServiceOptionDialog';
import BudgetSummaryStep from '@/components/indoor-events/BudgetSummaryStep';
import EventModelsStep from '@/components/indoor-events/EventModelsStep';
import SubmitPlanningStep from '@/components/indoor-events/SubmitPlanningStep';

import type { EventType } from '@/types/events';

export interface SelectedFood {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface SelectedService {
  id: string;
  name: string;
  price: number;
  priceType: 'fixed' | 'per_guest';
  enabled: boolean;
}

export interface PlannerData {
  eventType: EventType | null;
  guestCount: number;
  selectedFoods: SelectedFood[];
  selectedServices: SelectedService[];
  eventDate: Date | undefined;
  eventTime: string;
  eventDetails: string;
  deliveryAddress: string;
  contactNumber: string;
  referralMobile: string;
}

const STEPS = [
  { id: 'event-type', title: 'Event Type', description: 'What occasion?', icon: <CalendarHeart className="h-6 w-6" /> },
  { id: 'guests', title: 'Guest Count', description: 'How many guests?', icon: <Users className="h-6 w-6" /> },
  { id: 'food', title: 'Food Selection', description: 'Build your menu', icon: <Utensils className="h-6 w-6" /> },
  { id: 'services', title: 'Add Services', description: 'Decoration, staff, etc.', icon: <Sparkles className="h-6 w-6" /> },
  { id: 'summary', title: 'Budget Summary', description: 'Review your estimate', icon: <ClipboardList className="h-6 w-6" /> },
  { id: 'models', title: 'Event Models', description: 'Use pre-built packages', icon: <Layers className="h-6 w-6" /> },
  { id: 'submit', title: 'Submit Request', description: 'Finalize & submit', icon: <Send className="h-6 w-6" /> },
];

const IndoorEventsPlanner: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { selectedPanchayat, selectedWardNumber } = useLocation();

  // Load pre-selected event type and items from session storage
  const getInitialEventType = (): EventType | null => {
    const stored = sessionStorage.getItem('indoor_event_type');
    if (stored) {
      sessionStorage.removeItem('indoor_event_type');
      return JSON.parse(stored);
    }
    return null;
  };

  const getInitialFoods = (): SelectedFood[] => {
    const stored = sessionStorage.getItem('indoor_event_items');
    if (stored) {
      sessionStorage.removeItem('indoor_event_items');
      const items = JSON.parse(stored) as Array<{ id: string; name: string; price: number; quantity: number }>;
      return items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: '',
      }));
    }
    return [];
  };

  const getInitialGuestCount = (): number => {
    const stored = sessionStorage.getItem('indoor_event_guest_count');
    if (stored) {
      sessionStorage.removeItem('indoor_event_guest_count');
      return parseInt(stored) || 50;
    }
    return 50;
  };

  const initialEventType = getInitialEventType();
  const initialFoods = getInitialFoods();
  const initialGuestCount = getInitialGuestCount();
  const initialCompletedSteps = new Set<string>();
  if (initialEventType) initialCompletedSteps.add('event-type');
  if (initialFoods.length > 0) initialCompletedSteps.add('food');
  initialCompletedSteps.add('guests');

  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(initialCompletedSteps);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [servicePopupIndex, setServicePopupIndex] = useState<number | null>(null);
  const [showServicePopup, setShowServicePopup] = useState(false);

  const [plannerData, setPlannerData] = useState<PlannerData>({
    eventType: initialEventType,
    guestCount: initialGuestCount,
    selectedFoods: initialFoods,
    selectedServices: [],
    eventDate: undefined,
    eventTime: '',
    eventDetails: '',
    deliveryAddress: '',
    contactNumber: profile?.mobile_number || '',
    referralMobile: '',
  });

  // Calculate totals
  const totals = useMemo(() => {
    const foodTotal = plannerData.selectedFoods.reduce(
      (sum, food) => sum + food.price * food.quantity,
      0
    );

    const serviceTotal = plannerData.selectedServices
      .filter((s) => s.enabled)
      .reduce((sum, service) => {
        if (service.priceType === 'per_guest') {
          return sum + service.price * plannerData.guestCount;
        }
        return sum + service.price;
      }, 0);

    const grandTotal = foodTotal + serviceTotal;
    const perPersonCost = plannerData.guestCount > 0 ? grandTotal / plannerData.guestCount : 0;

    return { foodTotal, serviceTotal, grandTotal, perPersonCost };
  }, [plannerData]);

  const updatePlannerData = (updates: Partial<PlannerData>) => {
    setPlannerData((prev) => ({ ...prev, ...updates }));
  };

  // Get step index helper
  const getStepIndex = (stepId: string) => STEPS.findIndex((s) => s.id === stepId);

  // Open next step in sequence with slight delay for smooth transition
  const openNextStep = (currentStepId: string) => {
    const currentIndex = getStepIndex(currentStepId);
    if (currentIndex < STEPS.length - 1) {
      // Small delay to allow dialog close animation
      setTimeout(() => {
        setActiveDialog(STEPS[currentIndex + 1].id);
      }, 150);
    }
  };

  // Close dialog without auto-opening next
  const closeDialog = () => {
    setActiveDialog(null);
  };

  // Complete step and auto-advance to next
  const completeAndAdvance = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
    setActiveDialog(null);

    // After food selection, start sequential service popups
    if (stepId === 'food') {
      // Initialize services if not already done
      if (plannerData.selectedServices.length === 0) {
        updatePlannerData({
          selectedServices: AVAILABLE_SERVICES.map((s) => ({ ...s, enabled: false })),
        });
      }
      setTimeout(() => {
        setServicePopupIndex(0);
        setShowServicePopup(true);
      }, 150);
      return;
    }

    openNextStep(stepId);
  };

  // Handle accepting a service in sequential popup
  const handleServiceAccept = () => {
    if (servicePopupIndex === null) return;
    setPlannerData((prev) => {
      const services = prev.selectedServices.length > 0
        ? prev.selectedServices
        : AVAILABLE_SERVICES.map((s) => ({ ...s, enabled: false }));
      return {
        ...prev,
        selectedServices: services.map((s, i) =>
          i === servicePopupIndex ? { ...s, enabled: true } : s
        ),
      };
    });
    advanceServicePopup();
  };

  // Handle skipping a service
  const handleServiceSkip = () => {
    advanceServicePopup();
  };

  // Move to next service or finish
  const advanceServicePopup = () => {
    const nextIndex = (servicePopupIndex ?? 0) + 1;
    setShowServicePopup(false);
    if (nextIndex < AVAILABLE_SERVICES.length) {
      setTimeout(() => {
        setServicePopupIndex(nextIndex);
        setShowServicePopup(true);
      }, 200);
    } else {
      // All services reviewed - mark complete and open summary
      setServicePopupIndex(null);
      setCompletedSteps((prev) => new Set([...prev, 'services']));
      setTimeout(() => {
        setActiveDialog('summary');
      }, 200);
    }
  };

  // Complete step and close (for final step or manual close)
  const completeAndClose = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
    setActiveDialog(null);
  };

  const getStepSummary = (stepId: string): string | undefined => {
    switch (stepId) {
      case 'event-type':
        return plannerData.eventType?.name;
      case 'guests':
        return `${plannerData.guestCount} guests`;
      case 'food':
        return plannerData.selectedFoods.length > 0
          ? `${plannerData.selectedFoods.length} items • ₹${totals.foodTotal.toLocaleString()}`
          : undefined;
      case 'services':
        const enabledServices = plannerData.selectedServices.filter((s) => s.enabled);
        return enabledServices.length > 0
          ? `${enabledServices.length} services • ₹${totals.serviceTotal.toLocaleString()}`
          : undefined;
      case 'summary':
        return totals.grandTotal > 0 ? `₹${totals.grandTotal.toLocaleString()} total` : undefined;
      case 'models':
        return completedSteps.has('models') ? 'Reviewed' : undefined;
      case 'submit':
        return completedSteps.has('submit') ? 'Submitted' : undefined;
      default:
        return undefined;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to submit your planning request',
        variant: 'destructive',
      });
      navigate('/customer-auth');
      return;
    }

    if (!plannerData.eventType) {
      toast({ title: 'Event type required', variant: 'destructive' });
      return;
    }

    if (!plannerData.eventDate) {
      toast({ title: 'Event date required', variant: 'destructive' });
      return;
    }

    if (!selectedPanchayat || !selectedWardNumber) {
      toast({
        title: 'Location required',
        description: 'Select location from home page',
        variant: 'destructive',
      });
      return;
    }

    if (!plannerData.deliveryAddress.trim()) {
      toast({ title: 'Venue address required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = `IEP-${Date.now().toString(36).toUpperCase()}`;

      const foodDetails = plannerData.selectedFoods
        .map((f) => `${f.name} x${f.quantity} (₹${f.price}/plate)`)
        .join(', ');

      const serviceDetails = plannerData.selectedServices
        .filter((s) => s.enabled)
        .map((s) => `${s.name}: ₹${s.priceType === 'per_guest' ? s.price + '/guest' : s.price}`)
        .join(', ');

      const eventDetailsText = `
PLANNING REQUEST
================
Time: ${plannerData.eventTime || 'Not specified'}
Contact: ${plannerData.contactNumber}
Guests: ${plannerData.guestCount}

SELECTED FOOD:
${foodDetails || 'No food selected'}

SELECTED SERVICES:
${serviceDetails || 'No services selected'}

ESTIMATED BUDGET:
Food: ₹${totals.foodTotal.toLocaleString()}
Services: ₹${totals.serviceTotal.toLocaleString()}
Total: ₹${totals.grandTotal.toLocaleString()}
Per Person: ₹${Math.round(totals.perPersonCost).toLocaleString()}

SPECIAL INSTRUCTIONS:
${plannerData.eventDetails || 'None'}
      `.trim();

      // Look up referrer user from mobile number (from input or session storage)
      let referredBy: string | null = null;
      const referralMobileToUse = plannerData.referralMobile.trim() || sessionStorage.getItem('indoor_event_referral');
      if (referralMobileToUse) {
        const { data: referrerProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('mobile_number', referralMobileToUse)
          .single();
        
        if (referrerProfile) {
          referredBy = referrerProfile.user_id;
        }
        // Clear the session storage after use
        sessionStorage.removeItem('indoor_event_referral');
      }

      const { error } = await supabase.from('orders').insert({
        order_number: orderNumber,
        customer_id: user.id,
        service_type: 'indoor_events',
        event_type_id: plannerData.eventType.id,
        event_date: plannerData.eventDate.toISOString(),
        guest_count: plannerData.guestCount,
        event_details: eventDetailsText,
        delivery_address: plannerData.deliveryAddress,
        panchayat_id: selectedPanchayat.id,
        ward_number: selectedWardNumber,
        status: 'pending',
        order_type: 'full_event',
        total_amount: totals.grandTotal,
        referred_by: referredBy,
      });

      if (error) throw error;

      setIsSubmitted(true);
      setActiveDialog(null);
      toast({
        title: 'Planning Request Submitted!',
        description: 'We will review and contact you with final quotation.',
      });
    } catch (error: any) {
      console.error('Error submitting planning:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 w-full border-b bg-indoor-events text-white">
          <div className="container flex h-14 items-center gap-4 px-4">
            <Calculator className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Planning Submitted</h1>
          </div>
        </header>

        <main className="container px-4 py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-display font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground max-w-sm">
              Your event planning request has been submitted. Our team will review and contact you
              with a final quotation.
            </p>

            <div className="bg-muted rounded-xl p-4 mt-4 text-left w-full max-w-sm">
              <p className="text-sm font-medium mb-2">Estimated Budget</p>
              <p className="text-2xl font-bold text-indoor-events">
                ₹{totals.grandTotal.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Final amount may vary after admin review
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => navigate('/orders')}>
                View My Bookings
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="bg-indoor-events hover:bg-indoor-events/90"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-indoor-events text-white">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/indoor-events')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Calculator className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Plan & Estimate Budget</h1>
        </div>
      </header>

      {/* Step Cards */}
      <main className="container px-4 py-6 space-y-3">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-bold">Build Your Event</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tap each step to fill in details
          </p>
        </div>

        {STEPS.map((step, index) => (
          <PlannerStepCard
            key={step.id}
            stepNumber={index + 1}
            title={step.title}
            description={step.description}
            icon={step.icon}
            isCompleted={completedSteps.has(step.id)}
            isActive={activeDialog === step.id}
            summary={getStepSummary(step.id)}
            onClick={() => setActiveDialog(step.id)}
          />
        ))}

        {/* Budget Summary Bar */}
        {totals.grandTotal > 0 && (
          <div className="mt-6 p-4 bg-indoor-events/10 rounded-xl border border-indoor-events/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Estimated Total</p>
                <p className="text-xl font-bold text-indoor-events">
                  ₹{totals.grandTotal.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Per Person</p>
                <p className="text-sm font-semibold">
                  ₹{Math.round(totals.perPersonCost).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Step Dialogs - Order: event-type → guests → food → services → summary → models → submit */}
      <StepDialog
        open={activeDialog === 'event-type'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Select Event Type"
      >
        <EventTypeStep
          selectedEventType={plannerData.eventType}
          onSelect={(eventType) => updatePlannerData({ eventType })}
          onNext={() => completeAndAdvance('event-type')}
        />
      </StepDialog>

      <StepDialog
        open={activeDialog === 'guests'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Guest Count"
      >
        <GuestCountStep
          guestCount={plannerData.guestCount}
          selectedFoods={plannerData.selectedFoods}
          onChange={(guestCount) => updatePlannerData({ guestCount })}
          onNext={() => completeAndAdvance('guests')}
          onBack={closeDialog}
        />
      </StepDialog>

      <StepDialog
        open={activeDialog === 'food'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Food Selection"
      >
        <FoodSelectionStep
          selectedFoods={plannerData.selectedFoods}
          guestCount={plannerData.guestCount}
          onUpdateFoods={(selectedFoods) => updatePlannerData({ selectedFoods })}
          onNext={() => completeAndAdvance('food')}
          onBack={closeDialog}
        />
      </StepDialog>

      {/* Sequential Service Option Dialogs */}
      <ServiceOptionDialog
        open={showServicePopup}
        service={
          servicePopupIndex !== null
            ? (plannerData.selectedServices[servicePopupIndex] ||
               { ...AVAILABLE_SERVICES[servicePopupIndex], enabled: false })
            : null
        }
        guestCount={plannerData.guestCount}
        currentIndex={servicePopupIndex ?? 0}
        totalCount={AVAILABLE_SERVICES.length}
        onAccept={handleServiceAccept}
        onSkip={handleServiceSkip}
      />

      {/* Manual services editing (when clicking the services card) */}
      <StepDialog
        open={activeDialog === 'services'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Add Services"
      >
        <ServicesStep
          selectedServices={plannerData.selectedServices}
          guestCount={plannerData.guestCount}
          onUpdateServices={(selectedServices) => updatePlannerData({ selectedServices })}
          onNext={() => completeAndClose('services')}
          onBack={closeDialog}
        />
      </StepDialog>

      <StepDialog
        open={activeDialog === 'summary'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Budget Summary"
      >
        <BudgetSummaryStep
          plannerData={plannerData}
          totals={totals}
          onNext={() => completeAndAdvance('summary')}
          onBack={closeDialog}
        />
      </StepDialog>

      <StepDialog
        open={activeDialog === 'models'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Event Models"
      >
        <EventModelsStep
          guestCount={plannerData.guestCount}
          onApplyModel={(foods, services) => {
            updatePlannerData({ selectedFoods: foods, selectedServices: services });
          }}
          onNext={() => completeAndAdvance('models')}
          onBack={closeDialog}
        />
      </StepDialog>

      <StepDialog
        open={activeDialog === 'submit'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Submit Request"
      >
        <SubmitPlanningStep
          plannerData={plannerData}
          totals={totals}
          onUpdateData={updatePlannerData}
          onSubmit={handleSubmit}
          onBack={closeDialog}
          isSubmitting={isSubmitting}
        />
      </StepDialog>

      <BottomNav />
    </div>
  );
};

export default IndoorEventsPlanner;
