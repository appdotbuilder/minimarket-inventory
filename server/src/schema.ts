
import { z } from 'zod';

// User and Authentication schemas
export const userRoleEnum = z.enum(['admin', 'manager', 'warehouse', 'cashier']);
export type UserRole = z.infer<typeof userRoleEnum>;

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleEnum,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Unit schema
export const unitSchema = z.object({
  id: z.number(),
  name: z.string(),
  abbreviation: z.string(),
  conversion_factor: z.number(),
  base_unit_id: z.number().nullable(),
  created_at: z.coerce.date()
});

export type Unit = z.infer<typeof unitSchema>;

export const createUnitInputSchema = z.object({
  name: z.string(),
  abbreviation: z.string(),
  conversion_factor: z.number().positive(),
  base_unit_id: z.number().nullable().optional()
});

export type CreateUnitInput = z.infer<typeof createUnitInputSchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  kode_brg: z.string(),
  nama_brg: z.string(),
  kategori_id: z.number().nullable(),
  satuan_default: z.string(),
  isi_per_satuan: z.number(),
  harga_beli: z.number(),
  harga_jual: z.number(),
  stok_min: z.number(),
  stok_max: z.number(),
  current_stock: z.number(),
  barcode: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  kode_brg: z.string(),
  nama_brg: z.string(),
  kategori_id: z.number().nullable().optional(),
  satuan_default: z.string(),
  isi_per_satuan: z.number().positive(),
  harga_beli: z.number().nonnegative(),
  harga_jual: z.number().positive(),
  stok_min: z.number().nonnegative(),
  stok_max: z.number().nonnegative(),
  barcode: z.string().nullable().optional()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Supplier schema
