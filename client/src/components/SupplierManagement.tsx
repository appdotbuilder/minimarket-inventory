
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Users, Edit, Loader2, AlertTriangle, Mail, Phone, MapPin } from 'lucide-react';
import type { Supplier, CreateSupplierInput } from '../../../server/src/schema';

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState<CreateSupplierInput>({
    codesup: '',
    nama: '',
    alamat: null,
    telepon: null,
    email: null,
    contact_person: null
  });

  const loadSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getSuppliers.query();
      setSuppliers(result);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      setError('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = suppliers.filter((supplier: Supplier) =>
    supplier.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.codesup.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (supplier.telepon && supplier.telepon.includes(searchQuery))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (editingSupplier) {
        const updatedSupplier = await trpc.updateSupplier.mutate({
          id: editingSupplier.id,
          data: formData
        });
        setSuppliers((prev: Supplier[]) =>
          prev.map((s: Supplier) => s.id === editingSupplier.id ? updatedSupplier : s)
        );
        setSuccess('Supplier updated successfully');
      } else {
        const newSupplier = await trpc.createSupplier.mutate(formData);
        setSuppliers((prev: Supplier[]) => [newSupplier, ...prev]);
        setSuccess('Supplier created successfully');
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save supplier:', error);
      setError('Failed to save supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this supplier?')) return;

    try {
      await trpc.deactivateSupplier.mutate(id);
      setSuppliers((prev: Supplier[]) =>
        prev.map((s: Supplier) => s.id === id ? { ...s, is_active: false } : s)
      );
      setSuccess('Supplier deactivated successfully');
    } catch (error) {
      console.error('Failed to deactivate supplier:', error);
      setError('Failed to deactivate supplier');
    }
  };

  const resetForm = () => {
    setFormData({
      codesup: '',
      nama: '',
      alamat: null,
      telepon: null,
      email: null,
      contact_person: null
    });
    setEditingSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      codesup: supplier.codesup,
      nama: supplier.nama,
      alamat: supplier.alamat,
      telepon: supplier.telepon,
      email: supplier.email,
      contact_person: supplier.contact_person
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 Supplier Management</h2>
          <p className="text-gray-600">Manage your supplier information and contacts</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? '✏️ Edit Supplier' : '➕ Add New Supplier'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codesup">Supplier Code *</Label>
                  <Input
                    id="codesup"
                    value={formData.codesup}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSupplierInput) => ({ ...prev, codesup: e.target.value }))
                    }
                    placeholder="e.g., SUP001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nama">Supplier Name *</Label>
                  <Input
                    id="nama"
                    value={formData.nama}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSupplierInput) => ({ ...prev, nama: e.target.value }))
                    }
                    placeholder="e.g., PT Indofood"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="alamat">Address</Label>
                  <Input
                    id="alamat"
                    value={formData.alamat || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSupplierInput) => ({
                        ...prev,
                        alamat: e.target.value || null
                      }))
                    }
                    placeholder="Complete address"
                  />
                </div>

                <div>
                  <Label htmlFor="telepon">Phone Number</Label>
                  <Input
                    id="telepon"
                    type="tel"
                    value={formData.telepon || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSupplierInput) => ({
                        ...prev,
                        telepon: e.target.value || null
                      }))
                    }
                    placeholder="e.g., +62 21 1234 5678"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSupplierInput) => ({
                        ...prev,
                        email: e.target.value || null
                      }))
                    }
                    placeholder="supplier@company.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSupplierInput) => ({
                        ...prev,
                        contact_person: e.target.value || null
                      }))
                    }
                    placeholder="Name of contact person"
                  />
                </div>
              </div>

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
                      {editingSupplier ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
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

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>🔍 Search Suppliers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, code, email, or phone..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredSuppliers.length} of {suppliers.length} suppliers
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>📋 Supplier Directory</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading suppliers...</span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? '🔍 No suppliers found matching your search' : '👥 No suppliers yet. Add your first supplier!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier: Supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-mono text-sm">
                        {supplier.codesup}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.nama}</div>
                          {supplier.alamat && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {supplier.alamat}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.telepon && (
                            <div className="text-sm flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {supplier.telepon}
                            </div>
                          )}
                          {supplier.email && (
                            <div className="text-sm flex items-center">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              {supplier.email}
                            </div>
                          )}
                          {!supplier.telepon && !supplier.email && (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.contact_person ? (
                          <div className="font-medium text-sm">
                            {supplier.contact_person}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                          {supplier.is_active ? '✅ Active' : '⏸️ Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {supplier.is_active && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeactivate(supplier.id)}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
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
