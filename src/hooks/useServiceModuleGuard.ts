import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveServiceTypes } from '@/hooks/useServiceModules';
import { toast } from '@/hooks/use-toast';

/**
 * Redirects to home if the given service module is inactive.
 * Call at the top of route-level page components.
 */
export function useServiceModuleGuard(serviceType: string) {
  const { data: activeTypes, isLoading } = useActiveServiceTypes();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && activeTypes && !activeTypes.includes(serviceType)) {
      toast({ title: 'This service is currently unavailable.', variant: 'destructive' });
      navigate('/', { replace: true });
    }
  }, [isLoading, activeTypes, serviceType, navigate]);

  return { isLoading, isActive: activeTypes?.includes(serviceType) ?? true };
}
