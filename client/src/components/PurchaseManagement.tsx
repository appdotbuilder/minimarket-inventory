
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
import { Plus, Upload, Search, ShoppingCart, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';
import type { Purchase, CreatePurchaseInput, PurchaseExcelRow } from '../../../server/src/schema';

interface ExcelRowData {
  [key: string]: string | number | undefined;
  f_beli: string;
  no_pb?: string;
  tgl_beli: string;
  kode_brg: string;
  nama_brg: string;
  jumlah: number;
  satuan: string;
  hrg_beli: number;
  disc1?: number;
  disc2?: number;
  disc3?: number;
  disc_rp?: number;
  codesup?: string;
  nama?: string;
  acc?: string;
  opr?: string;
  dateopr?: string;
  f_order?: string;
  jt_tempo?: number;
  hrg_beli_lama?: number;
  tunai?: number;
  ppn?: number;
  lama?: number;
  isi?: number;
  grup?: string;
  profit?: number;
  hrg_lama?: number;
  hrg_jual?: number;
  q_barcode?: string;
  barcode?: string;
  lama1?: number;
  urutan?: number;
  alamat?: string;
}

export function PurchaseManagement() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const [formData, setFormData] = useState<CreatePurchaseInput>({
    f_beli: '',
    no_pb: null,
    tgl_beli: new Date(),
    kode_brg: '',
    nama_brg: '',
    jumlah: 1,
    satuan: '',
    hrg_beli: 0,
    disc1: 0,
    disc2: 0,
    disc3: 0,
    disc_rp: 0,
    codesup: null,
    nama: null
  });

  const loadPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getPurchases.query();
      setPurchases(result);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      setError('Failed to load purchases');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const filteredPurchases = purchases.filter((purchase: Purchase) => {
    const matchesSearch = 
      purchase.nama_brg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.kode_brg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.f_beli.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (purchase.nama && purchase.nama.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDate = !dateFilter || 
      purchase.tgl_beli.toISOString().split('T')[0] === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  const calculateFinalPrice = (hrg_beli: number, disc1: number, disc2: number, disc3: number, disc_rp: number) => {
    let price = hrg_beli;
    // Apply percentage discounts
    price = price * (1 - disc1 / 100);
    price = price * (1 - disc2 / 100);
    price = price * (1 - disc3 / 100);
    // Apply rupiah discount
    price = price - disc_rp;
    return Math.max(0, price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const newPurchase = await trpc.createPurchase.mutate(formData);
      setPurchases((prev: Purchase[]) => [newPurchase, ...prev]);
      setSuccess('Purchase record created successfully');
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create purchase:', error);
      setError('Failed to create purchase record');
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
        'f_beli', 'no_pb', 'tgl_beli', 'kode_brg', 'nama_brg', 'jumlah', 'satuan', 'hrg_beli',
        'disc1', 'disc2', 'disc3', 'disc_rp', 'codesup', 'nama', 'acc', 'opr', 'dateopr',
        'f_order', 'jt_tempo', 'hrg_beli_lama', 'tunai', 'ppn', 'lama', 'isi', 'grup',
        'profit', 'hrg_lama', 'hrg_jual', 'q_barcode', 'barcode', 'lama1', 'urutan', 'alamat'
      ];

      const excelData: PurchaseExcelRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split('\t');
          const row = {} as ExcelRowData;
          
          expectedHeaders.forEach((header: string, index: number) => {
            const value = values[index]?.trim() || '';
            if (['jumlah', 'hrg_beli', 'disc1', 'disc2', 'disc3', 'disc_rp', 'jt_tempo', 'hrg_beli_lama', 'tunai', 'ppn', 'lama', 'isi', 'profit', 'hrg_lama', 'hrg_jual', 'lama1', 'urutan'].includes(header)) {
              row[header] = parseFloat(value) || 0;
            } else if (['no_pb', 'codesup', 'nama', 'acc', 'opr', 'f_order', 'grup', 'q_barcode', 'barcode', 'alamat'].includes(header)) {
              row[header] = value || undefined;
            } else if (header === 'tgl_beli' || header === 'dateopr') {
              row[header] = value;
            } else {
              row[header] = value;
            }
          });
          
          excelData.push(row as PurchaseExcelRow);
        }
      }

      const result = await trpc.importPurchasesFromExcel.mutate(excelData);
      setSuccess(`Import completed: ${result.success} successful, ${result.failed} failed`);
      
      if (result.errors.length > 0) {
        setError(`Errors: ${result.errors.join(', ')}`);
      }
      
      setImportText('');
      setIsImportDialogOpen(false);
      loadPurchases(); // Reload purchases
      
    } catch (error) {
      console.error('Failed to import purchases:', error);
      setError('Failed to import Excel data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      f_beli: '',
      no_pb: null,
      tgl_beli: new Date(),
      kode_brg: '',
      nama_brg: '',
      jumlah: 1,
      satuan: '',
      hrg_beli: 0,
      disc1: 0,
      disc2: 0,
      disc3: 0,
      disc_rp: 0,
      codesup: null,
      nama: null
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🛒 Purchase Management</h2>
          <p className="text-gray-600">Record and manage purchase transactions</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-green-50 hover:bg-green-100 border-green-200">
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>📊 Import Purchase Data from Excel</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">📋 Excel Format Instructions:</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Copy and paste your Excel data with these columns (in order):
                  </p>
                  <div className="text-xs font-mono bg-white p-2 rounded border overflow-x-auto">
                    f_beli | no_pb | tgl_beli | kode_brg | nama_brg | jumlah | satuan | hrg_beli | 
                    disc1 | disc2 | disc3 | disc_rp | codesup | nama | acc | opr | dateopr | f_order | 
                    jt_tempo | hrg_beli_lama | tunai | ppn | lama | isi | grup | profit | hrg_lama | 
                    hrg_jual | q_barcode | barcode | lama1 | urutan | alamat
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
                Add Purchase
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>➕ Add New Purchase Record</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="f_beli">Purchase ID *</Label>
                    <Input
                      id="f_beli"
                      value={formData.f_beli}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreatePurchaseInput) => ({ ...prev, f_beli: e.target.value }))
                      }
                      placeholder="e.g., PB001"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="no_pb">PO Number</Label>
                    <Input
                      id="no_pb"
                      value={formData.no_pb || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreatePurchaseInput) => ({
                          ...prev,
                          no_pb: e.target.value || null
                        }))
                      }
                      placeholder="Purchase order number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tgl_beli">Purchase Date *</Label>
                    <Input
                      id="tgl_beli"
                      type="date"
                      value={formData.tgl_beli instanceof Date ? 
                        formData.tgl_beli.toISOString().split('T')[0] : 
                        new Date(formData.tgl_beli).toISOString().split('T')[0]
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreatePurchaseInput) => ({
                          ...prev,
                          tgl_beli: new Date(e.target.value)
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="kode_brg">Product Code *</Label>
                    <Input
                      id="kode_brg"
                      value={formData.kode_brg}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreatePurchaseInput) => ({ ...prev, kode_brg: e.target.value }))
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
                        setFormData((prev: CreatePurchaseInput) => ({ ...prev, nama_brg: e.target.value }))
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
                        setFormData((prev: CreatePurchaseInput) => ({ ...prev, satuan: e.target.value }))
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
                        setFormData((prev: CreatePurchaseInput) => ({ ...prev, jumlah: parseFloat(e.target.value) || 1 }))
                      }
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="hrg_beli">Unit Price *</Label>
                    <Input
                      id="hrg_beli"
                      type="number"
                      value={formData.hrg_beli}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreatePurchaseInput) => ({ ...prev, hrg_beli: parseFloat(e.target.value) || 0 }))
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Purchase Summary */}
                {formData.hrg_beli > 0 && formData.jumlah > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">💰 Purchase Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium ml-2">
                          {formatCurrency(formData.hrg_beli * formData.jumlah)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Final Price per Unit:</span>
                        <span className="font-medium ml-2">
                          {formatCurrency(calculateFinalPrice(formData.hrg_beli, formData.disc1, formData.disc2, formData.disc3, formData.disc_rp))}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-lg ml-2">
                          {formatCurrency(calculateFinalPrice(formData.hrg_beli, formData.disc1, formData.disc2, formData.disc3, formData.disc_rp) * formData.jumlah)}
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
                      'Create Purchase'
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
                placeholder="Search by purchase ID, product name, or supplier..."
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
            Showing {filteredPurchases.length} of {purchases.length} purchase records
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5" />
            <span>📋 Purchase Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading purchases...</span>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || dateFilter ? 
                '🔍 No purchases found matching your filters' : 
                '🛒 No purchase records yet. Add your first purchase!'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discounts</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase: Purchase) => {
                    const finalPrice = calculateFinalPrice(
                      purchase.hrg_beli, 
                      purchase.disc1, 
                      purchase.disc2, 
                      purchase.disc3, 
                      purchase.disc_rp
                    );
                    const total = finalPrice * purchase.jumlah;
                    
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono text-sm">
                          {purchase.f_beli}
                          {purchase.no_pb && (
                            <div className="text-xs text-gray-500">
                              PO: {purchase.no_pb}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {purchase.tgl_beli.toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{purchase.nama_brg}</div>
                            <div className="text-xs text-gray-500">
                              Code: {purchase.kode_brg}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {purchase.nama ? (
                            <div>
                              <div className="font-medium">{purchase.nama}</div>
                              {purchase.codesup && (
                                <div className="text-xs text-gray-500">
                                  {purchase.codesup}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-bold">{purchase.jumlah}</div>
                            <div className="text-xs text-gray-500">
                              {purchase.satuan}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="line-through text-gray-400 text-xs">
                              {formatCurrency(purchase.hrg_beli)}
                            </div>
                            <div className="font-medium">
                              {formatCurrency(finalPrice)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(purchase.disc1 > 0 || purchase.disc2 > 0 || purchase.disc3 > 0 || purchase.disc_rp > 0) ? (
                            <div className="space-y-1">
                              {purchase.disc1 > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {purchase.disc1}%
                                </Badge>
                              )}
                              {purchase.disc2 > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {purchase.disc2}%
                                </Badge>
                              )}
                              {purchase.disc3 > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {purchase.disc3}%
                                </Badge>
                              )}
                              {purchase.disc_rp > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  -{formatCurrency(purchase.disc_rp)}
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
