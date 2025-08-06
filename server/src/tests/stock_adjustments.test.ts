
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockAdjustmentsTable, productsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateStockAdjustmentInput } from '../schema';
import { 
  createStockAdjustment, 
  getStockAdjustments, 
  getStockAdjustmentsByProduct,
  getStockAdjustmentsByDateRange,
  performStockOpname
} from '../handlers/stock_adjustments';
import { eq } from 'drizzle-orm';

// Test data setup
let testUserId: number;
let testProductId: number;

const setupTestData = async () => {
  // Create test category
  const categoryResult = await db.insert(categoriesTable)
    .values({
      name: 'Test Category',
      description: 'Category for testing'
    })
    .returning()
    .execute();

  // Create test user
  const userResult = await db.insert(usersTable)
    .values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'warehouse'
    })
    .returning()
    .execute();

  testUserId = userResult[0].id;

  // Create test product
  const productResult = await db.insert(productsTable)
    .values({
      kode_brg: 'TEST001',
      nama_brg: 'Test Product',
      kategori_id: categoryResult[0].id,
      satuan_default: 'pcs',
      isi_per_satuan: '1',
      harga_beli: '10000',
      harga_jual: '15000',
      stok_min: '10',
      stok_max: '100',
      current_stock: '50'
    })
    .returning()
    .execute();

  testProductId = productResult[0].id;
};

const testAdjustmentInput: CreateStockAdjustmentInput = {
  product_id: 0, // Will be set in beforeEach
  adjustment_type: 'in',
  quantity: 10,
  reason: 'Restocking',
  notes: 'Adding inventory',
  user_id: 0 // Will be set in beforeEach
};

