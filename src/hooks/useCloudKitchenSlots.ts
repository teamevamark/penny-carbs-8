import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CloudKitchenSlot } from '@/types/events';

export function useCloudKitchenSlots() {
  return useQuery({
    queryKey: ['cloud-kitchen-slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cloud_kitchen_slots')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as CloudKitchenSlot[];
    },
  });
}

// Helper function to check if a slot is available for ordering
export function isSlotAvailable(slot: CloudKitchenSlot): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Parse slot start time (format: "HH:MM:SS")
  const [hours, minutes] = slot.start_time.split(':').map(Number);
  const slotStartMinutes = hours * 60 + minutes;
  
  // Calculate cutoff time
  const cutoffMinutes = slotStartMinutes - (slot.cutoff_hours_before * 60);
  
  // Check if current time is before cutoff
  return currentTime < cutoffMinutes;
}

// Get time remaining until cutoff
export function getTimeUntilCutoff(slot: CloudKitchenSlot): { hours: number; minutes: number } | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [hours, minutes] = slot.start_time.split(':').map(Number);
  const slotStartMinutes = hours * 60 + minutes;
  const cutoffMinutes = slotStartMinutes - (slot.cutoff_hours_before * 60);
  
  if (currentMinutes >= cutoffMinutes) {
    return null; // Cutoff passed
  }
  
  const remainingMinutes = cutoffMinutes - currentMinutes;
  return {
    hours: Math.floor(remainingMinutes / 60),
    minutes: remainingMinutes % 60,
  };
}

// Format time for display
export function formatSlotTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Hook to get IDs of cloud kitchen slots that are currently OPEN for ordering
// (meal-time window is active per checkIfOrderingOpen). Auto-refreshes every minute
// so items appear/disappear as windows open and close.
export function useActiveCloudKitchenSlotIds() {
  return useQuery({
    queryKey: ['active-cloud-kitchen-slot-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cloud_kitchen_slots')
        .select('id, start_time, end_time, cutoff_hours_before')
        .eq('is_active', true);

      if (error) throw error;
      const open = (data || []).filter((s: any) =>
        checkIfOrderingOpen({
          start_time: s.start_time,
          end_time: s.end_time,
          cutoff_hours_before: s.cutoff_hours_before,
        }).isOpen
      );
      return new Set(open.map((s: any) => s.id));
    },
    refetchInterval: 60000,
  });
}