export const supplierSchema = z.object({
  id: z.number(),
  codesup: z.string(),
  nama: z.string(),
  alamat: z.string().nullable(),
  telepon: z.string().nullable(),
  email: z.string().nullable(),
  contact_person: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Supplier = z.infer<typeof supplierSchema>;

export const createSupplierInputSchema = z.object({
  codesup: z.string(),
  nama: z.string(),
  alamat: z.string().nullable().optional(),
  telepon: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  contact_person: z.string().nullable().optional()
});

export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;

// Purchase schema (based on pembelian table)
export const purchaseSchema = z.object({
  id: z.number(),
  f_beli: z.string(),
  no_pb: z.string().nullable(),
  tgl_beli: z.coerce.date(),
  kode_brg: z.string(),
  nama_brg: z.string(),
  jumlah: z.number(),
  satuan: z.string(),
  hrg_beli: z.number(),
  disc1: z.number(),
  disc2: z.number(),
  disc3: z.number(),
  disc_rp: z.number(),
  codesup: z.string().nullable(),
  nama: z.string().nullable(),
  acc: z.string().nullable(),
  opr: z.string().nullable(),
  dateopr: z.coerce.date().nullable(),
  f_order: z.string().nullable(),
  jt_tempo: z.number().nullable(),
  hrg_beli_lama: z.number().nullable(),
  tunai: z.number().nullable(),
  ppn: z.number().nullable(),
  lama: z.number().nullable(),
  isi: z.number().nullable(),
  grup: z.string().nullable(),
  profit: z.number().nullable(),
  hrg_lama: z.number().nullable(),
  hrg_jual: z.number().nullable(),
  q_barcode: z.string().nullable(),
  barcode: z.string().nullable(),
  lama1: z.number().nullable(),
  urutan: z.number().nullable(),
  alamat: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Purchase = z.infer<typeof purchaseSchema>;

export const createPurchaseInputSchema = z.object({
  f_beli: z.string(),
  no_pb: z.string().nullable().optional(),
  tgl_beli: z.coerce.date(),
  kode_brg: z.string(),
  nama_brg: z.string(),
  jumlah: z.number().positive(),
  satuan: z.string(),
  hrg_beli: z.number().nonnegative(),
  disc1: z.number().nonnegative().optional().default(0),
  disc2: z.number().nonnegative().optional().default(0),
  disc3: z.number().nonnegative().optional().default(0),
  disc_rp: z.number().nonnegative().optional().default(0),
  codesup: z.string().nullable().optional(),
  nama: z.string().nullable().optional(),
  acc: z.string().nullable().optional(),
  opr: z.string().nullable().optional(),
  dateopr: z.coerce.date().nullable().optional(),
  f_order: z.string().nullable().optional(),
  jt_tempo: z.number().nullable().optional(),
  hrg_beli_lama: z.number().nullable().optional(),
  tunai: z.number().nullable().optional(),
  ppn: z.number().nullable().optional(),
  lama: z.number().nullable().optional(),
  isi: z.number().nullable().optional(),
  grup: z.string().nullable().optional(),
  profit: z.number().nullable().optional(),
  hrg_lama: z.number().nullable().optional(),
  hrg_jual: z.number().nullable().optional(),
  q_barcode: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  lama1: z.number().nullable().optional(),
  urutan: z.number().nullable().optional(),
  alamat: z.string().nullable().optional()
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseInputSchema>;

// Sales schema (based on penjualan table)
export const salesSchema = z.object({
  id: z.number(),
  tgl_jual: z.coerce.date(),
  f_jual: z.string(),
  acc: z.string().nullable(),
  kode_brg: z.string(),
  nama_brg: z.string(),
  jumlah: z.number(),
  satuan: z.string(),
  hrg_jual: z.number(),
  disc1: z.number(),
  disc2: z.number(),
  disc3: z.number(),
  disc_rp: z.number(),
  ppn: z.number().nullable(),
  codelg: z.string().nullable(),
  nama_lg: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Sales = z.infer<typeof salesSchema>;

export const createSalesInputSchema = z.object({
  tgl_jual: z.coerce.date(),
  f_jual: z.string(),
  acc: z.string().nullable().optional(),
  kode_brg: z.string(),
  nama_brg: z.string(),
  jumlah: z.number().positive(),
  satuan: z.string(),
  hrg_jual: z.number().positive(),
  disc1: z.number().nonnegative().optional().default(0),
  disc2: z.number().nonnegative().optional().default(0),
  disc3: z.number().nonnegative().optional().default(0),
  disc_rp: z.number().nonnegative().optional().default(0),
  ppn: z.number().nullable().optional(),
  codelg: z.string().nullable().optional(),
  nama_lg: z.string().nullable().optional()
});

export type CreateSalesInput = z.infer<typeof createSalesInputSchema>;

// Stock adjustment schema
export const stockAdjustmentSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  adjustment_type: z.enum(['in', 'out', 'opname']),
  quantity: z.number(),
  reason: z.string(),
  notes: z.string().nullable(),
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

export const createStockAdjustmentInputSchema = z.object({
  product_id: z.number(),
  adjustment_type: z.enum(['in', 'out', 'opname']),
  quantity: z.number(),
  reason: z.string(),
  notes: z.string().nullable().optional(),
  user_id: z.number()
});

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentInputSchema>;

// Dashboard summary schema
export const dashboardSummarySchema = z.object({
  total_stock_value: z.number(),
  total_products: z.number(),
  low_stock_count: z.number(),
  daily_sales: z.number(),
  daily_purchases: z.number(),
  pending_orders: z.number()
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

// Excel import schemas
export const purchaseExcelRowSchema = z.object({
  f_beli: z.string(),
  no_pb: z.string().optional(),
  tgl_beli: z.string(),
  kode_brg: z.string(),
  nama_brg: z.string(),
  jumlah: z.number(),
  satuan: z.string(),
  hrg_beli: z.number(),
  disc1: z.number().optional(),
  disc2: z.number().optional(),
  disc3: z.number().optional(),
  disc_rp: z.number().optional(),
  codesup: z.string().optional(),
  nama: z.string().optional(),
  acc: z.string().optional(),
  opr: z.string().optional(),
  dateopr: z.string().optional(),
  f_order: z.string().optional(),
  jt_tempo: z.number().optional(),
  hrg_beli_lama: z.number().optional(),
  tunai: z.number().optional(),
  ppn: z.number().optional(),
  lama: z.number().optional(),
  isi: z.number().optional(),
  grup: z.string().optional(),
  profit: z.number().optional(),
  hrg_lama: z.number().optional(),
  hrg_jual: z.number().optional(),
  q_barcode: z.string().optional(),
  barcode: z.string().optional(),
  lama1: z.number().optional(),
  urutan: z.number().optional(),
  alamat: z.string().optional()
});

export type PurchaseExcelRow = z.infer<typeof purchaseExcelRowSchema>;

export const salesExcelRowSchema = z.object({
  tgl_jual: z.string(),
  f_jual: z.string(),
  acc: z.string().optional(),
  kode_brg: z.string(),
  nama_brg: z.string(),
  jumlah: z.number(),
  satuan: z.string(),
  hrg_jual: z.number(),
  disc1: z.number().optional(),
  disc2: z.number().optional(),
  disc3: z.number().optional(),
  disc_rp: z.number().optional(),
  ppn: z.number().optional(),
  codelg: z.string().optional(),
  nama_lg: z.string().optional()
});

export type SalesExcelRow = z.infer<typeof salesExcelRowSchema>;
