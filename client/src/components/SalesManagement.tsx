
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, Search, DollarSign, FileSpreadsheet, Loader2, AlertTriangle, ShoppingCart, Receipt } from 'lucide-react';
import type { Sales, CreateSalesInput, SalesExcelRow, Product, UserRole } from '../../../server/src/schema';

interface SalesManagementProps {
  userRole: UserRole;
}

interface ExcelRowData {
  [key: string]: string | number | undefined;
  tgl_jual: string;
  f_jual: string;
  acc?: string;
  kode_brg: string;
  nama_brg: string;
  jumlah: number;
  satuan: string;
  hrg_jual: number;
  disc1?: number;
  disc2?: number;
  disc3?: number;
  disc_rp?: number;
  ppn?: number;
  codelg?: string;
  nama_lg?: string;
}

export function SalesManagement({ userRole }: SalesManagementProps) {
  const [sales, setSales] = useState<Sales[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isPOSMode, setIsPOSMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [cart, setCart] = useState<CreateSalesInput[]>([]);

  const [formData, setFormData] = useState<CreateSalesInput>({
    tgl_jual: new Date(),
    f_jual: '',
    acc: null,
    kode_brg: '',
    nama_brg: '',
    jumlah: 1,
    satuan: '',
    hrg_jual: 0,
    disc1: 0,
    disc2: 0,
    disc3: 0,
    disc_rp: 0,
    ppn: null,
    codelg: null,
    nama_lg: null
  });

  const loadSales = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getSales.query();
      setSales(result);
    } catch (error) {
      console.error('Failed to load sales:', error);
      setError('Failed to load sales');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadSales();
    loadProducts();
  }, [loadSales, loadProducts]);

  const filteredSales = sales.filter((sale: Sales) => {
    const matchesSearch = 
      sale.nama_brg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.kode_brg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.f_jual.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.nama_lg && sale.nama_lg.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDate = !dateFilter || 
      sale.tgl_jual.toISOString().split('T')[0] === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  const calculateFinalPrice = (hrg_jual: number, disc1: number, disc2: number, disc3: number, disc_rp: number) => {
    let price = hrg_jual;
    // Apply percentage discounts
    price = price * (1 - disc1 / 100);
    price = price * (1 - disc2 / 100);
    price = price * (1 - disc3 / 100);
    // Apply rupiah discount
    price = price - disc_rp;
    return Math.max(0, price);
  };

  const generateSalesId = () => {
    const now = new Date();
    return `SLS${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  };

  const handleProductSelect = (productCode: string) => {
    const product = products.find((p: Product) => p.kode_brg === productCode);
    if (product) {
      setFormData((prev: CreateSalesInput) => ({
        ...prev,
        kode_brg: product.kode_brg,
        nama_brg: product.nama_brg,
        satuan: product.satuan_default,
        hrg_jual: product.harga_jual
      }));
    }
  };

  const addToCart = () => {
    if (!formData.kode_brg || !formData.nama_brg || formData.jumlah <= 0 || formData.hrg_jual <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    const newItem = {
      ...formData,
      f_jual: generateSalesId() + `-${cart.length + 1}`
    };

    setCart((prev: CreateSalesInput[]) => [...prev, newItem]);
    
    // Reset form for next item
    setFormData({
      tgl_jual: new Date(),
      f_jual: '',
      acc: null,
      kode_brg: '',
      nama_brg: '',
      jumlah: 1,
      satuan: '',
      hrg_jual: 0,
      disc1: 0,
      disc2: 0,
      disc3: 0,
      disc_rp: 0,
      ppn: null,
      codelg: null,
      nama_lg: null
    });
    setSuccess('Item added to cart');
  };

  const removeFromCart = (index: number) => {
    setCart((prev: CreateSalesInput[]) => prev.filter((_: CreateSalesInput, i: number) => i !== index));
  };

  const processCartSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const salesPromises = cart.map((item: CreateSalesInput) =>
        trpc.createSales.mutate(item)
      );

      const newSales = await Promise.all(salesPromises);
      setSales((prev: Sales[]) => [...newSales, ...prev]);
      
      const totalAmount = cart.reduce((sum: number, item: CreateSalesInput) => 
        sum + (calculateFinalPrice(item.hrg_jual, item.disc1, item.disc2, item.disc3, item.disc_rp) * item.jumlah), 0
      );

      setSuccess(`Sale processed successfully! Total: ${formatCurrency(totalAmount)}`);
      setCart([]);
      setIsPOSMode(false);
    } catch (error) {
      console.error('Failed to process sale:', error);
      setError('Failed to process sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const salesId = generateSalesId();
      const newSale = await trpc.createSales.mutate({
        ...formData,
        f_jual: salesId
      });
      
      setSales((prev: Sales[]) => [newSale, ...prev]);
      setSuccess('Sale record created successfully');
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create sale:', error);
      setError('Failed to create sale record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportExcel = async () => {
    if (!importText.trim()) {
      setError('Please paste Excel data');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Parse CSV/Excel data
      const lines = importText.trim().split('\n');
      
      // Validate headers match expected schema
      const expectedHeaders = [
        'tgl_jual', 'f_jual', 'acc', 'kode_brg', 'nama_brg', 'jumlah', 'satuan', 
        'hrg_jual', 'disc1', 'disc2', 'disc3', 'disc_rp', 'ppn', 'codelg', 'nama_lg'
      ];

      const excelData: SalesExcelRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split('\t');
          const row = {} as ExcelRowData;
          
          expectedHeaders.forEach((header: string, index: number) => {
            const value = values[index]?.trim() || '';
            if (['jumlah', 'hrg_jual', 'disc1', 'disc2', 'disc3', 'disc_rp', 'ppn'].includes(header)) {
              row[header] = parseFloat(value) || 0;
            } else if (['acc', 'codelg', 'nama_lg'].includes(header)) {
              row[header] = value || undefined;
            } else if (header === 'tgl_jual') {
              row[header] = value;
            } else {
              row[header] = value;
            }
          });
          
          excelData.push(row as SalesExcelRow);
        }
      }

      const result = await trpc.importSalesFromExcel.mutate(excelData);
      setSuccess(`Import completed: ${result.success} successful, ${result.failed} failed`);
      
      if (result.errors.length > 0) {
        setError(`Errors: ${result.errors.join(', ')}`);
      }
      
      setImportText('');
      setIsImportDialogOpen(false);
      loadSales(); // Reload sales
      
    } catch (error) {
      console.error('Failed to import sales:', error);
      setError('Failed to import Excel data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tgl_jual: new Date(),
      f_jual: '',
      acc: null,
      kode_brg: '',
      nama_brg: '',
      jumlah: 1,
      satuan: '',
      hrg_jual: 0,
      disc1: 0,
      disc2: 0,
      disc3: 0,
      disc_rp: 0,
      ppn: null,
      codelg: null,
      nama_lg: null
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const cartTotal = cart.reduce((sum: number, item: CreateSalesInput) => 
    sum + (calculateFinalPrice(item.hrg_jual, item.disc1, item.disc2, item.disc3, item.disc_rp) * item.jumlah), 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💰 Sales Management</h2>
          <p className="text-gray-600">Process sales and manage transactions</p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => setIsPOSMode(!isPOSMode)}
            className={isPOSMode ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isPOSMode ? '📋 List View' : '🏪 POS Mode'}
          </Button>

          {userRole !== 'cashier' && (
            <>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-green-50 hover:bg-green-100 border-green-200">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>📊 Import Sales Data from Excel</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">📋 Excel Format Instructions:</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Copy and paste your Excel data with these columns (in order):
                      </p>
                      <div className="text-xs font-mono bg-white p-2 rounded border overflow-x-auto">
                        tgl_jual | f_jual | acc | kode_brg | nama_brg | jumlah | satuan | hrg_jual | 
                        disc1 | disc2 | disc3 | disc_rp | ppn | codelg | nama_lg
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="importData">Paste Excel Data (Tab-separated)</Label>
                      <Textarea
                        id="importData"
                        value={importText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImportText(e.target.value)}
                        placeholder="Paste your Excel data here..."
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsImportDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleImportExcel}
                        disabled={isSubmitting || !importText.trim()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Import Data
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Sale
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>➕ Add New Sales Record</DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="tgl_jual">Sale Date *</Label>
                        <Input
                          id="tgl_jual"
                          type="date"
                          value={formData.tgl_jual instanceof Date ? 
                            formData.tgl_jual.toISOString().split('T')[0] : 
                            new Date(formData.tgl_jual).toISOString().split('T')[0]
                          }
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateSalesInput) => ({
                              ...prev,
                              tgl_jual: new Date(e.target.value)
                            }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="product_select">Select Product</Label>
                        <Select onValueChange={handleProductSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product: Product) => (
                              <SelectItem key={product.id} value={product.kode_brg}>
                                {product.nama_brg} ({product.kode_brg}) - Stock: {product.current_stock}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="kode_brg">Product Code *</Label>
                        <Input
                          id="kode_brg"
                          value={formData.kode_brg}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateSalesInput) => ({ ...prev, kode_brg: e.target.value }))
                          }
                          placeholder="Product code"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="nama_brg">Product Name *</Label>
                        <Input
                          id="nama_brg"
                          value={formData.nama_brg}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateSalesInput) => ({ ...prev, nama_brg: e.target.value }))
                          }
                          placeholder="Product name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="satuan">Unit *</Label>
                        <Input
                          id="satuan"
                          value={formData.satuan}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateSalesInput) => ({ ...prev, satuan: e.target.value }))
                          }
                          placeholder="e.g., pcs, kg, liter"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="jumlah">Quantity *</Label>
                        <Input
                          id="jumlah"
                          type="number"
                          value={formData.jumlah}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateSalesInput) => ({ ...prev, jumlah: parseFloat(e.target.value) || 1 }))
                          }
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="hrg_jual">Unit Price *</Label>
                        <Input
                          id="hrg_jual"
                          type="number"
                          value={formData.hrg_jual}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateSalesInput) => ({ ...prev, hrg_jual: parseFloat(e.target.value) || 0 }))
                          }
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    {/* Sale Summary */}
                    {formData.hrg_jual > 0 && formData.jumlah > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">💰 Sale Summary</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium ml-2">
                              {formatCurrency(formData.hrg_jual * formData.jumlah)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Final Price per Unit:</span>
                            <span className="font-medium ml-2">
                              {formatCurrency(calculateFinalPrice(formData.hrg_jual, formData.disc1, formData.disc2, formData.disc3, formData.disc_rp))}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Amount:</span>
                            <span className="font-bold text-lg ml-2 text-green-600">
                              {formatCurrency(calculateFinalPrice(formData.hrg_jual, formData.disc1, formData.disc2, formData.disc3, formData.disc_rp) * formData.jumlah)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Sale'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
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

      {/* POS Mode */}
      {isPOSMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>🏪 Point of Sale</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.filter((p: Product) => p.current_stock > 0).map((product: Product) => (
                        <SelectItem key={product.id} value={product.kode_brg}>
                          {product.nama_brg} - {formatCurrency(product.harga_jual)} (Stock: {product.current_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={formData.jumlah}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSalesInput) => ({ ...prev, jumlah: parseFloat(e.target.value) || 1 }))
                    }
                    min="1"
                  />
                </div>

                <Button 
                  onClick={addToCart} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!formData.kode_brg || formData.jumlah <= 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Shopping Cart */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Receipt className="w-5 h-5" />
                    <span>🛒 Cart ({cart.length})</span>
                  </span>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(cartTotal)}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Cart is empty</p>
                  ) : (
                    cart.map((item: CreateSalesInput, index: number) => {
                      const itemTotal = calculateFinalPrice(item.hrg_jual, item.disc1, item.disc2, item.disc3, item.disc_rp) * item.jumlah;
                      return (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                          <div className="flex-1">
                            <div className="font-medium">{item.nama_brg}</div>
                            <div className="text-gray-600">
                              {item.jumlah} x {formatCurrency(calculateFinalPrice(item.hrg_jual, item.disc1, item.disc2, item.disc3, item.disc_rp))}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{formatCurrency(itemTotal)}</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromCart(index)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={processCartSale}
                    disabled={cart.length === 0 || isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Receipt className="mr-2 h-4 w-4" />
                        Process Sale
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
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
                    placeholder="Search by sale ID, product name, or customer..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)}
                    placeholder="Filter by date"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Showing {filteredSales.length} of {sales.length} sale records
              </div>
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>📋 Sales Records</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading sales...</span>
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery || dateFilter ? 
                    '🔍 No sales found matching your filters' : 
                    '💰 No sales records yet. Process your first sale!'
                  }
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sale ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Discounts</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((sale: Sales) => {
                        const finalPrice = calculateFinalPrice(
                          sale.hrg_jual, 
                          sale.disc1, 
                          sale.disc2, 
                          sale.disc3, 
                          sale.disc_rp
                        );
                        const total = finalPrice * sale.jumlah;
                        
                        return (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono text-sm">
                              {sale.f_jual}
                            </TableCell>
                            <TableCell>
                              {sale.tgl_jual.toLocaleDateString('id-ID')}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{sale.nama_brg}</div>
                                <div className="text-xs text-gray-500">
                                  Code: {sale.kode_brg}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {sale.nama_lg ? (
                                <div>
                                  <div className="font-medium">{sale.nama_lg}</div>
                                  {sale.codelg && (
                                    <div className="text-xs text-gray-500">
                                      {sale.codelg}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">Walk-in</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="font-bold">{sale.jumlah}</div>
                                <div className="text-xs text-gray-500">
                                  {sale.satuan}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="line-through text-gray-400 text-xs">
                                  {formatCurrency(sale.hrg_jual)}
                                </div>
                                <div className="font-medium">
                                  {formatCurrency(finalPrice)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {(sale.disc1 > 0 || sale.disc2 > 0 || sale.disc3 > 0 || sale.disc_rp > 0) ? (
                                <div className="space-y-1">
                                  {sale.disc1 > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {sale.disc1}%
                                    </Badge>
                                  )}
                                  {sale.disc2 > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {sale.disc2}%
                                    </Badge>
                                  )}
                                  {sale.disc3 > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {sale.disc3}%
                                    </Badge>
                                  )}
                                  {sale.disc_rp > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      -{formatCurrency(sale.disc_rp)}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-green-600">
                                {formatCurrency(total)}
                              </div>
                              {sale.ppn && sale.ppn > 0 && (
                                <div className="text-xs text-gray-500">
                                  +PPN {sale.ppn}%
                                </div>
                              )}
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
        </>
      )}
    </div>
  );
}
