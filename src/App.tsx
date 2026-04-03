import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { CartProvider } from "@/contexts/CartContext";

// Customer Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CustomerAuth from "./pages/CustomerAuth";
import Menu from "./pages/Menu";
import ItemDetail from "./pages/ItemDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import IndoorEventBooking from "./pages/IndoorEventBooking";
import CloudKitchenOrder from "./pages/CloudKitchenOrder";
import CloudKitchenCheckout from "./pages/CloudKitchenCheckout";
import HomemadeOrder from "./pages/HomemadeOrder";

// Indoor Events Pages
import IndoorEvents from "./pages/IndoorEvents";
import IndoorEventsQuickBooking from "./pages/IndoorEventsQuickBooking";
import IndoorEventsPlanner from "./pages/IndoorEventsPlanner";

// Cook Pages
import CookLogin from "./pages/cook/CookLogin";
import CookDashboard from "./pages/cook/CookDashboard";

// Delivery Pages
import DeliveryApply from "./pages/delivery/DeliveryApply";
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminItems from "./pages/admin/AdminItems";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminLocations from "./pages/admin/AdminLocations";
import AdminCooks from "./pages/admin/AdminCooks";
import AdminCookProfile from "./pages/admin/AdminCookProfile";
import AdminDeliveryStaff from "./pages/admin/AdminDeliveryStaff";
import AdminReports from "./pages/admin/AdminReports";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminAdmins from "./pages/admin/AdminAdmins";
import AdminWorkAssignment from "./pages/admin/AdminWorkAssignment";
import AdminSpecialOffers from "./pages/admin/AdminSpecialOffers";

// Admin Modules
import IndoorEventsModule from "./pages/admin/indoor-events/IndoorEventsModule";
import CloudKitchenModule from "./pages/admin/cloud-kitchen/CloudKitchenModule";
import HomeDeliveryModule from "./pages/admin/home-delivery/HomeDeliveryModule";
import AdminUsers from "./pages/admin/users/AdminUsers";
import AdminStorageSettings from "./pages/admin/AdminStorageSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Customer Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/customer-auth" element={<CustomerAuth />} />
                
                {/* Indoor Events Routes */}
                <Route path="/indoor-events" element={<IndoorEvents />} />
                <Route path="/indoor-events/quick-booking" element={<IndoorEventsQuickBooking />} />
                <Route path="/indoor-events/planner" element={<IndoorEventsPlanner />} />
                <Route path="/book-event" element={<IndoorEventBooking />} />
                
                {/* Other Service Routes */}
                <Route path="/cloud-kitchen" element={<CloudKitchenOrder />} />
                <Route path="/cloud-kitchen/checkout" element={<CloudKitchenCheckout />} />
                <Route path="/homemade" element={<HomemadeOrder />} />
                <Route path="/menu/:serviceType" element={<Menu />} />
                <Route path="/item/:itemId" element={<ItemDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/order/:orderId" element={<OrderDetail />} />
                <Route path="/profile" element={<Profile />} />
                
                {/* Cook Routes */}
                <Route path="/cook/login" element={<CookLogin />} />
                <Route path="/cook/dashboard" element={<CookDashboard />} />
                
                {/* Delivery Routes */}
                <Route path="/delivery/apply" element={<DeliveryApply />} />
                <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
                
                {/* Admin Routes - Main Dashboard */}
                <Route path="/admin" element={<AdminDashboard />} />
                
                {/* Admin Module Routes */}
                <Route path="/admin/indoor-events/*" element={<IndoorEventsModule />} />
                <Route path="/admin/cloud-kitchen/*" element={<CloudKitchenModule />} />
                <Route path="/admin/home-delivery/*" element={<HomeDeliveryModule />} />
                
                {/* Admin Common Utilities */}
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/items" element={<AdminItems />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/locations" element={<AdminLocations />} />
                <Route path="/admin/cooks" element={<AdminCooks />} />
                <Route path="/admin/cooks/:cookId" element={<AdminCookProfile />} />
                <Route path="/admin/delivery-staff" element={<AdminDeliveryStaff />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/banners" element={<AdminBanners />} />
                <Route path="/admin/special-offers" element={<AdminSpecialOffers />} />
                <Route path="/admin/admins" element={<AdminAdmins />} />
                <Route path="/admin/work-assignment" element={<AdminWorkAssignment />} />
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
