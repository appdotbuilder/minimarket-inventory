
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { salesTable, productsTable, categoriesTable } from '../db/schema';
import { type CreateSalesInput, type SalesExcelRow } from '../schema';
import {
  createSales,
  getSales,
  getSalesById,
  getSalesByDateRange,
  getSalesByProduct,
  importSalesFromExcel,
  getDailySalesTotal,
  getMonthlySalesReport,
  updateSales,
  deleteSales
} from '../handlers/sales';
import { eq } from 'drizzle-orm';

const testCategory = {
  name: 'Test Category',
  description: 'A category for testing'
};

const testProduct = {
  kode_brg: 'TEST001',
  nama_brg: 'Test Product',
  kategori_id: null,
  satuan_default: 'pcs',
  isi_per_satuan: 1,
  harga_beli: 5000,
  harga_jual: 8000,
  stok_min: 10,
  stok_max: 100,
  current_stock: 50,
  barcode: null
};

const testSalesInput: CreateSalesInput = {
  tgl_jual: new Date('2024-01-15'),
  f_jual: 'SL001',
  acc: 'CASH',
  kode_brg: 'TEST001',
  nama_brg: 'Test Product',
  jumlah: 5,
  satuan: 'pcs',
  hrg_jual: 8000,
  disc1: 0,
  disc2: 0,
  disc3: 0,
  disc_rp: 0,
  ppn: null,
  codelg: null,
  nama_lg: null
};

