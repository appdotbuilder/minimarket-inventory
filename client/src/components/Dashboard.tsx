
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart,
  Users,
  Loader2
} from 'lucide-react';
import type { DashboardSummary } from '../../../server/src/schema';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>({
    total_stock_value: 0,
    total_products: 0,
    low_stock_count: 0,
    daily_sales: 0,
    daily_purchases: 0,
    pending_orders: 0
  });
  const [salesData, setSalesData] = useState<{ date: string; sales: number; purchases: number }[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<{ product: string; current_stock: number; min_stock: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load summary data
      const summaryData = await trpc.getDashboardSummary.query();
      setSummary(summaryData);

      // Load sales chart data (last 30 days)
      const salesChartData = await trpc.getDailySalesData.query(30);
      setSalesData(salesChartData);

      // Load low stock alerts
      const alerts = await trpc.getLowStockAlerts.query();
      setLowStockAlerts(alerts);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">📊 Dashboard Overview</h2>
        <p className="text-blue-100">
          Welcome to your minimarket inventory system. Here's what's happening today.
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Stock Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              {formatCurrency(summary.total_stock_value)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Current inventory value
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {summary.total_products.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Active products in inventory
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              Daily Sales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              {formatCurrency(summary.daily_sales)}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              Today's sales revenue
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Daily Purchases
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">
              {formatCurrency(summary.daily_purchases)}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Today's purchases
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>⚠️ Low Stock Alerts</span>
              <Badge variant="destructive">{lowStockAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockAlerts.length === 0 ? (
              <p className="text-gray-500 text-sm">✅ All products are well-stocked!</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {lowStockAlerts.slice(0, 5).map((alert, index) => (
                  <Alert key={index} className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-sm">
                      <div className="font-medium text-orange-800">{alert.product}</div>
                      <div className="text-orange-600 mt-1">
                        Current: {alert.current_stock} | Minimum: {alert.min_stock}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
                {lowStockAlerts.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {lowStockAlerts.length - 5} more items
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>📈 Sales Trend (Last 7 Days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length === 0 ? (
              <p className="text-gray-500 text-sm">No sales data available</p>
            ) : (
              <div className="space-y-3">
                {salesData.slice(-7).reverse().map((day, index) => {
                  const date = new Date(day.date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${
                      isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                    }`}>
                      <div>
                        <div className="font-medium text-gray-900">
                          {isToday ? '🌟 Today' : date.toLocaleDateString('id-ID', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-sm text-gray-600">
                          Sales: {formatCurrency(day.sales)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          +{day.sales > 0 ? Math.round((day.sales / 1000000) * 10) / 10 : 0}M
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-500" />
            <span>🚀 Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
              <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-blue-800">Add Product</div>
              <div className="text-xs text-blue-600">Manage inventory</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
              <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-green-800">New Purchase</div>
              <div className="text-xs text-green-600">Record purchase</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
              <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-orange-800">Process Sale</div>
              <div className="text-xs text-orange-600">POS system</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-purple-800">View Reports</div>
              <div className="text-xs text-purple-600">Analytics</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
