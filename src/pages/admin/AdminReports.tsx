import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Download, 
  FileSpreadsheet, 
  BarChart3,
  Calendar as CalendarIcon,
  Settings,
  TrendingUp,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSalesReport, useCookPerformanceReport, useDeliverySettlementReport, useReferralReport, usePanchayats, useVehicleRentReport } from '@/hooks/useReports';
import { useProfitLossReport } from '@/hooks/useProfitLoss';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { ReportFilters } from '@/types/reports';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const AdminReports: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'super_admin' || role === 'admin';

  const [filters, setFilters] = useState<ReportFilters>({
    startDate: undefined,
    endDate: undefined,
    serviceType: 'all',
    panchayatId: 'all',
  });

  const { data: panchayats } = usePanchayats();
  const { data: salesData, isLoading: salesLoading } = useSalesReport(filters);
  const { data: cookData, isLoading: cookLoading } = useCookPerformanceReport(filters);
  const { data: deliveryData, isLoading: deliveryLoading } = useDeliverySettlementReport();
  const { data: referralData, isLoading: referralLoading } = useReferralReport();
  const { data: profitLossData, isLoading: profitLossLoading } = useProfitLossReport(filters);
  const { data: vehicleRentData, isLoading: vehicleRentLoading } = useVehicleRentReport(filters);

  // Process sales data for display
  const salesSummary = useMemo(() => {
    if (!salesData) return null;
    
    const byPanchayat = salesData.reduce((acc, order) => {
      const panchayatName = (order.panchayats as { name: string } | null)?.name || 'Unknown';
      if (!acc[panchayatName]) {
        acc[panchayatName] = {
          panchayat_name: panchayatName,
          total_orders: 0,
          total_sales: 0,
          delivered_orders: 0,
          cancelled_orders: 0,
          pending_orders: 0,
        };
      }
      acc[panchayatName].total_orders++;
      acc[panchayatName].total_sales += order.total_amount || 0;
      if (order.status === 'delivered') acc[panchayatName].delivered_orders++;
      if (order.status === 'cancelled') acc[panchayatName].cancelled_orders++;
      if (order.status === 'pending') acc[panchayatName].pending_orders++;
      return acc;
    }, {} as Record<string, { panchayat_name: string; total_orders: number; total_sales: number; delivered_orders: number; cancelled_orders: number; pending_orders: number }>);

    return Object.values(byPanchayat);
  }, [salesData]);

  const totalStats = useMemo(() => {
    if (!salesData) return { orders: 0, sales: 0, delivered: 0, cancelled: 0 };
    return {
      orders: salesData.length,
      sales: salesData.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      delivered: salesData.filter(o => o.status === 'delivered').length,
      cancelled: salesData.filter(o => o.status === 'cancelled').length,
    };
  }, [salesData]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Settings className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <Button className="mt-6" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const chartConfig = {
    orders: { label: 'Orders', color: 'hsl(var(--primary))' },
    sales: { label: 'Sales', color: 'hsl(var(--success))' },
  };

  const pieColors = ['hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--warning))'];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex h-16 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-lg font-semibold">Reports & Analytics</h1>
            <p className="text-xs text-muted-foreground">View and export reports</p>
          </div>
        </div>
      </header>

      <main className="p-4">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !filters.startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(filters.startDate, "PPP") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filters.startDate} onSelect={(date) => setFilters(f => ({ ...f, startDate: date }))} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !filters.endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(filters.endDate, "PPP") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filters.endDate} onSelect={(date) => setFilters(f => ({ ...f, endDate: date }))} />
              </PopoverContent>
            </Popover>

            <Select value={filters.serviceType} onValueChange={(v) => setFilters(f => ({ ...f, serviceType: v }))}>
              <SelectTrigger><SelectValue placeholder="Order Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="indoor_events">Indoor Events</SelectItem>
                <SelectItem value="cloud_kitchen">Cloud Kitchen</SelectItem>
                <SelectItem value="homemade">Homemade</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.panchayatId} onValueChange={(v) => setFilters(f => ({ ...f, panchayatId: v }))}>
              <SelectTrigger><SelectValue placeholder="Panchayat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Panchayats</SelectItem>
                {panchayats?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalStats.orders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">₹{totalStats.sales.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-cloud-kitchen">{totalStats.delivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{totalStats.cancelled}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pnl" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pnl">P&L</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="cook">Cook</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="referral">Referral</TabsTrigger>
          </TabsList>

          {/* Profit & Loss Tab */}
          <TabsContent value="pnl" className="space-y-4">
            {/* P&L Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold text-primary">₹{profitLossData?.summary.totalRevenue?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold text-primary">₹{profitLossData?.summary.platformMarginRevenue?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Platform Margin</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold text-warning">₹{profitLossData?.summary.cookPayouts?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Cook Payouts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold text-muted-foreground">₹{profitLossData?.summary.deliveryPayouts?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Delivery Payouts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold text-destructive">₹{profitLossData?.summary.referralCommissions?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Referral Commissions</p>
                </CardContent>
              </Card>
              <Card className="bg-success/10 border-success/30">
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold text-success">₹{profitLossData?.summary.netProfit?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                </CardContent>
              </Card>
            </div>

            {/* P&L by Service Type */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Revenue by Service Type
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => profitLossData?.byService && exportToCSV(profitLossData.byService as unknown as Record<string, unknown>[], 'pnl-by-service')}>
                    <Download className="mr-2 h-4 w-4" />CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => profitLossData?.byService && exportToExcel(profitLossData.byService as unknown as Record<string, unknown>[], 'pnl-by-service')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {profitLossLoading ? (
                  <p className="text-center text-muted-foreground">Loading...</p>
                ) : profitLossData?.byService && profitLossData.byService.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service Type</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-right">Platform Margin</TableHead>
                        <TableHead className="text-right">Cook Payouts</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitLossData.byService.map((row) => (
                        <TableRow key={row.service_type}>
                          <TableCell className="capitalize">{row.service_type.replace('_', ' ')}</TableCell>
                          <TableCell className="text-right">{row.order_count}</TableCell>
                          <TableCell className="text-right">₹{row.total_revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-primary font-medium">₹{row.platform_margin.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{row.cook_payouts.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-success">
                            {row.total_revenue > 0 ? ((row.platform_margin / row.total_revenue) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* P&L Trend Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Profit Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profitLossLoading ? (
                  <p className="text-center text-muted-foreground">Loading...</p>
                ) : profitLossData?.byDate && profitLossData.byDate.length > 0 ? (
                  <div className="h-72">
                    <ChartContainer config={{
                      revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
                      margin: { label: 'Platform Margin', color: 'hsl(var(--success))' },
                    }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={profitLossData.byDate}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" fontSize={12} tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
                          <YAxis fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line type="monotone" dataKey="total_revenue" name="Revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="platform_margin" name="Platform Margin" stroke="var(--color-margin)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sales Report by Panchayat</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => salesSummary && exportToCSV(salesSummary, 'sales-report')}>
                    <Download className="mr-2 h-4 w-4" />CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => salesSummary && exportToExcel(salesSummary, 'sales-report')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <p className="text-center text-muted-foreground">Loading...</p>
                ) : salesSummary && salesSummary.length > 0 ? (
                  <>
                    <div className="mb-6 h-64">
                      <ChartContainer config={chartConfig}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesSummary.slice(0, 10)}>
                            <XAxis dataKey="panchayat_name" fontSize={12} />
                            <YAxis fontSize={12} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="total_orders" fill="var(--color-orders)" radius={4} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Panchayat</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-right">Delivered</TableHead>
                          <TableHead className="text-right">Cancelled</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesSummary.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.panchayat_name}</TableCell>
                            <TableCell className="text-right">{row.total_orders}</TableCell>
                            <TableCell className="text-right">₹{row.total_sales.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{row.delivered_orders}</TableCell>
                            <TableCell className="text-right">{row.cancelled_orders}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cook" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cook Performance Report</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => cookData && exportToCSV(cookData, 'cook-performance')}>
                    <Download className="mr-2 h-4 w-4" />CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cookData && exportToExcel(cookData, 'cook-performance')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cookLoading ? (
                  <p className="text-center text-muted-foreground">Loading...</p>
                ) : cookData && cookData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kitchen Name</TableHead>
                        <TableHead className="text-right">Total Orders</TableHead>
                        <TableHead className="text-right">Accepted</TableHead>
                        <TableHead className="text-right">Rejected</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cookData.map((row) => (
                        <TableRow key={row.cook_id}>
                          <TableCell>{row.kitchen_name}</TableCell>
                          <TableCell className="text-right">{row.total_orders}</TableCell>
                          <TableCell className="text-right">{row.accepted_orders}</TableCell>
                          <TableCell className="text-right">{row.rejected_orders}</TableCell>
                          <TableCell className="text-right">{row.completed_orders}</TableCell>
                          <TableCell className="text-right">{row.average_rating.toFixed(1)}</TableCell>
                          <TableCell className="text-right">₹{row.total_earnings.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground">No cooks registered yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            {/* Indoor Event Vehicle Rents */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Indoor Event Vehicle Rents (Delivery Expense)</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!vehicleRentData) return;
                    const exportData = vehicleRentData.map((v: any) => ({
                      order_number: v.orders?.order_number || '',
                      vehicle_number: v.vehicle_number,
                      driver_name: v.driver_name || '',
                      driver_mobile: v.driver_mobile,
                      rent_amount: v.rent_amount,
                      panchayat: v.orders?.panchayats?.name || '',
                      date: format(new Date(v.created_at), 'dd/MM/yyyy'),
                    }));
                    exportToCSV(exportData, 'vehicle-rent-report');
                  }}>
                    <Download className="mr-2 h-4 w-4" />CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {vehicleRentLoading ? (
                  <p className="text-center text-muted-foreground">Loading...</p>
                ) : vehicleRentData && vehicleRentData.length > 0 ? (
                  <>
                    <div className="mb-4 p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Total Vehicle Rent Expense</p>
                      <p className="text-2xl font-bold text-destructive">
                        ₹{vehicleRentData.reduce((sum: number, v: any) => sum + (v.rent_amount || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Panchayat</TableHead>
                          <TableHead className="text-right">Rent (₹)</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicleRentData.map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-mono text-xs">{v.orders?.order_number || '-'}</TableCell>
                            <TableCell className="font-mono">{v.vehicle_number}</TableCell>
                            <TableCell>{v.driver_name || '-'}</TableCell>
                            <TableCell>{v.orders?.panchayats?.name || '-'}</TableCell>
                            <TableCell className="text-right font-medium text-destructive">₹{(v.rent_amount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-xs">{format(new Date(v.created_at), 'dd MMM yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">No vehicle rent records found</p>
                )}
              </CardContent>
            </Card>

            {/* Delivery Staff Settlements */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Delivery Settlement Report</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => deliveryData && exportToCSV(deliveryData, 'delivery-settlement')}>
                    <Download className="mr-2 h-4 w-4" />CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deliveryData && exportToExcel(deliveryData, 'delivery-settlement')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {deliveryLoading ? (
                  <p className="text-center text-muted-foreground">Loading...</p>
                ) : deliveryData && deliveryData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead className="text-right">Deliveries</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                        <TableHead className="text-right">Settled</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryData.map((row) => (
                        <TableRow key={row.staff_id}>
                          <TableCell>{row.staff_name}</TableCell>
                          <TableCell className="text-right">{row.total_deliveries}</TableCell>
                          <TableCell className="text-right">₹{row.collected_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{row.job_earnings.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{row.total_settled.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-warning">₹{row.pending_settlement.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground">No delivery staff registered yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referral" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Referral Commission Report</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => referralData && exportToCSV(referralData, 'referral-commission')}>
                    <Download className="mr-2 h-4 w-4" />CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => referralData && exportToExcel(referralData, 'referral-commission')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {referralLoading ? (
                  <p className="text-center text-muted-foreground">Loading...</p>
                ) : referralData && referralData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referrer</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Referrals</TableHead>
                        <TableHead className="text-right">Total Commission</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralData.map((row) => (
                        <TableRow key={row.referrer_id}>
                          <TableCell>{row.referrer_name}</TableCell>
                          <TableCell className="font-mono">{row.referral_code}</TableCell>
                          <TableCell className="text-right">{row.total_referrals}</TableCell>
                          <TableCell className="text-right">₹{row.total_commission.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-warning">₹{row.pending_commission.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-success">₹{row.paid_commission.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground">No referrals yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminReports;
