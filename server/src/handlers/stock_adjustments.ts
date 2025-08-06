
import { db } from '../db';
import { stockAdjustmentsTable, productsTable, usersTable } from '../db/schema';
import { type CreateStockAdjustmentInput, type StockAdjustment } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export async function createStockAdjustment(input: CreateStockAdjustmentInput): Promise<StockAdjustment> {
  try {
    // Verify product exists
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (product.length === 0) {
      throw new Error('Product not found');
    }

    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Create stock adjustment record
    const result = await db.insert(stockAdjustmentsTable)
      .values({
        product_id: input.product_id,
        adjustment_type: input.adjustment_type,
        quantity: input.quantity.toString(),
        reason: input.reason,
        notes: input.notes || null,
        user_id: input.user_id
      })
      .returning()
      .execute();

    const adjustment = result[0];

    // Update product current_stock based on adjustment type
    const currentProduct = product[0];
    const currentStock = parseFloat(currentProduct.current_stock);
    let newStock: number;

    switch (input.adjustment_type) {
      case 'in':
        newStock = currentStock + input.quantity;
        break;
      case 'out':
        newStock = Math.max(0, currentStock - input.quantity); // Prevent negative stock
        break;
      case 'opname':
        newStock = input.quantity; // Set stock to exact quantity
        break;
      default:
        throw new Error('Invalid adjustment type');
    }

    // Update product stock
    await db.update(productsTable)
      .set({ 
        current_stock: newStock.toString(),
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    return {
      ...adjustment,
      quantity: parseFloat(adjustment.quantity)
    };
  } catch (error) {
    console.error('Stock adjustment creation failed:', error);
    throw error;
  }
}

export async function getStockAdjustments(): Promise<StockAdjustment[]> {
  try {
    const results = await db.select()
      .from(stockAdjustmentsTable)
      .execute();

    return results.map(adjustment => ({
      ...adjustment,
      quantity: parseFloat(adjustment.quantity)
    }));
  } catch (error) {
    console.error('Failed to fetch stock adjustments:', error);
    throw error;
  }
}

export async function getStockAdjustmentsByProduct(productId: number): Promise<StockAdjustment[]> {
  try {
    const results = await db.select()
      .from(stockAdjustmentsTable)
      .where(eq(stockAdjustmentsTable.product_id, productId))
      .execute();

    return results.map(adjustment => ({
      ...adjustment,
      quantity: parseFloat(adjustment.quantity)
    }));
  } catch (error) {
    console.error('Failed to fetch stock adjustments by product:', error);
    throw error;
  }
}

export async function getStockAdjustmentsByDateRange(startDate: Date, endDate: Date): Promise<StockAdjustment[]> {
  try {
    // Set end date to end of day to include records created on that day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conditions: SQL<unknown>[] = [
      gte(stockAdjustmentsTable.created_at, startDate),
      lte(stockAdjustmentsTable.created_at, endOfDay)
    ];

    const results = await db.select()
      .from(stockAdjustmentsTable)
      .where(and(...conditions))
      .execute();

    return results.map(adjustment => ({
      ...adjustment,
      quantity: parseFloat(adjustment.quantity)
    }));
  } catch (error) {
    console.error('Failed to fetch stock adjustments by date range:', error);
    throw error;
  }
}

export async function performStockOpname(adjustments: { product_id: number; actual_quantity: number; user_id: number }[]): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const adjustment of adjustments) {
      try {
        // Get current product stock
        const product = await db.select()
          .from(productsTable)
          .where(eq(productsTable.id, adjustment.product_id))
          .execute();

        if (product.length === 0) {
          errors.push(`Product with ID ${adjustment.product_id} not found`);
          failed++;
          continue;
        }

        const currentStock = parseFloat(product[0].current_stock);
        const difference = adjustment.actual_quantity - currentStock;

        // Only create adjustment if there's a difference
        if (difference !== 0) {
          await createStockAdjustment({
            product_id: adjustment.product_id,
            adjustment_type: 'opname',
            quantity: adjustment.actual_quantity,
            reason: `Stock opname: difference of ${difference}`,
            notes: `Previous stock: ${currentStock}, Actual stock: ${adjustment.actual_quantity}`,
            user_id: adjustment.user_id
          });
        }

        success++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Product ID ${adjustment.product_id}: ${errorMessage}`);
        failed++;
      }
    }

    return { success, failed, errors };
  } catch (error) {
    console.error('Stock opname failed:', error);
    throw error;
  }
}
