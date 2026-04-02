import React from 'react';
import AppHeader from '@/components/customer/AppHeader';
import OperationalModules from '@/components/customer/OperationalModules';
import BannerCarousel from '@/components/customer/BannerCarousel';
import SpecialOffers from '@/components/customer/SpecialOffers';
import FeaturedItems from '@/components/customer/FeaturedItems';
import ServiceCards from '@/components/customer/ServiceCards';
import PopularItems from '@/components/customer/PopularItems';
import CartButton from '@/components/customer/CartButton';
import BottomNav from '@/components/customer/BottomNav';
import { useActiveServiceTypes } from '@/hooks/useServiceModules';

const Index: React.FC = () => {
  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };
  const { data: activeTypes } = useActiveServiceTypes();

  const isActive = (type: string) => activeTypes?.includes(type) ?? false;

  return (
    <div className="min-h-screen pb-20 bg-[#fd5d08]">
      <AppHeader onSearch={handleSearch} />
      <OperationalModules />
      
      <main>
        <BannerCarousel />
        <SpecialOffers />
        <FeaturedItems activeServiceTypes={activeTypes} />
        <ServiceCards />
        
        {isActive('indoor_events') && (
          <PopularItems 
            serviceType="indoor_events" 
            title="Popular for Events (പാർട്ടി ഓർഡർ)" 
            gradientClass="text-gradient-events" 
            bgGradient="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-rose-950/10" 
          />
        )}
        
        {isActive('cloud_kitchen') && (
          <PopularItems 
            serviceType="cloud_kitchen" 
            title="Most Ordered from Cloud Kitchen (പ്രാതൽ/ഊണ്/അത്താഴം)" 
            gradientClass="text-gradient-kitchen" 
            bgGradient="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950/30 dark:via-cyan-950/20 dark:to-teal-950/10" 
          />
        )}
        
        {isActive('homemade') && (
          <PopularItems 
            serviceType="homemade" 
            title="Homemade Favorites (വീട്ടിലെ ഭക്ഷണങ്ങൾ)" 
            gradientClass="text-gradient-homemade" 
            bgGradient="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/10" 
          />
        )}
      </main>

      <CartButton />
      <BottomNav />
    </div>
  );
};

export default Index;
