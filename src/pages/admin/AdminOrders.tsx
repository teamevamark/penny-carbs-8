import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import OrdersTabContent from '@/components/admin/orders/OrdersTabContent';

const AdminOrders: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Orders Management</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="indoor_events">Indoor Events</TabsTrigger>
          <TabsTrigger value="cloud_kitchen">Cloud Kitchen</TabsTrigger>
          <TabsTrigger value="homemade">Home Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <OrdersTabContent />
        </TabsContent>
        <TabsContent value="indoor_events">
          <OrdersTabContent serviceType="indoor_events" />
        </TabsContent>
        <TabsContent value="cloud_kitchen">
          <OrdersTabContent serviceType="cloud_kitchen" />
        </TabsContent>
        <TabsContent value="homemade">
          <OrdersTabContent serviceType="homemade" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOrders;