describe('Sales handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createSales', () => {
    it('should create a sales record and update stock', async () => {
      // Create test product
      await db.insert(productsTable).values({
        ...testProduct,
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString(),
        current_stock: testProduct.current_stock.toString()
      });

      const result = await createSales(testSalesInput);

      expect(result.f_jual).toEqual('SL001');
      expect(result.kode_brg).toEqual('TEST001');
      expect(result.jumlah).toEqual(5);
      expect(result.hrg_jual).toEqual(8000);
      expect(typeof result.hrg_jual).toBe('number');
      expect(result.tgl_jual).toBeInstanceOf(Date);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);

      // Check stock was updated
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.kode_brg, 'TEST001'))
        .execute();

      expect(parseFloat(products[0].current_stock)).toEqual(45); // 50 - 5
    });

    it('should throw error for non-existent product', async () => {
      await expect(createSales(testSalesInput)).rejects.toThrow(/not found/i);
    });

    it('should throw error for insufficient stock', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        current_stock: '3', // Less than required 5
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString()
      });

      await expect(createSales(testSalesInput)).rejects.toThrow(/insufficient stock/i);
    });
  });

  describe('getSales', () => {
    it('should return all sales records', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString(),
        current_stock: testProduct.current_stock.toString()
      });

      await createSales(testSalesInput);
      await createSales({ ...testSalesInput, f_jual: 'SL002' });

      const results = await getSales();

      expect(results).toHaveLength(2);
      expect(typeof results[0].hrg_jual).toBe('number');
      expect(results[0].tgl_jual).toBeInstanceOf(Date);
    });

    it('should return empty array when no sales exist', async () => {
      const results = await getSales();
      expect(results).toEqual([]);
    });
  });

  describe('getSalesById', () => {
    it('should return sales record by ID', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString(),
        current_stock: testProduct.current_stock.toString()
      });

      const created = await createSales(testSalesInput);
      const result = await getSalesById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.f_jual).toEqual('SL001');
      expect(result!.tgl_jual).toBeInstanceOf(Date);
    });

    it('should return null for non-existent ID', async () => {
      const result = await getSalesById(999);
      expect(result).toBeNull();
    });
  });

  describe('getSalesByDateRange', () => {
    it('should return sales within date range', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        current_stock: '100',
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString()
      });

      await createSales({ ...testSalesInput, tgl_jual: new Date('2024-01-10'), f_jual: 'SL001' });
      await createSales({ ...testSalesInput, tgl_jual: new Date('2024-01-15'), f_jual: 'SL002' });
      await createSales({ ...testSalesInput, tgl_jual: new Date('2024-01-20'), f_jual: 'SL003' });

      const results = await getSalesByDateRange(
        new Date('2024-01-12'),
        new Date('2024-01-18')
      );

      expect(results).toHaveLength(1);
      expect(results[0].f_jual).toEqual('SL002');
      expect(results[0].tgl_jual).toBeInstanceOf(Date);
    });
  });

  describe('getSalesByProduct', () => {
    it('should return sales for specific product', async () => {
      await db.insert(productsTable).values([
        {
          ...testProduct,
          current_stock: '100',
          isi_per_satuan: testProduct.isi_per_satuan.toString(),
          harga_beli: testProduct.harga_beli.toString(),
          harga_jual: testProduct.harga_jual.toString(),
          stok_min: testProduct.stok_min.toString(),
          stok_max: testProduct.stok_max.toString()
        },
        {
          ...testProduct,
          kode_brg: 'TEST002',
          nama_brg: 'Test Product 2',
          current_stock: '100',
          isi_per_satuan: testProduct.isi_per_satuan.toString(),
          harga_beli: testProduct.harga_beli.toString(),
          harga_jual: testProduct.harga_jual.toString(),
          stok_min: testProduct.stok_min.toString(),
          stok_max: testProduct.stok_max.toString()
        }
      ]);

      await createSales({ ...testSalesInput, f_jual: 'SL001' });
      await createSales({ ...testSalesInput, kode_brg: 'TEST002', f_jual: 'SL002' });

      const results = await getSalesByProduct('TEST001');

      expect(results).toHaveLength(1);
      expect(results[0].kode_brg).toEqual('TEST001');
      expect(results[0].tgl_jual).toBeInstanceOf(Date);
    });
  });

  describe('importSalesFromExcel', () => {
    it('should import valid sales data', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        current_stock: '100',
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString()
      });

      const excelData: SalesExcelRow[] = [
        {
          tgl_jual: '2024-01-15',
          f_jual: 'SL001',
          acc: 'CASH',
          kode_brg: 'TEST001',
          nama_brg: 'Test Product',
          jumlah: 5,
          satuan: 'pcs',
          hrg_jual: 8000,
          disc1: 0,
          disc2: 0,
          disc3: 0,
          disc_rp: 0
        },
        {
          tgl_jual: '2024-01-16',
          f_jual: 'SL002',
          kode_brg: 'TEST001',
          nama_brg: 'Test Product',
          jumlah: 3,
          satuan: 'pcs',
          hrg_jual: 8000
        }
      ];

      const result = await importSalesFromExcel(excelData);

      expect(result.success).toEqual(2);
      expect(result.failed).toEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid data in import', async () => {
      const excelData: SalesExcelRow[] = [
        {
          tgl_jual: 'invalid-date',
          f_jual: 'SL001',
          kode_brg: 'NONEXISTENT',
          nama_brg: 'Test Product',
          jumlah: 5,
          satuan: 'pcs',
          hrg_jual: 8000
        }
      ];

      const result = await importSalesFromExcel(excelData);

      expect(result.success).toEqual(0);
      expect(result.failed).toEqual(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/invalid date format/i);
    });
  });

  describe('getDailySalesTotal', () => {
    it('should calculate daily sales total', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        current_stock: '100',
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString()
      });

      const testDate = new Date('2024-01-15');
      await createSales({ ...testSalesInput, tgl_jual: testDate, f_jual: 'SL001', jumlah: 5, hrg_jual: 8000 });
      await createSales({ ...testSalesInput, tgl_jual: testDate, f_jual: 'SL002', jumlah: 3, hrg_jual: 8000 });

      const total = await getDailySalesTotal(testDate);

      expect(total).toEqual(64000); // (5 * 8000) + (3 * 8000)
    });

    it('should return 0 for date with no sales', async () => {
      const total = await getDailySalesTotal(new Date('2024-01-15'));
      expect(total).toEqual(0);
    });
  });

  describe('getMonthlySalesReport', () => {
    it('should generate monthly sales report', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        current_stock: '100',
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString()
      });

      await createSales({ ...testSalesInput, tgl_jual: new Date('2024-01-15'), f_jual: 'SL001' });
      await createSales({ ...testSalesInput, tgl_jual: new Date('2024-01-15'), f_jual: 'SL002' });
      await createSales({ ...testSalesInput, tgl_jual: new Date('2024-01-20'), f_jual: 'SL003' });

      const report = await getMonthlySalesReport(2024, 1);

      expect(report).toHaveLength(2);
      expect(report.find(r => r.date === '2024-01-15')?.total).toEqual(80000); // 2 * 5 * 8000
      expect(report.find(r => r.date === '2024-01-20')?.total).toEqual(40000); // 1 * 5 * 8000
    });
  });

  describe('updateSales', () => {
    it('should update sales record and adjust stock', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        current_stock: '50',
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString()
      });

      const created = await createSales(testSalesInput); // Sold 5, stock becomes 45
      const updated = await updateSales(created.id, { jumlah: 8 }); // Change to 8, stock should become 42

      expect(updated.jumlah).toEqual(8);
      expect(updated.tgl_jual).toBeInstanceOf(Date);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.kode_brg, 'TEST001'))
        .execute();

      expect(parseFloat(products[0].current_stock)).toEqual(42); // 50 - 8
    });

    it('should throw error for non-existent sales', async () => {
      await expect(updateSales(999, { jumlah: 5 })).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteSales', () => {
    it('should delete sales record and revert stock', async () => {
      await db.insert(productsTable).values({
        ...testProduct,
        current_stock: '50',
        isi_per_satuan: testProduct.isi_per_satuan.toString(),
        harga_beli: testProduct.harga_beli.toString(),
        harga_jual: testProduct.harga_jual.toString(),
        stok_min: testProduct.stok_min.toString(),
        stok_max: testProduct.stok_max.toString()
      });

      const created = await createSales(testSalesInput); // Sold 5, stock becomes 45
      const result = await deleteSales(created.id);

      expect(result.success).toBe(true);

      // Check stock was reverted
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.kode_brg, 'TEST001'))
        .execute();

      expect(parseFloat(products[0].current_stock)).toEqual(50); // Back to original

      // Check sales record was deleted
      const salesRecord = await getSalesById(created.id);
      expect(salesRecord).toBeNull();
    });

    it('should throw error for non-existent sales', async () => {
      await expect(deleteSales(999)).rejects.toThrow(/not found/i);
    });
  });
});
