
import { db } from '../db';
import { salesTable, productsTable, stockAdjustmentsTable } from '../db/schema';
import { type CreateSalesInput, type Sales, type SalesExcelRow } from '../schema';
import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function createSales(input: CreateSalesInput): Promise<Sales> {
  try {
    // Validate product exists and get current stock
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.kode_brg, input.kode_brg))
      .execute();

    if (products.length === 0) {
      throw new Error(`Product with code ${input.kode_brg} not found`);
    }

    const product = products[0];
    const currentStock = parseFloat(product.current_stock);

    // Check stock availability
    if (currentStock < input.jumlah) {
      throw new Error(`Insufficient stock. Available: ${currentStock}, Required: ${input.jumlah}`);
    }

    // Create sales record - convert Date to string for date column
    const result = await db.insert(salesTable)
      .values({
        tgl_jual: input.tgl_jual.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        f_jual: input.f_jual,
        acc: input.acc || null,
        kode_brg: input.kode_brg,
        nama_brg: input.nama_brg,
        jumlah: input.jumlah,
        satuan: input.satuan,
        hrg_jual: input.hrg_jual.toString(),
        disc1: input.disc1?.toString() || '0',
        disc2: input.disc2?.toString() || '0',
        disc3: input.disc3?.toString() || '0',
        disc_rp: input.disc_rp?.toString() || '0',
        ppn: input.ppn?.toString() || null,
        codelg: input.codelg || null,
        nama_lg: input.nama_lg || null
      })
      .returning()
      .execute();

    // Update product stock
    const newStock = currentStock - input.jumlah;
    await db.update(productsTable)
      .set({
        current_stock: newStock.toString(),
        updated_at: new Date()
      })
      .where(eq(productsTable.kode_brg, input.kode_brg))
      .execute();

    const sales = result[0];
    return {
      ...sales,
      tgl_jual: new Date(sales.tgl_jual), // Convert string back to Date
      hrg_jual: parseFloat(sales.hrg_jual),
      disc1: parseFloat(sales.disc1),
      disc2: parseFloat(sales.disc2),
      disc3: parseFloat(sales.disc3),
      disc_rp: parseFloat(sales.disc_rp),
      ppn: sales.ppn ? parseFloat(sales.ppn) : null
    };
  } catch (error) {
    console.error('Sales creation failed:', error);
    throw error;
  }
}

export async function getSales(): Promise<Sales[]> {
  try {
    const results = await db.select()
      .from(salesTable)
      .execute();

    return results.map(sales => ({
      ...sales,
      tgl_jual: new Date(sales.tgl_jual), // Convert string to Date
      hrg_jual: parseFloat(sales.hrg_jual),
      disc1: parseFloat(sales.disc1),
      disc2: parseFloat(sales.disc2),
      disc3: parseFloat(sales.disc3),
      disc_rp: parseFloat(sales.disc_rp),
      ppn: sales.ppn ? parseFloat(sales.ppn) : null
    }));
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    throw error;
  }
}

export async function getSalesById(id: number): Promise<Sales | null> {
  try {
    const results = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const sales = results[0];
    return {
      ...sales,
      tgl_jual: new Date(sales.tgl_jual), // Convert string to Date
      hrg_jual: parseFloat(sales.hrg_jual),
      disc1: parseFloat(sales.disc1),
      disc2: parseFloat(sales.disc2),
      disc3: parseFloat(sales.disc3),
      disc_rp: parseFloat(sales.disc_rp),
      ppn: sales.ppn ? parseFloat(sales.ppn) : null
    };
  } catch (error) {
    console.error('Failed to fetch sales by ID:', error);
    throw error;
  }
}

