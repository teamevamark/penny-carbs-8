// Types for Cook Dish Allocation system

export interface CookDish {
  id: string;
  cook_id: string;
  food_item_id: string;
  allocated_at: string;
  allocated_by: string | null;
  created_at: string;
  updated_at: string;
  food_item?: {
    id: string;
    name: string;
    price: number;
    category_id: string | null;
    is_vegetarian: boolean;
    category?: {
      name: string;
    };
  };
}

export type DishRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CookDishRequest {
  id: string;
  cook_id: string;
  food_item_id: string | null;
  dish_name: string | null;
  dish_description: string | null;
  dish_price: number | null;
  dish_preparation_time_minutes: number | null;
  dish_is_vegetarian: boolean | null;
  dish_category_id: string | null;
  status: DishRequestStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_food_item_id: string | null;
  created_at: string;
  updated_at: string;
  cook?: {
    id: string;
    kitchen_name: string;
    mobile_number: string;
    panchayat?: {
      name: string;
    };
  };
  food_item?: {
    id: string;
    name: string;
    price: number;
    is_vegetarian: boolean;
  };
  dish_category?: {
    id: string;
    name: string;
  };
}

export interface DishRequestFormData {
  food_item_id?: string;
  dish_name?: string;
  dish_description?: string;
  dish_price?: number;
  dish_preparation_time_minutes?: number;
  dish_is_vegetarian?: boolean;
  dish_category_id?: string;
}
