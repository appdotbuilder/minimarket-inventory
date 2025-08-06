
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTable, purchasesTable, categoriesTable } from '../db/schema';
import { 
  getDashboardSummary, 
  getDailySalesData, 
  getWeeklySalesData, 
  getMonthlySalesData, 
  getLowStockAlerts 
} from '../handlers/dashboard';

describe('Dashboard handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getDashboardSummary', () => {
    it('should return dashboard summary with zero values when no data exists', async () => {
      const result = await getDashboardSummary();

      expect(result.total_stock_value).toEqual(0);
      expect(result.total_products).toEqual(0);
      expect(result.low_stock_count).toEqual(0);
      expect(result.daily_sales).toEqual(0);
      expect(result.daily_purchases).toEqual(0);
      expect(result.pending_orders).toEqual(0);
    });

    it('should calculate correct dashboard metrics with product data', async () => {
      // Create test category
      const categoryResult = await db.insert(categoriesTable)
        .values({
          name: 'Test Category',
          description: 'Test category description'
        })
        .returning()
        .execute();

      // Create test products
      await db.insert(productsTable)
        .values([
          {
            kode_brg: 'PROD001',
            nama_brg: 'Product 1',
            kategori_id: categoryResult[0].id,
            satuan_default: 'pcs',
            isi_per_satuan: '1.00',
            harga_beli: '10000.00',
            harga_jual: '15000.00',
            stok_min: '10.00',
            stok_max: '100.00',
            current_stock: '50.00',
            is_active: true
          },
          {
            kode_brg: 'PROD002',
            nama_brg: 'Product 2',
            kategori_id: categoryResult[0].id,
            satuan_default: 'pcs',
            isi_per_satuan: '1.00',
            harga_beli: '20000.00',
            harga_jual: '25000.00',
            stok_min: '20.00',
            stok_max: '200.00',
            current_stock: '5.00', // Below minimum stock
            is_active: true
          }
        ])
        .execute();

      // Create today's sales
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      await db.insert(salesTable)
        .values({
          tgl_jual: todayStr,
          f_jual: 'SALE001',
          kode_brg: 'PROD001',
          nama_brg: 'Product 1',
          jumlah: 2,
          satuan: 'pcs',
          hrg_jual: '15000.00',
          disc1: '0.00',
          disc2: '0.00',
          disc3: '0.00',
          disc_rp: '0.00'
        })
        .execute();

      // Create today's purchases
      await db.insert(purchasesTable)
        .values({
          f_beli: 'PUR001',
          tgl_beli: todayStr,
          kode_brg: 'PROD001',
          nama_brg: 'Product 1',
          jumlah: 10,
          satuan: 'pcs',
          hrg_beli: '10000.00',
          disc1: '0.00',
          disc2: '0.00',
          disc3: '0.00',
          disc_rp: '0.00'
        })
        .execute();

      const result = await getDashboardSummary();

      // Total stock value: (50 * 15000) + (5 * 25000) = 875000
      expect(result.total_stock_value).toEqual(875000);
      expect(result.total_products).toEqual(2);
      expect(result.low_stock_count).toEqual(1); // Product 2 is below minimum
      expect(result.daily_sales).toEqual(30000); // 2 * 15000
      expect(result.daily_purchases).toEqual(100000); // 10 * 10000
      expect(result.pending_orders).toEqual(0);
    });

    it('should only count active products', async () => {
      // Create test category
      const categoryResult = await db.insert(categoriesTable)
        .values({
          name: 'Test Category',
          description: 'Test category description'
        })
        .returning()
        .execute();

      // Create active and inactive products
      await db.insert(productsTable)
        .values([
          {
            kode_brg: 'ACTIVE001',
            nama_brg: 'Active Product',
            kategori_id: categoryResult[0].id,
            satuan_default: 'pcs',
            isi_per_satuan: '1.00',
            harga_beli: '10000.00',
            harga_jual: '15000.00',
            stok_min: '10.00',
            stok_max: '100.00',
            current_stock: '50.00',
            is_active: true
          },
          {
            kode_brg: 'INACTIVE001',
            nama_brg: 'Inactive Product',
            kategori_id: categoryResult[0].id,
            satuan_default: 'pcs',
            isi_per_satuan: '1.00',
            harga_beli: '20000.00',
            harga_jual: '25000.00',
            stok_min: '20.00',
            stok_max: '200.00',
            current_stock: '100.00',
            is_active: false
          }
        ])
        .execute();

      const result = await getDashboardSummary();

      expect(result.total_products).toEqual(1); // Only active product counted
      expect(result.total_stock_value).toEqual(750000); // Only active product: 50 * 15000
    });
  });

  describe('getDailySalesData', () => {
    it('should return empty data for specified days when no sales exist', async () => {
      const result = await getDailySalesData(3);

      expect(result).toHaveLength(3);
      result.forEach(day => {
        expect(day.sales).toEqual(0);
        expect(day.purchases).toEqual(0);
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should return correct daily sales and purchases data', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Create sales data
      await db.insert(salesTable)
        .values([
          {
            tgl_jual: todayStr,
            f_jual: 'SALE001',
            kode_brg: 'PROD001',
            nama_brg: 'Product 1',
            jumlah: 2,
            satuan: 'pcs',
            hrg_jual: '15000.00',
            disc1: '0.00',
            disc2: '0.00',
            disc3: '0.00',
            disc_rp: '0.00'
          },
          {
            tgl_jual: yesterdayStr,
            f_jual: 'SALE002',
            kode_brg: 'PROD001',
            nama_brg: 'Product 1',
            jumlah: 1,
            satuan: 'pcs',
            hrg_jual: '15000.00',
            disc1: '0.00',
            disc2: '0.00',
            disc3: '0.00',
            disc_rp: '0.00'
          }
        ])
        .execute();

      // Create purchases data
      await db.insert(purchasesTable)
        .values([
          {
            f_beli: 'PUR001',
            tgl_beli: todayStr,
            kode_brg: 'PROD001',
            nama_brg: 'Product 1',
            jumlah: 10,
            satuan: 'pcs',
            hrg_beli: '10000.00',
            disc1: '0.00',
            disc2: '0.00',
            disc3: '0.00',
            disc_rp: '0.00'
          }
        ])
        .execute();

      const result = await getDailySalesData(3);

      expect(result).toHaveLength(3);
      
      // Find today's and yesterday's data
      const todayData = result.find(item => item.date === todayStr);
      const yesterdayData = result.find(item => item.date === yesterdayStr);

      expect(todayData?.sales).toEqual(30000); // 2 * 15000
      expect(todayData?.purchases).toEqual(100000); // 10 * 10000
      expect(yesterdayData?.sales).toEqual(15000); // 1 * 15000
      expect(yesterdayData?.purchases).toEqual(0);
    });
  });

  describe('getWeeklySalesData', () => {
    it('should return weekly data with correct format', async () => {
      const result = await getWeeklySalesData(2);

      expect(result).toHaveLength(2);
      result.forEach(week => {
        expect(week.week).toMatch(/^\d{4}-W\d{2}$/);
        expect(typeof week.sales).toBe('number');
        expect(typeof week.purchases).toBe('number');
      });
    });
  });

  describe('getMonthlySalesData', () => {
    it('should return monthly data with correct format', async () => {
      const result = await getMonthlySalesData(2);

      expect(result).toHaveLength(2);
      result.forEach(month => {
        expect(month.month).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof month.sales).toBe('number');
        expect(typeof month.purchases).toBe('number');
      });
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return empty array when no low stock products exist', async () => {
      const result = await getLowStockAlerts();
      expect(result).toHaveLength(0);
    });

    it('should return products with stock at or below minimum levels', async () => {
      // Create test category
      const categoryResult = await db.insert(categoriesTable)
        .values({
          name: 'Test Category',
          description: 'Test category description'
        })
        .returning()
        .execute();

      // Create products with different stock levels
      await db.insert(productsTable)
        .values([
          {
            kode_brg: 'LOW001',
            nama_brg: 'Low Stock Product',
            kategori_id: categoryResult[0].id,
            satuan_default: 'pcs',
            isi_per_satuan: '1.00',
            harga_beli: '10000.00',
            harga_jual: '15000.00',
            stok_min: '20.00',
            stok_max: '100.00',
            current_stock: '15.00', // Below minimum
            is_active: true
          },
          {
            kode_brg: 'EQUAL001',
            nama_brg: 'Equal Stock Product',
            kategori_id: categoryResult[0].id,
            satuan_default: 'pcs',
            isi_per_satuan: '1.00',
            harga_beli: '10000.00',
            harga_jual: '15000.00',
            stok_min: '10.00',
            stok_max: '100.00',
            current_stock: '10.00', // Equal to minimum
            is_active: true
          },
          {
            kode_brg: 'HIGH001',
            nama_brg: 'High Stock Product',
            kategori_id: categoryResult[0].id,
            satuan_default: 'pcs',
            isi_per_satuan: '1.00',
            harga_beli: '10000.00',
            harga_jual: '15000.00',
            stok_min: '10.00',
            stok_max: '100.00',
            current_stock: '50.00', // Above minimum
            is_active: true
          },
          {
            kode_brg: 'INACTIVE001',
            nama_brg: 'Inactive Low Stock',
            kategori_id: categoryResult[0].id,
            satuan_default: 'pcs',
            isi_per_satuan: '1.00',
            harga_beli: '10000.00',
            harga_jual: '15000.00',
            stok_min: '20.00',
            stok_max: '100.00',
            current_stock: '5.00', // Below minimum but inactive
            is_active: false
          }
        ])
        .execute();

      const result = await getLowStockAlerts();

      expect(result).toHaveLength(2); // Only active products with low stock
      
      const lowStockProduct = result.find(p => p.product === 'Low Stock Product');
      const equalStockProduct = result.find(p => p.product === 'Equal Stock Product');

      expect(lowStockProduct).toBeDefined();
      expect(lowStockProduct?.current_stock).toEqual(15);
      expect(lowStockProduct?.min_stock).toEqual(20);

      expect(equalStockProduct).toBeDefined();
      expect(equalStockProduct?.current_stock).toEqual(10);
      expect(equalStockProduct?.min_stock).toEqual(10);

      // Should not include high stock or inactive products
      expect(result.find(p => p.product === 'High Stock Product')).toBeUndefined();
      expect(result.find(p => p.product === 'Inactive Low Stock')).toBeUndefined();
    });
  });
});
