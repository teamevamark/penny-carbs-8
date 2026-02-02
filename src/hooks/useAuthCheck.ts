import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if user is authenticated before performing an action.
 * Returns a function that wraps callbacks and shows login dialog if needed.
 */
export const useAuthCheck = () => {
  const { user, role } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isCustomerLoggedIn = !!user && role === 'customer';
  const isStaffBrowsing = sessionStorage.getItem('staff_browse_mode') === 'true';
  const isAuthenticated = !!user || isStaffBrowsing;

  /**
   * Check auth before performing an action.
   * If not authenticated, shows login dialog and queues the action.
   * If authenticated, executes the action immediately.
   */
  const requireAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
      } else {
        setPendingAction(() => action);
        setShowLoginDialog(true);
      }
    },
    [isAuthenticated]
  );

  /**
   * Called when login is successful - executes pending action if any
   */
  const onLoginSuccess = useCallback(() => {
    if (pendingAction) {
      // Small delay to ensure auth state is updated
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 100);
    }
  }, [pendingAction]);

  /**
   * Close the login dialog
   */
  const closeLoginDialog = useCallback(() => {
    setShowLoginDialog(false);
    setPendingAction(null);
  }, []);

  return {
    isAuthenticated,
    isCustomerLoggedIn,
    isStaffBrowsing,
    showLoginDialog,
    setShowLoginDialog,
    requireAuth,
    onLoginSuccess,
    closeLoginDialog,
  };
};
