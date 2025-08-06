
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Package, AlertTriangle, Edit, Loader2 } from 'lucide-react';
import type { Product, CreateProductInput, Category } from '../../../server/src/schema';

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<CreateProductInput>({
    kode_brg: '',
    nama_brg: '',
    kategori_id: null,
    satuan_default: '',
    isi_per_satuan: 1,
    harga_beli: 0,
    harga_jual: 0,
    stok_min: 0,
    stok_max: 0,
    barcode: null
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

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  const filteredProducts = products.filter((product: Product) =>
    product.nama_brg.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.kode_brg.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (editingProduct) {
        const updatedProduct = await trpc.updateProduct.mutate({
          id: editingProduct.id,
          data: formData
        });
        setProducts((prev: Product[]) =>
          prev.map((p: Product) => p.id === editingProduct.id ? updatedProduct : p)
        );
        setSuccess('Product updated successfully');
      } else {
        const newProduct = await trpc.createProduct.mutate(formData);
        setProducts((prev: Product[]) => [...prev, newProduct]);
        setSuccess('Product created successfully');
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save product:', error);
      setError('Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      kode_brg: '',
      nama_brg: '',
      kategori_id: null,
      satuan_default: '',
      isi_per_satuan: 1,
      harga_beli: 0,
      harga_jual: 0,
      stok_min: 0,
      stok_max: 0,
      barcode: null
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      kode_brg: product.kode_brg,
      nama_brg: product.nama_brg,
      kategori_id: product.kategori_id,
      satuan_default: product.satuan_default,
      isi_per_satuan: product.isi_per_satuan,
      harga_beli: product.harga_beli,
      harga_jual: product.harga_jual,
      stok_min: product.stok_min,
      stok_max: product.stok_max,
      barcode: product.barcode
    });
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getStockStatus = (product: Product) => {
    if (product.current_stock <= product.stok_min) {
      return { label: 'Low Stock', variant: 'destructive' as const, icon: '⚠️' };
    }
    if (product.current_stock >= product.stok_max) {
      return { label: 'High Stock', variant: 'secondary' as const, icon: '📦' };
    }
    return { label: 'Normal', variant: 'default' as const, icon: '✅' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📦 Product Management</h2>
          <p className="text-gray-600">Manage your product inventory and information</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kode_brg">Product Code *</Label>
                  <Input
                    id="kode_brg"
                    value={formData.kode_brg}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, kode_brg: e.target.value }))
                    }
                    placeholder="e.g., BRG001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nama_brg">Product Name *</Label>
                  <Input
                    id="nama_brg"
                    value={formData.nama_brg}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, nama_brg: e.target.value }))
                    }
                    placeholder="e.g., Indomie Goreng"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="kategori_id">Category</Label>
                  <Select
                    value={formData.kategori_id?.toString() || 'none'}
                    onValueChange={(value: string) =>
                      setFormData((prev: CreateProductInput) => ({
                        ...prev,
                        kategori_id: value === 'none' ? null : parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="satuan_default">Default Unit *</Label>
                  <Input
                    id="satuan_default"
                    value={formData.satuan_default}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, satuan_default: e.target.value }))
                    }
                    placeholder="e.g., pcs, kg, liter"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="isi_per_satuan">Content per Unit *</Label>
                  <Input
                    id="isi_per_satuan"
                    type="number"
                    value={formData.isi_per_satuan}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, isi_per_satuan: parseFloat(e.target.value) || 1 }))
                    }
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({
                        ...prev,
                        barcode: e.target.value || null
                      }))
                    }
                    placeholder="Scan or enter barcode"
                  />
                </div>

                <div>
                  <Label htmlFor="harga_beli">Purchase Price *</Label>
                  <Input
                    id="harga_beli"
                    type="number"
                    value={formData.harga_beli}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, harga_beli: parseFloat(e.target.value) || 0 }))
                    }
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="harga_jual">Selling Price *</Label>
                  <Input
                    id="harga_jual"
                    type="number"
                    value={formData.harga_jual}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, harga_jual: parseFloat(e.target.value) || 0 }))
                    }
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="stok_min">Minimum Stock *</Label>
                  <Input
                    id="stok_min"
                    type="number"
                    value={formData.stok_min}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, stok_min: parseInt(e.target.value) || 0 }))
                    }
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="stok_max">Maximum Stock *</Label>
                  <Input
                    id="stok_max"
                    type="number"
                    value={formData.stok_max}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, stok_max: parseInt(e.target.value) || 0 }))
                    }
                    min="0"
                    required
                  />
                </div>
              </div>

              {formData.harga_jual > 0 && formData.harga_beli > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-800">
                    💰 Profit Margin: {formatCurrency(formData.harga_jual - formData.harga_beli)} 
                    ({((formData.harga_jual - formData.harga_beli) / formData.harga_beli * 100).toFixed(1)}%)
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
                      {editingProduct ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>🔍 Search Products</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by product name, code, or barcode..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>📋 Product List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading products...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? '🔍 No products found matching your search' : '📦 No products yet. Add your first product!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: Product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">
                          {product.kode_brg}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.nama_brg}</div>
                            {product.barcode && (
                              <div className="text-xs text-gray-500">
                                Barcode: {product.barcode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.satuan_default}</TableCell>
                        <TableCell>{formatCurrency(product.harga_beli)}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(product.harga_jual)}
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-bold">{product.current_stock}</div>
                            <div className="text-xs text-gray-500">
                              Min: {product.stok_min} | Max: {product.stok_max}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>
                            {stockStatus.icon} {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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
    </div>
  );
}
