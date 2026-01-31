import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Panchayat } from '@/types/database';

interface LocationContextType {
  panchayats: Panchayat[];
  selectedPanchayat: Panchayat | null;
  selectedWardNumber: number | null;
  isLoading: boolean;
  getWardsForPanchayat: (panchayat: Panchayat) => number[];
  isLocationSet: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [panchayats, setPanchayats] = useState<Panchayat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all panchayats on mount
  useEffect(() => {
    const fetchPanchayats = async () => {
      try {
        const { data, error } = await supabase
          .from('panchayats')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        if (data) {
          setPanchayats(data as Panchayat[]);
        }
      } catch (error) {
        console.error('Error fetching panchayats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPanchayats();
  }, []);

  // Derive location from user profile - strictly tied to registered location
  const selectedPanchayat = panchayats.find(p => p.id === profile?.panchayat_id) || null;
  const selectedWardNumber = profile?.ward_number ?? null;
  const isLocationSet = Boolean(selectedPanchayat && selectedWardNumber);

  // Generate ward numbers 1 to ward_count for a panchayat
  const getWardsForPanchayat = (panchayat: Panchayat): number[] => {
    return Array.from({ length: panchayat.ward_count }, (_, i) => i + 1);
  };

  return (
    <LocationContext.Provider
      value={{
        panchayats,
        selectedPanchayat,
        selectedWardNumber,
        isLoading,
        getWardsForPanchayat,
        isLocationSet,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
