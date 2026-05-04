// Shared logic to determine if a cloud kitchen slot is currently open for ordering.

export interface SlotWindow {
  start_time: string; // "HH:MM:SS"
  end_time: string;   // "HH:MM:SS"
  cutoff_hours_before: number;
}

export interface OrderingWindowStatus {
  isOpen: boolean;
  timeRemaining: { hours: number; minutes: number } | null;
  statusLabel: 'open' | 'closing_soon' | 'closed';
}

export function checkIfOrderingOpen(slot: SlotWindow): OrderingWindowStatus {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHours, startMins] = slot.start_time.split(':').map(Number);
  const slotStartMinutes = startHours * 60 + startMins;

  const [endHours, endMins] = slot.end_time.split(':').map(Number);
  const slotEndMinutes = endHours * 60 + endMins;

  let cutoffMinutes = slotStartMinutes - (slot.cutoff_hours_before * 60);
  if (cutoffMinutes < 0) {
    cutoffMinutes = 24 * 60 + cutoffMinutes;
  }

  const hasSlotEndedToday = slotEndMinutes > slotStartMinutes
    ? currentMinutes >= slotEndMinutes
    : (currentMinutes >= slotEndMinutes && currentMinutes < slotStartMinutes);

  if (hasSlotEndedToday) {
    return { isOpen: false, timeRemaining: null, statusLabel: 'closed' };
  }

  let isBeforeCutoff: boolean;
  if (cutoffMinutes < 0 || cutoffMinutes > slotStartMinutes) {
    const wrappedCutoff = cutoffMinutes < 0 ? 24 * 60 + cutoffMinutes : cutoffMinutes;
    isBeforeCutoff = currentMinutes < slotStartMinutes &&
      (currentMinutes < wrappedCutoff || currentMinutes >= slotStartMinutes);
  } else {
    isBeforeCutoff = currentMinutes < cutoffMinutes;
  }

  if (!isBeforeCutoff) {
    return { isOpen: false, timeRemaining: null, statusLabel: 'closed' };
  }

  let remainingMinutes = cutoffMinutes - currentMinutes;
  if (remainingMinutes < 0) {
    remainingMinutes = 24 * 60 + remainingMinutes;
  }

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const statusLabel: 'open' | 'closing_soon' = remainingMinutes <= 60 ? 'closing_soon' : 'open';

  return { isOpen: true, timeRemaining: { hours, minutes }, statusLabel };
}
