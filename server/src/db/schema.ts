
import { serial, text, pgTable, timestamp, numeric, integer, boolean, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'warehouse', 'cashier']);
export const adjustmentTypeEnum = pgEnum('adjustment_type', ['in', 'out', 'opname']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Units table
export const unitsTable = pgTable('units', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation').notNull(),
  conversion_factor: numeric('conversion_factor', { precision: 10, scale: 4 }).notNull(),
  base_unit_id: integer('base_unit_id'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  kode_brg: text('kode_brg').notNull().unique(),
  nama_brg: text('nama_brg').notNull(),
  kategori_id: integer('kategori_id'),
  satuan_default: text('satuan_default').notNull(),
  isi_per_satuan: numeric('isi_per_satuan', { precision: 10, scale: 2 }).notNull(),
  harga_beli: numeric('harga_beli', { precision: 15, scale: 2 }).notNull(),
  harga_jual: numeric('harga_jual', { precision: 15, scale: 2 }).notNull(),
  stok_min: numeric('stok_min', { precision: 10, scale: 2 }).notNull(),
  stok_max: numeric('stok_max', { precision: 10, scale: 2 }).notNull(),
  current_stock: numeric('current_stock', { precision: 15, scale: 2 }).notNull().default('0'),
  barcode: text('barcode'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Suppliers table
export const suppliersTable = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  codesup: text('codesup').notNull().unique(),
  nama: text('nama').notNull(),
  alamat: text('alamat'),
  telepon: text('telepon'),
  email: text('email'),
  contact_person: text('contact_person'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Purchases table (based on pembelian table structure)
export const purchasesTable = pgTable('purchases', {
  id: serial('id').primaryKey(),
  f_beli: text('f_beli').notNull().unique(),
  no_pb: text('no_pb'),
  tgl_beli: date('tgl_beli').notNull(),
  kode_brg: text('kode_brg').notNull(),
  nama_brg: text('nama_brg').notNull(),
  jumlah: integer('jumlah').notNull(),
  satuan: text('satuan').notNull(),
  hrg_beli: numeric('hrg_beli', { precision: 15, scale: 2 }).notNull(),
  disc1: numeric('disc1', { precision: 10, scale: 2 }).notNull().default('0'),
  disc2: numeric('disc2', { precision: 10, scale: 2 }).notNull().default('0'),
  disc3: numeric('disc3', { precision: 10, scale: 2 }).notNull().default('0'),
  disc_rp: numeric('disc_rp', { precision: 15, scale: 2 }).notNull().default('0'),
  codesup: text('codesup'),
  nama: text('nama'),
  acc: text('acc'),
  opr: text('opr'),
  dateopr: date('dateopr'),
  f_order: text('f_order'),
  jt_tempo: integer('jt_tempo'),
  hrg_beli_lama: numeric('hrg_beli_lama', { precision: 15, scale: 2 }),
  tunai: numeric('tunai', { precision: 15, scale: 2 }),
  ppn: numeric('ppn', { precision: 15, scale: 2 }),
  lama: integer('lama'),
  isi: integer('isi'),
  grup: text('grup'),
  profit: numeric('profit', { precision: 15, scale: 2 }),
  hrg_lama: numeric('hrg_lama', { precision: 15, scale: 2 }),
  hrg_jual: numeric('hrg_jual', { precision: 15, scale: 2 }),
  q_barcode: text('q_barcode'),
  barcode: text('barcode'),
  lama1: integer('lama1'),
  urutan: integer('urutan'),
  alamat: text('alamat'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sales table (based on penjualan table structure)
export const salesTable = pgTable('sales', {
  id: serial('id').primaryKey(),
  tgl_jual: date('tgl_jual').notNull(),
  f_jual: text('f_jual').notNull().unique(),
  acc: text('acc'),
  kode_brg: text('kode_brg').notNull(),
  nama_brg: text('nama_brg').notNull(),
  jumlah: integer('jumlah').notNull(),
  satuan: text('satuan').notNull(),
  hrg_jual: numeric('hrg_jual', { precision: 15, scale: 2 }).notNull(),
  disc1: numeric('disc1', { precision: 10, scale: 2 }).notNull().default('0'),
  disc2: numeric('disc2', { precision: 10, scale: 2 }).notNull().default('0'),
  disc3: numeric('disc3', { precision: 10, scale: 2 }).notNull().default('0'),
  disc_rp: numeric('disc_rp', { precision: 15, scale: 2 }).notNull().default('0'),
  ppn: numeric('ppn', { precision: 15, scale: 2 }),
  codelg: text('codelg'),
  nama_lg: text('nama_lg'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Stock adjustments table
export const stockAdjustmentsTable = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  adjustment_type: adjustmentTypeEnum('adjustment_type').notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  notes: text('notes'),
  user_id: integer('user_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const productsRelations = relations(productsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.kategori_id],
    references: [categoriesTable.id]
  }),
  stockAdjustments: many(stockAdjustmentsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  products: many(productsTable)
}));

export const unitsRelations = relations(unitsTable, ({ one }) => ({
  baseUnit: one(unitsTable, {
    fields: [unitsTable.base_unit_id],
    references: [unitsTable.id]
  })
}));

export const stockAdjustmentsRelations = relations(stockAdjustmentsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [stockAdjustmentsTable.product_id],
    references: [productsTable.id]
  }),
  user: one(usersTable, {
    fields: [stockAdjustmentsTable.user_id],
    references: [usersTable.id]
  })
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  stockAdjustments: many(stockAdjustmentsTable)
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  units: unitsTable,
  products: productsTable,
  suppliers: suppliersTable,
  purchases: purchasesTable,
  sales: salesTable,
  stockAdjustments: stockAdjustmentsTable
};