export async function getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sales[]> {
  try {
    // Convert Date objects to string format for comparison
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const results = await db.select()
      .from(salesTable)
      .where(and(
        gte(salesTable.tgl_jual, startDateStr),
        lte(salesTable.tgl_jual, endDateStr)
      ))
      .execute();

    return results.map(sales => ({
      ...sales,
      tgl_jual: new Date(sales.tgl_jual), // Convert string to Date
      hrg_jual: parseFloat(sales.hrg_jual),
      disc1: parseFloat(sales.disc1),
      disc2: parseFloat(sales.disc2),
      disc3: parseFloat(sales.disc3),
      disc_rp: parseFloat(sales.disc_rp),
      ppn: sales.ppn ? parseFloat(sales.ppn) : null
    }));
  } catch (error) {
    console.error('Failed to fetch sales by date range:', error);
    throw error;
  }
}

export async function getSalesByProduct(kode_brg: string): Promise<Sales[]> {
  try {
    const results = await db.select()
      .from(salesTable)
      .where(eq(salesTable.kode_brg, kode_brg))
      .execute();

    return results.map(sales => ({
      ...sales,
      tgl_jual: new Date(sales.tgl_jual), // Convert string to Date
      hrg_jual: parseFloat(sales.hrg_jual),
      disc1: parseFloat(sales.disc1),
      disc2: parseFloat(sales.disc2),
      disc3: parseFloat(sales.disc3),
      disc_rp: parseFloat(sales.disc_rp),
      ppn: sales.ppn ? parseFloat(sales.ppn) : null
    }));
  } catch (error) {
    console.error('Failed to fetch sales by product:', error);
    throw error;
  }
}

