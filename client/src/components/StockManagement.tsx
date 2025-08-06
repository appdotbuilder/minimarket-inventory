
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Loader2, 
  AlertTriangle,
  ClipboardList,
  BarChart3
} from 'lucide-react';
import type { Product, StockAdjustment, CreateStockAdjustmentInput } from '../../../server/src/schema';

export function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isOpnameDialogOpen, setIsOpnameDialogOpen] = useState(false);
  const [opnameData, setOpnameData] = useState<{ product_id: number; actual_quantity: number }[]>([]);

  const [adjustmentForm, setAdjustmentForm] = useState<CreateStockAdjustmentInput>({
    product_id: 0,
    adjustment_type: 'in',
    quantity: 0,
    reason: '',
    notes: null,
    user_id: 1 // This should be the current user's ID
  });

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStockAdjustments = useCallback(async () => {
    try {
      const result = await trpc.getStockAdjustments.query();
      setStockAdjustments(result);
    } catch (error) {
      console.error('Failed to load stock adjustments:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadStockAdjustments();
  }, [loadProducts, loadStockAdjustments]);

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = 
      product.nama_brg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.kode_brg.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (stockFilter === 'low') {
      matchesFilter = product.current_stock <= product.stok_min;
    } else if (stockFilter === 'high') {
      matchesFilter = product.current_stock >= product.stok_max;
    } else if (stockFilter === 'normal') {
      matchesFilter = product.current_stock > product.stok_min && product.current_stock < product.stok_max;
    } else if (stockFilter === 'zero') {
      matchesFilter = product.current_stock === 0;
    }
    
    return matchesSearch && matchesFilter;
  });

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const adjustment = await trpc.createStockAdjustment.mutate(adjustmentForm);
      setStockAdjustments((prev: StockAdjustment[]) => [adjustment, ...prev]);
      
      // Update product stock in local state
      setProducts((prev: Product[]) =>
        prev.map((p: Product) => {
          if (p.id === adjustmentForm.product_id) {
            let newStock = p.current_stock;
            if (adjustmentForm.adjustment_type === 'in') {
              newStock += adjustmentForm.quantity;
            } else if (adjustmentForm.adjustment_type === 'out') {
              newStock -= adjustmentForm.quantity;
            } else if (adjustmentForm.adjustment_type === 'opname') {
              newStock = adjustmentForm.quantity; // Set to exact quantity
            }
            return { ...p, current_stock: Math.max(0, newStock) };
          }
          return p;
        })
      );

      setSuccess('Stock adjustment created successfully');
      resetAdjustmentForm();
      setIsAdjustmentDialogOpen(false);
    } catch (error) {
      console.error('Failed to create stock adjustment:', error);
      setError('Failed to create stock adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockOpname = async () => {
    if (opnameData.length === 0) {
      setError('Please add products for stock opname');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const opnameItems = opnameData.map((item: { product_id: number; actual_quantity: number }) => ({
        ...item,
        user_id: 1 // This should be the current user's ID
      }));

      

      await trpc.performStockOpname.mutate(opnameItems);
      
      // Update products stock
      setProducts((prev: Product[]) =>
        prev.map((p: Product) => {
          const opnameItem = opnameData.find((item: { product_id: number; actual_quantity: number }) => item.product_id === p.id);
          if (opnameItem) {
            return { ...p, current_stock: opnameItem.actual_quantity };
          }
          return p;
        })
      );

      setSuccess(`Stock opname completed for ${opnameData.length} products`);
      setOpnameData([]);
      setIsOpnameDialogOpen(false);
      loadStockAdjustments(); // Reload adjustments
    } catch (error) {
      console.error('Failed to perform stock opname:', error);
      setError('Failed to perform stock opname');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addToOpname = (productId: number, actualQuantity: number) => {
    setOpnameData((prev: { product_id: number; actual_quantity: number }[]) => {
      const existing = prev.find((item: { product_id: number; actual_quantity: number }) => item.product_id === productId);
      if (existing) {
        return prev.map((item: { product_id: number; actual_quantity: number }) => 
          item.product_id === productId ? { ...item, actual_quantity: actualQuantity } : item
        );
      }
      return [...prev, { product_id: productId, actual_quantity: actualQuantity }];
    });
  };

  const removeFromOpname = (productId: number) => {
    setOpnameData((prev: { product_id: number; actual_quantity: number }[]) => 
      prev.filter((item: { product_id: number; actual_quantity: number }) => item.product_id !== productId)
    );
  };

  const resetAdjustmentForm = () => {
    setAdjustmentForm({
      product_id: 0,
      adjustment_type: 'in',
      quantity: 0,
      reason: '',
      notes: null,
      user_id: 1
    });
  };

  const getStockStatus = (product: Product) => {
    if (product.current_stock === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, icon: '❌' };
    }
    if (product.current_stock <= product.stok_min) {
      return { label: 'Low Stock', variant: 'destructive' as const, icon: '⚠️' };
    }
    if (product.current_stock >= product.stok_max) {
      return { label: 'High Stock', variant: 'secondary' as const, icon: '📦' };
    }
    return { label: 'Normal', variant: 'default' as const, icon: '✅' };
  };

  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case 'in': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'out': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'opname': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📦 Stock Management</h2>
          <p className="text-gray-600">Monitor and adjust inventory stock levels</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isOpnameDialogOpen} onOpenChange={setIsOpnameDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-purple-50 hover:bg-purple-100 border-purple-200">
                <ClipboardList className="w-4 h-4 mr-2" />
                Stock Opname
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>📊 Stock Opname (Physical Count)</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">📋 Instructions:</h4>
                  <p className="text-sm text-blue-700">
                    Enter the actual physical count for each product. The system will automatically 
                    adjust the stock to match your counted quantities.
                  </p>
                </div>

                <div className="space-y-4">
                  {products.slice(0, 10).map((product: Product) => {
                    const opnameItem = opnameData.find((item: { product_id: number; actual_quantity: number }) => item.product_id === product.id);
                    return (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{product.nama_brg}</div>
                          <div className="text-sm text-gray-600">
                            Code: {product.kode_brg} | Current: {product.current_stock}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="Actual count"
                            value={opnameItem?.actual_quantity || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const value = parseInt(e.target.value) || 0;
                              if (value >= 0) {
                                addToOpname(product.id, value);
                              }
                            }}
                            className="w-24"
                            min="0"
                          />
                          {opnameItem && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromOpname(product.id)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {opnameData.length} products selected for opname
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsOpnameDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleStockOpname}
                      disabled={isSubmitting || opnameData.length === 0}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Process Opname'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetAdjustmentForm} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Stock Adjustment
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>📝 Stock Adjustment</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleStockAdjustment} className="space-y-4">
                <div>
                  <Label htmlFor="product_id">Product *</Label>
                  <Select
                    value={adjustmentForm.product_id > 0 ? adjustmentForm.product_id.toString() : ''}
                    onValueChange={(value: string) =>
                      setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({
                        ...prev,
                        product_id: parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: Product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.nama_brg} (Stock: {product.current_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="adjustment_type">Adjustment Type *</Label>
                  <Select
                    value={adjustmentForm.adjustment_type}
                    onValueChange={(value: 'in' | 'out' | 'opname') =>
                      setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({
                        ...prev,
                        adjustment_type: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">📈 Stock In (Add)</SelectItem>
                      <SelectItem value="out">📉 Stock Out (Reduce)</SelectItem>
                      <SelectItem value="opname">🔄 Stock Opname (Set)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={adjustmentForm.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 0
                      }))
                    }
                    min="1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Input
                    id="reason"
                    value={adjustmentForm.reason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({
                        ...prev,
                        reason: e.target.value
                      }))
                    }
                    placeholder="e.g., Damaged goods, Lost items"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={adjustmentForm.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({
                        ...prev,
                        notes: e.target.value || null
                      }))
                    }
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdjustmentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || adjustmentForm.product_id === 0}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Create Adjustment'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">✅ {success}</AlertDescription>
        </Alert>
      )}

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-red-600">Out of Stock</div>
                <div className="text-2xl font-bold text-red-800">
                  {products.filter((p: Product) => p.current_stock === 0).length}
                </div>
              </div>
              <div className="text-2xl">❌</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-orange-600">Low Stock</div>
                <div className="text-2xl font-bold text-orange-800">
                  {products.filter((p: Product) => p.current_stock > 0 && p.current_stock <= p.stok_min).length}
                </div>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600">Normal Stock</div>
                <div className="text-2xl font-bold text-green-800">
                  {products.filter((p: Product) => p.current_stock > p.stok_min && p.current_stock < p.stok_max).length}
                </div>
              </div>
              <div className="text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600">High Stock</div>
                <div className="text-2xl font-bold text-blue-800">
                  {products.filter((p: Product) => p.current_stock >= p.stok_max).length}
                </div>
              </div>
              <div className="text-2xl">📦</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>🔍 Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by product name or code..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="zero">❌ Out of Stock</SelectItem>
                  <SelectItem value="low">⚠️ Low Stock</SelectItem>
                  <SelectItem value="normal">✅ Normal Stock</SelectItem>
                  <SelectItem value="high">📦 High Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>📋 Stock Levels</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading stock data...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || stockFilter !== 'all' ? 
                '🔍 No products found matching your filters' : 
                '📦 No products available'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min / Max</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stock Value</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: Product) => {
                    const status = getStockStatus(product);
                    const stockValue = product.current_stock * product.harga_beli;
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.nama_brg}</div>
                            <div className="text-xs text-gray-500">
                              {product.kode_brg} | {product.satuan_default}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="text-xl font-bold">
                              {product.current_stock}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.satuan_default}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center text-sm">
                            <div className="text-red-600">Min: {product.stok_min}</div>
                            <div className="text-blue-600">Max: {product.stok_max}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.icon} {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR'
                            }).format(stockValue)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {product.updated_at.toLocaleDateString('id-ID')}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>📈 Recent Stock Adjustments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockAdjustments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No stock adjustments yet
            </div>
          ) : (
            <div className="space-y-3">
              {stockAdjustments.slice(0, 10).map((adjustment: StockAdjustment) => {
                const product = products.find((p: Product) => p.id === adjustment.product_id);
                return (
                  <div key={adjustment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getAdjustmentIcon(adjustment.adjustment_type)}
                      <div>
                        <div className="font-medium">
                          {product?.nama_brg || 'Unknown Product'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {adjustment.reason}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {adjustment.adjustment_type === 'in' ? '+' : adjustment.adjustment_type === 'out' ? '-' : '='}
                        {adjustment.quantity}
                      </div>
                      <div className="text-xs text-gray-500">
                        {adjustment.created_at.toLocaleDateString('id-ID')}
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
  );
}