describe('Stock Adjustments', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testAdjustmentInput.product_id = testProductId;
    testAdjustmentInput.user_id = testUserId;
  });
  
  afterEach(resetDB);

  describe('createStockAdjustment', () => {
    it('should create stock adjustment and update product stock for "in" type', async () => {
      const result = await createStockAdjustment(testAdjustmentInput);

      // Verify adjustment record
      expect(result.product_id).toEqual(testProductId);
      expect(result.adjustment_type).toEqual('in');
      expect(result.quantity).toEqual(10);
      expect(result.reason).toEqual('Restocking');
      expect(result.notes).toEqual('Adding inventory');
      expect(result.user_id).toEqual(testUserId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);

      // Verify product stock was updated (50 + 10 = 60)
      const updatedProduct = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();

      expect(parseFloat(updatedProduct[0].current_stock)).toEqual(60);
    });

    it('should create stock adjustment and update product stock for "out" type', async () => {
      const outInput: CreateStockAdjustmentInput = {
        ...testAdjustmentInput,
        adjustment_type: 'out',
        quantity: 20,
        reason: 'Damage'
      };

      const result = await createStockAdjustment(outInput);

      expect(result.adjustment_type).toEqual('out');
      expect(result.quantity).toEqual(20);

      // Verify product stock was updated (50 - 20 = 30)
      const updatedProduct = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();

      expect(parseFloat(updatedProduct[0].current_stock)).toEqual(30);
    });

    it('should create stock adjustment and set exact stock for "opname" type', async () => {
      const opnameInput: CreateStockAdjustmentInput = {
        ...testAdjustmentInput,
        adjustment_type: 'opname',
        quantity: 75,
        reason: 'Physical count'
      };

      const result = await createStockAdjustment(opnameInput);

      expect(result.adjustment_type).toEqual('opname');
      expect(result.quantity).toEqual(75);

      // Verify product stock was set to exact quantity (75)
      const updatedProduct = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();

      expect(parseFloat(updatedProduct[0].current_stock)).toEqual(75);
    });

    it('should prevent negative stock for "out" adjustments', async () => {
      const outInput: CreateStockAdjustmentInput = {
        ...testAdjustmentInput,
        adjustment_type: 'out',
        quantity: 100, // More than current stock of 50
        reason: 'Large removal'
      };

      await createStockAdjustment(outInput);

      // Verify stock was set to 0, not negative
      const updatedProduct = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();

      expect(parseFloat(updatedProduct[0].current_stock)).toEqual(0);
    });

    it('should throw error for non-existent product', async () => {
      const invalidInput: CreateStockAdjustmentInput = {
        ...testAdjustmentInput,
        product_id: 99999
      };

      await expect(createStockAdjustment(invalidInput)).rejects.toThrow(/product not found/i);
    });

    it('should throw error for non-existent user', async () => {
      const invalidInput: CreateStockAdjustmentInput = {
        ...testAdjustmentInput,
        user_id: 99999
      };

      await expect(createStockAdjustment(invalidInput)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getStockAdjustments', () => {
    it('should return all stock adjustments', async () => {
      // Create multiple adjustments
      await createStockAdjustment(testAdjustmentInput);
      await createStockAdjustment({
        ...testAdjustmentInput,
        adjustment_type: 'out',
        quantity: 5,
        reason: 'Test out'
      });

      const results = await getStockAdjustments();

      expect(results).toHaveLength(2);
      expect(results[0].quantity).toEqual(10);
      expect(results[1].quantity).toEqual(5);
      expect(typeof results[0].quantity).toEqual('number');
    });

    it('should return empty array when no adjustments exist', async () => {
      const results = await getStockAdjustments();
      expect(results).toHaveLength(0);
    });
  });

  describe('getStockAdjustmentsByProduct', () => {
    it('should return adjustments for specific product', async () => {
      // Create adjustment for test product
      await createStockAdjustment(testAdjustmentInput);

      // Create another product and adjustment
      const anotherProduct = await db.insert(productsTable)
        .values({
          kode_brg: 'TEST002',
          nama_brg: 'Another Product',
          satuan_default: 'kg',
          isi_per_satuan: '1',
          harga_beli: '5000',
          harga_jual: '7500',
          stok_min: '5',
          stok_max: '50',
          current_stock: '25'
        })
        .returning()
        .execute();

      await createStockAdjustment({
        ...testAdjustmentInput,
        product_id: anotherProduct[0].id,
        quantity: 15
      });

      const results = await getStockAdjustmentsByProduct(testProductId);

      expect(results).toHaveLength(1);
      expect(results[0].product_id).toEqual(testProductId);
      expect(results[0].quantity).toEqual(10);
    });

    it('should return empty array for product with no adjustments', async () => {
      const results = await getStockAdjustmentsByProduct(testProductId);
      expect(results).toHaveLength(0);
    });
  });

  describe('getStockAdjustmentsByDateRange', () => {
    it('should return adjustments within date range', async () => {
      await createStockAdjustment(testAdjustmentInput);

      // Use a broader date range to ensure we capture the adjustment
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const results = await getStockAdjustmentsByDateRange(yesterday, tomorrow);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(adjustment => {
        expect(adjustment.created_at).toBeInstanceOf(Date);
        expect(adjustment.created_at >= yesterday).toBe(true);
        expect(adjustment.created_at <= tomorrow).toBe(true);
      });
    });

    it('should return empty array for date range with no adjustments', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 3);

      const results = await getStockAdjustmentsByDateRange(dayBeforeYesterday, yesterday);
      expect(results).toHaveLength(0);
    });
  });

  describe('performStockOpname', () => {
    it('should perform bulk stock opname with differences', async () => {
      const opnameData = [
        {
          product_id: testProductId,
          actual_quantity: 45, // Current is 50, difference is -5
          user_id: testUserId
        }
      ];

      const result = await performStockOpname(opnameData);

      expect(result.success).toEqual(1);
      expect(result.failed).toEqual(0);
      expect(result.errors).toHaveLength(0);

      // Verify product stock was updated
      const updatedProduct = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();

      expect(parseFloat(updatedProduct[0].current_stock)).toEqual(45);

      // Verify adjustment record was created
      const adjustments = await getStockAdjustmentsByProduct(testProductId);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].adjustment_type).toEqual('opname');
      expect(adjustments[0].quantity).toEqual(45);
      expect(adjustments[0].reason).toContain('Stock opname: difference of -5');
    });

    it('should skip products with no stock difference', async () => {
      const opnameData = [
        {
          product_id: testProductId,
          actual_quantity: 50, // Same as current stock
          user_id: testUserId
        }
      ];

      const result = await performStockOpname(opnameData);

      expect(result.success).toEqual(1);
      expect(result.failed).toEqual(0);

      // Verify no adjustment record was created
      const adjustments = await getStockAdjustmentsByProduct(testProductId);
      expect(adjustments).toHaveLength(0);
    });

    it('should handle mix of successful and failed opname operations', async () => {
      const opnameData = [
        {
          product_id: testProductId,
          actual_quantity: 40,
          user_id: testUserId
        },
        {
          product_id: 99999, // Non-existent product
          actual_quantity: 30,
          user_id: testUserId
        }
      ];

      const result = await performStockOpname(opnameData);

      expect(result.success).toEqual(1);
      expect(result.failed).toEqual(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Product with ID 99999 not found');
    });
  });
});
