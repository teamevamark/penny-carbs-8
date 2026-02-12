export type AppRole = 'super_admin' | 'admin' | 'cook' | 'delivery_staff' | 'customer';
export type ServiceType = 'indoor_events' | 'cloud_kitchen' | 'homemade';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Panchayat {
  id: string;
  name: string;
  code: string | null;
  ward_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  mobile_number: string;
  panchayat_id: string | null;
  ward_number: number | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface AdminPermissions {
  id: string;
  user_id: string;
  can_manage_orders: boolean;
  can_register_cooks: boolean;
  can_register_delivery_staff: boolean;
  can_assign_orders: boolean;
  can_approve_settlements: boolean;
  can_access_reports: boolean;
  can_manage_items: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodCategory {
  id: string;
  name: string;
  service_type: ServiceType | null;
  service_types: string[];
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  service_type: ServiceType;
  price: number;
  is_vegetarian: boolean;
  is_available: boolean;
  min_images: number;
  max_images: number;
  preparation_time_minutes: number | null;
  created_by: string | null;
  panchayat_id: string | null;
  ward_number: number | null;
  platform_margin_type: string | null;
  platform_margin_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface FoodItemImage {
  id: string;
  food_item_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface FoodItemWithImages extends FoodItem {
  images: FoodItemImage[];
  category?: FoodCategory;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  service_type: ServiceType | null;
  is_active: boolean;
  display_order: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  service_type: ServiceType;
  status: OrderStatus;
  total_amount: number;
  delivery_address: string | null;
  delivery_instructions: string | null;
  panchayat_id: string;
  ward_number: number;
  assigned_cook_id: string | null;
  assigned_delivery_id: string | null;
  event_date: string | null;
  event_details: string | null;
  delivery_status: string | null;
  delivery_eta: string | null;
  delivered_at: string | null;
  cook_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  food_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string | null;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  food_item_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  food_item?: FoodItemWithImages;
}

export interface Settlement {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  panchayat_id: string | null;
  ward_number: number | null;
  created_at: string;
  updated_at: string;
}
