
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign,
  BarChart3,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import type { Purchase, Sales, Product } from '../../../server/src/schema';

interface ReportData {
  totalTransactions: number;
  totalAmount: number;
  totalItems: number;
  totalProducts?: number;
  totalStockValue?: number;
  lowStockItems?: number;
}

export function ReportsSection() {
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<(Purchase | Sales | Product)[]>([]);
  const [summaryData, setSummaryData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const today = new Date();
      let start = new Date();
      let end = new Date();

      // Calculate date range
      if (dateRange === 'today') {
        start = today;
        end = today;
      } else if (dateRange === 'week') {
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (dateRange === 'year') {
        start = new Date(today.getFullYear(), 0, 1);
      } else if (dateRange === 'custom' && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      }

      // Load data based on report type
      if (reportType === 'sales') {
        const sales = await trpc.getSalesByDateRange.query({ 
          startDate: start, 
          endDate: end 
        });
        setReportData(sales);
        
        const totalSales = sales.reduce((sum: number, sale: Sales) => {
          const finalPrice = calculateFinalPrice(sale.hrg_jual, sale.disc1, sale.disc2, sale.disc3, sale.disc_rp);
          return sum + (finalPrice * sale.jumlah);
        }, 0);
        
        setSummaryData({
          totalTransactions: sales.length,
          totalAmount: totalSales,
          totalItems: sales.reduce((sum: number, sale: Sales) => sum + sale.jumlah, 0)
        });
      } else if (reportType === 'purchases') {
        const purchases = await trpc.getPurchasesByDateRange.query({ 
          startDate: start, 
          endDate: end 
        });
        setReportData(purchases);
        
        const totalPurchases = purchases.reduce((sum: number, purchase: Purchase) => {
          const finalPrice = calculateFinalPrice(purchase.hrg_beli, purchase.disc1, purchase.disc2, purchase.disc3, purchase.disc_rp);
          return sum + (finalPrice * purchase.jumlah);
        }, 0);
        
        setSummaryData({
          totalTransactions: purchases.length,
          totalAmount: totalPurchases,
          totalItems: purchases.reduce((sum: number, purchase: Purchase) => sum + purchase.jumlah, 0)
        });
      } else if (reportType === 'stock') {
        const products = await trpc.getProducts.query();
        setReportData(products);
        
        const totalStockValue = products.reduce((sum: number, product: Product) => 
          sum + (product.current_stock * product.harga_beli), 0
        );
        
        setSummaryData({
          totalTransactions: 0,
          totalAmount: 0,
          totalItems: 0,
          totalProducts: products.length,
          totalStockValue: totalStockValue,
          lowStockItems: products.filter((p: Product) => p.current_stock <= p.stok_min).length
        });
      }
      
    } catch (error) {
      console.error('Failed to load report:', error);
      setError('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  }, [reportType, dateRange, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const calculateFinalPrice = (basePrice: number, disc1: number, disc2: number, disc3: number, discRp: number) => {
    let price = basePrice;
    price = price * (1 - disc1 / 100);
    price = price * (1 - disc2 / 100);
    price = price * (1 - disc3 / 100);
    price = price - discRp;
    return Math.max(0, price);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const isSale = (item: Purchase | Sales | Product): item is Sales => {
    return 'f_jual' in item && 'tgl_jual' in item;
  };

  const isPurchase = (item: Purchase | Sales | Product): item is Purchase => {
    return 'f_beli' in item && 'tgl_beli' in item;
  };

  const isProduct = (item: Purchase | Sales | Product): item is Product => {
    return 'satuan_default' in item && 'current_stock' in item;
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    let csvContent = '';
    
    if (reportType === 'sales') {
      const headers = ['Date', 'Sale ID', 'Product', 'Quantity', 'Unit Price', 'Total', 'Customer'];
      csvContent = headers.join(',') + '\n';
      
      reportData.forEach((item: Purchase | Sales | Product) => {
        if (isSale(item)) {
          const finalPrice = calculateFinalPrice(item.hrg_jual, item.disc1, item.disc2, item.disc3, item.disc_rp);
          const total = finalPrice * item.jumlah;
          const row = [
            item.tgl_jual.toISOString().split('T')[0],
            item.f_jual,
            `"${item.nama_brg}"`,
            item.jumlah,
            finalPrice,
            total,
            `"${item.nama_lg || 'Walk-in'}"`
          ];
          csvContent += row.join(',') + '\n';
        }
      });
    } else if (reportType === 'purchases') {
      const headers = ['Date', 'Purchase ID', 'Product', 'Quantity', 'Unit Price', 'Total', 'Supplier'];
      csvContent = headers.join(',') + '\n';
      
      reportData.forEach((item: Purchase | Sales | Product) => {
        if (isPurchase(item)) {
          const finalPrice = calculateFinalPrice(item.hrg_beli, item.disc1, item.disc2, item.disc3, item.disc_rp);
          const total = finalPrice * item.jumlah;
          const row = [
            item.tgl_beli.toISOString().split('T')[0],
            item.f_beli,
            `"${item.nama_brg}"`,
            item.jumlah,
            finalPrice,
            total,
            `"${item.nama || 'Unknown'}"`
          ];
          csvContent += row.join(',') + '\n';
        }
      });
    } else if (reportType === 'stock') {
      const headers = ['Product Code', 'Product Name', 'Current Stock', 'Min Stock', 'Max Stock', 'Unit Price', 'Stock Value', 'Status'];
      csvContent = headers.join(',') + '\n';
      
      reportData.forEach((item: Purchase | Sales | Product) => {
        if (isProduct(item)) {
          const stockValue = item.current_stock * item.harga_beli;
          let status = 'Normal';
          if (item.current_stock === 0) status = 'Out of Stock';
          else if (item.current_stock <= item.stok_min) status = 'Low Stock';
          else if (item.current_stock >= item.stok_max) status = 'High Stock';
          
          const row = [
            item.kode_brg,
            `"${item.nama_brg}"`,
            item.current_stock,
            item.stok_min,
            item.stok_max,
            item.harga_beli,
            stockValue,
            status
          ];
          csvContent += row.join(',') + '\n';
        }
      });
    }

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 Reports & Analytics</h2>
          <p className="text-gray-600">Generate and export business reports</p>
        </div>

        <Button 
          onClick={exportToCSV}
          disabled={reportData.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>⚙️ Report Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">💰 Sales Report</SelectItem>
                  <SelectItem value="purchases">🛒 Purchase Report</SelectItem>
                  <SelectItem value="stock">📦 Stock Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button 
                onClick={loadReport}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportType === 'sales' && (
            <>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-green-600">Total Sales</div>
                      <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(summaryData.totalAmount)}
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-blue-600">Transactions</div>
                      <div className="text-2xl font-bold text-blue-800">
                        {summaryData.totalTransactions.toLocaleString()}
                      </div>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-purple-600">Items Sold</div>
                      <div className="text-2xl font-bold text-purple-800">
                        {summaryData.totalItems.toLocaleString()}
                      </div>
                    </div>
                    <Package className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {reportType === 'purchases' && (
            <>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-orange-600">Total Purchases</div>
                      <div className="text-2xl font-bold text-orange-800">
                        {formatCurrency(summaryData.totalAmount)}
                      </div>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-blue-600">Purchase Orders</div>
                      <div className="text-2xl font-bold text-blue-800">
                        {summaryData.totalTransactions.toLocaleString()}
                      </div>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-green-600">Items Purchased</div>
                      <div className="text-2xl font-bold text-green-800">
                        {summaryData.totalItems.toLocaleString()}
                      </div>
                    </div>
                    <Package className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {reportType === 'stock' && (
            <>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-blue-600">Total Products</div>
                      <div className="text-2xl font-bold text-blue-800">
                        {summaryData.totalProducts?.toLocaleString()}
                      </div>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-green-600">Stock Value</div>
                      <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(summaryData.totalStockValue || 0)}
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-red-600">Low Stock Items</div>
                      <div className="text-2xl font-bold text-red-800">
                        {summaryData.lowStockItems?.toLocaleString()}
                      </div>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Report Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>📋 {reportType === 'sales' ? 'Sales' : reportType === 'purchases' ? 'Purchase' : 'Stock'} Report</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Generating report...</span>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              📊 No data available for the selected criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {reportType === 'sales' && (
                      <>
                        <TableHead>Date</TableHead>
                        <TableHead>Sale ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </>
                    )}
                    
                    {reportType === 'purchases' && (
                      <>
                        <TableHead>Date</TableHead>
                        <TableHead>Purchase ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </>
                    )}

                    {reportType === 'stock' && (
                      <>
                        <TableHead>Product Code</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Min / Max</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Stock Value</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item: Purchase | Sales | Product, index: number) => (
                    <TableRow key={index}>
                      {reportType === 'sales' && isSale(item) && (
                        <>
                          <TableCell>{item.tgl_jual.toLocaleDateString('id-ID')}</TableCell>
                          <TableCell className="font-mono text-sm">{item.f_jual}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.nama_brg}</div>
                              <div className="text-xs text-gray-500">{item.kode_brg}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.nama_lg || 'Walk-in'}</TableCell>
                          <TableCell>{item.jumlah} {item.satuan}</TableCell>
                          <TableCell>{formatCurrency(calculateFinalPrice(item.hrg_jual, item.disc1, item.disc2, item.disc3, item.disc_rp))}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(calculateFinalPrice(item.hrg_jual, item.disc1, item.disc2, item.disc3, item.disc_rp) * item.jumlah)}
                          </TableCell>
                        </>
                      )}

                      {reportType === 'purchases' && isPurchase(item) && (
                        <>
                          <TableCell>{item.tgl_beli.toLocaleDateString('id-ID')}</TableCell>
                          <TableCell className="font-mono text-sm">{item.f_beli}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.nama_brg}</div>
                              <div className="text-xs text-gray-500">{item.kode_brg}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.nama || 'Unknown'}</TableCell>
                          <TableCell>{item.jumlah} {item.satuan}</TableCell>
                          <TableCell>{formatCurrency(calculateFinalPrice(item.hrg_beli, item.disc1, item.disc2, item.disc3, item.disc_rp))}</TableCell>
                          <TableCell className="font-medium text-blue-600">
                            {formatCurrency(calculateFinalPrice(item.hrg_beli, item.disc1, item.disc2, item.disc3, item.disc_rp) * item.jumlah)}
                          </TableCell>
                        </>
                      )}

                      {reportType === 'stock' && isProduct(item) && (
                        <>
                          <TableCell className="font-mono text-sm">{item.kode_brg}</TableCell>
                          <TableCell className="font-medium">{item.nama_brg}</TableCell>
                          <TableCell className="text-center font-bold">{item.current_stock}</TableCell>
                          <TableCell className="text-center text-sm">
                            <div className="text-red-600">Min: {item.stok_min}</div>
                            <div className="text-blue-600">Max: {item.stok_max}</div>
                          </TableCell>
                          <TableCell>{formatCurrency(item.harga_beli)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.current_stock * item.harga_beli)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              item.current_stock === 0 ? 'destructive' :
                              item.current_stock <= item.stok_min ? 'destructive' :
                              item.current_stock >= item.stok_max ? 'secondary' : 'default'
                            }>
                              {item.current_stock === 0 ? '❌ Out of Stock' :
                               item.current_stock <= item.stok_min ? '⚠️ Low Stock' :
                               item.current_stock >= item.stok_max ? '📦 High Stock' : '✅ Normal'}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
