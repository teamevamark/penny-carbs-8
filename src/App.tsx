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
import Menu from "./pages/Menu";
import ItemDetail from "./pages/ItemDetail";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import IndoorEventBooking from "./pages/IndoorEventBooking";
import CloudKitchenOrder from "./pages/CloudKitchenOrder";
import HomemadeOrder from "./pages/HomemadeOrder";

// Cook Pages
import CookLogin from "./pages/cook/CookLogin";
import CookDashboard from "./pages/cook/CookDashboard";

// Delivery Pages
import DeliveryApply from "./pages/delivery/DeliveryApply";
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminItems from "./pages/admin/AdminItems";
import AdminLocations from "./pages/admin/AdminLocations";
import AdminCooks from "./pages/admin/AdminCooks";
import AdminDeliveryStaff from "./pages/admin/AdminDeliveryStaff";
import AdminReports from "./pages/admin/AdminReports";
import AdminBanners from "./pages/admin/AdminBanners";

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
                <Route path="/book-event" element={<IndoorEventBooking />} />
                <Route path="/cloud-kitchen" element={<CloudKitchenOrder />} />
                <Route path="/homemade" element={<HomemadeOrder />} />
                <Route path="/menu/:serviceType" element={<Menu />} />
                <Route path="/item/:itemId" element={<ItemDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/profile" element={<Profile />} />
                
                {/* Cook Routes */}
                <Route path="/cook/login" element={<CookLogin />} />
                <Route path="/cook/dashboard" element={<CookDashboard />} />
                
                {/* Delivery Routes */}
                <Route path="/delivery/apply" element={<DeliveryApply />} />
                <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/items" element={<AdminItems />} />
                <Route path="/admin/locations" element={<AdminLocations />} />
                <Route path="/admin/cooks" element={<AdminCooks />} />
                <Route path="/admin/delivery-staff" element={<AdminDeliveryStaff />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/banners" element={<AdminBanners />} />
                
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