export async function importSalesFromExcel(excelData: SalesExcelRow[]): Promise<{ success: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  for (const [index, row] of excelData.entries()) {
    try {
      // Parse date string to Date object
      const tgl_jual = new Date(row.tgl_jual);
      if (isNaN(tgl_jual.getTime())) {
        throw new Error(`Invalid date format: ${row.tgl_jual}`);
      }

      const salesInput: CreateSalesInput = {
        tgl_jual,
        f_jual: row.f_jual,
        acc: row.acc || null,
        kode_brg: row.kode_brg,
        nama_brg: row.nama_brg,
        jumlah: row.jumlah,
        satuan: row.satuan,
        hrg_jual: row.hrg_jual,
        disc1: row.disc1 || 0,
        disc2: row.disc2 || 0,
        disc3: row.disc3 || 0,
        disc_rp: row.disc_rp || 0,
        ppn: row.ppn || null,
        codelg: row.codelg || null,
        nama_lg: row.nama_lg || null
      };

      await createSales(salesInput);
      success++;
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Row ${index + 1}: ${errorMessage}`);
    }
  }

  return { success, failed, errors };
}

export async function getDailySalesTotal(date: Date): Promise<number> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    const results = await db.select({
      total: sum(sql`${salesTable.hrg_jual} * ${salesTable.jumlah}`)
    })
      .from(salesTable)
      .where(eq(salesTable.tgl_jual, dateStr))
      .execute();

    const total = results[0]?.total;
    return total ? parseFloat(total) : 0;
  } catch (error) {
    console.error('Failed to get daily sales total:', error);
    throw error;
  }
}

export async function getMonthlySalesReport(year: number, month: number): Promise<{ date: string; total: number }[]> {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const results = await db.select({
      date: salesTable.tgl_jual,
      total: sum(sql`${salesTable.hrg_jual} * ${salesTable.jumlah}`)
    })
      .from(salesTable)
      .where(and(
        gte(salesTable.tgl_jual, startDateStr),
        lte(salesTable.tgl_jual, endDateStr)
      ))
      .groupBy(salesTable.tgl_jual)
      .execute();

    return results.map(result => ({
      date: result.date, // Already a string in YYYY-MM-DD format
      total: result.total ? parseFloat(result.total) : 0
    }));
  } catch (error) {
    console.error('Failed to get monthly sales report:', error);
    throw error;
  }
}

export async function updateSales(id: number, input: Partial<CreateSalesInput>): Promise<Sales> {
  try {
    // Get existing sales record
    const existingSales = await getSalesById(id);
    if (!existingSales) {
      throw new Error(`Sales record with ID ${id} not found`);
    }

    // If quantity is being updated, adjust stock
    if (input.jumlah !== undefined && input.jumlah !== existingSales.jumlah) {
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.kode_brg, existingSales.kode_brg))
        .execute();

      if (products.length > 0) {
        const product = products[0];
        const currentStock = parseFloat(product.current_stock);
        
        // Calculate stock adjustment (positive means adding back to stock, negative means reducing)
        const stockAdjustment = existingSales.jumlah - input.jumlah;
        const newStock = currentStock + stockAdjustment;

        if (newStock < 0) {
          throw new Error(`Insufficient stock for update. Available: ${currentStock}, Required: ${input.jumlah - existingSales.jumlah}`);
        }

        await db.update(productsTable)
          .set({
            current_stock: newStock.toString(),
            updated_at: new Date()
          })
          .where(eq(productsTable.kode_brg, existingSales.kode_brg))
          .execute();
      }
    }

    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.tgl_jual !== undefined) updateValues.tgl_jual = input.tgl_jual.toISOString().split('T')[0];
    if (input.f_jual !== undefined) updateValues.f_jual = input.f_jual;
    if (input.acc !== undefined) updateValues.acc = input.acc;
    if (input.kode_brg !== undefined) updateValues.kode_brg = input.kode_brg;
    if (input.nama_brg !== undefined) updateValues.nama_brg = input.nama_brg;
    if (input.jumlah !== undefined) updateValues.jumlah = input.jumlah;
    if (input.satuan !== undefined) updateValues.satuan = input.satuan;
    if (input.hrg_jual !== undefined) updateValues.hrg_jual = input.hrg_jual.toString();
    if (input.disc1 !== undefined) updateValues.disc1 = input.disc1.toString();
    if (input.disc2 !== undefined) updateValues.disc2 = input.disc2.toString();
    if (input.disc3 !== undefined) updateValues.disc3 = input.disc3.toString();
    if (input.disc_rp !== undefined) updateValues.disc_rp = input.disc_rp.toString();
    if (input.ppn !== undefined) updateValues.ppn = input.ppn?.toString() || null;
    if (input.codelg !== undefined) updateValues.codelg = input.codelg;
    if (input.nama_lg !== undefined) updateValues.nama_lg = input.nama_lg;

    const result = await db.update(salesTable)
      .set(updateValues)
      .where(eq(salesTable.id, id))
      .returning()
      .execute();

    const sales = result[0];
    return {
      ...sales,
      tgl_jual: new Date(sales.tgl_jual), // Convert string to Date
      hrg_jual: parseFloat(sales.hrg_jual),
      disc1: parseFloat(sales.disc1),
      disc2: parseFloat(sales.disc2),
      disc3: parseFloat(sales.disc3),
      disc_rp: parseFloat(sales.disc_rp),
      ppn: sales.ppn ? parseFloat(sales.ppn) : null
    };
  } catch (error) {
    console.error('Sales update failed:', error);
    throw error;
  }
}

export async function deleteSales(id: number): Promise<{ success: boolean }> {
  try {
    // Get existing sales record
    const existingSales = await getSalesById(id);
    if (!existingSales) {
      throw new Error(`Sales record with ID ${id} not found`);
    }

    // Revert stock changes
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.kode_brg, existingSales.kode_brg))
      .execute();

    if (products.length > 0) {
      const product = products[0];
      const currentStock = parseFloat(product.current_stock);
      const newStock = currentStock + existingSales.jumlah;

      await db.update(productsTable)
        .set({
          current_stock: newStock.toString(),
          updated_at: new Date()
        })
        .where(eq(productsTable.kode_brg, existingSales.kode_brg))
        .execute();
    }

    // Delete sales record
    await db.delete(salesTable)
      .where(eq(salesTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Sales deletion failed:', error);
    throw error;
  }
}
