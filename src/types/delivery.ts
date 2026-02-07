// Types for Delivery Staff module

export type DeliveryStaffType = 'fixed_salary' | 'registered_partner';
export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered';

export interface DeliveryStaff {
  id: string;
  user_id: string | null;
  name: string;
  mobile_number: string;
  vehicle_type: string;
  vehicle_number: string | null;
  panchayat_id: string | null;
  assigned_panchayat_ids: string[];
  assigned_wards: number[];
  staff_type: DeliveryStaffType;
  is_active: boolean;
  is_available: boolean;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rating: number;
  total_deliveries: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  panchayat?: {
    id: string;
    name: string;
  };
  panchayats?: Array<{
    id: string;
    name: string;
  }>;
}

export interface DeliveryWallet {
  id: string;
  delivery_staff_id: string;
  collected_amount: number;
  job_earnings: number;
  total_settled: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  delivery_staff_id: string;
  order_id: string | null;
  transaction_type: 'collection' | 'earning' | 'settlement';
  amount: number;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface IndoorEventVehicle {
  id: string;
  order_id: string;
  vehicle_number: string;
  driver_mobile: string;
  driver_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryOrder {
  id: string;
  order_number: string;
  service_type: string;
  total_amount: number;
  delivery_amount?: number | null;
  delivery_status: DeliveryStatus;
  delivery_address: string | null;
  delivery_instructions: string | null;
  estimated_delivery_minutes?: number;
  delivery_eta?: string | null;
  panchayat_id: string;
  ward_number: number;
  created_at: string;
  delivered_at?: string | null;
  customer?: {
    name: string;
    mobile_number: string;
  };
}
