
import { db } from '../db';
import { productsTable, salesTable, purchasesTable } from '../db/schema';
import { sql, eq, gte, lte, and } from 'drizzle-orm';
import { type DashboardSummary } from '../schema';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    // Get total stock value and product count
    const stockData = await db.select({
      total_value: sql<string>`SUM(${productsTable.current_stock} * ${productsTable.harga_jual})`,
      total_products: sql<string>`COUNT(*)`,
      low_stock_count: sql<string>`COUNT(*) FILTER (WHERE ${productsTable.current_stock} <= ${productsTable.stok_min})`
    })
    .from(productsTable)
    .where(eq(productsTable.is_active, true))
    .execute();

    // Get today's date for daily calculations
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];

    // Get daily sales
    const dailySalesData = await db.select({
      daily_sales: sql<string>`COALESCE(SUM(${salesTable.hrg_jual} * ${salesTable.jumlah}), 0)`
    })
    .from(salesTable)
    .where(eq(salesTable.tgl_jual, sql`${todayDate}::date`))
    .execute();

    // Get daily purchases
    const dailyPurchasesData = await db.select({
      daily_purchases: sql<string>`COALESCE(SUM(${purchasesTable.hrg_beli} * ${purchasesTable.jumlah}), 0)`
    })
    .from(purchasesTable)
    .where(eq(purchasesTable.tgl_beli, sql`${todayDate}::date`))
    .execute();

    const stockResult = stockData[0];
    const dailySales = dailySalesData[0];
    const dailyPurchases = dailyPurchasesData[0];

    return {
      total_stock_value: parseFloat(stockResult.total_value || '0'),
      total_products: parseInt(stockResult.total_products || '0'),
      low_stock_count: parseInt(stockResult.low_stock_count || '0'),
      daily_sales: parseFloat(dailySales.daily_sales || '0'),
      daily_purchases: parseFloat(dailyPurchases.daily_purchases || '0'),
      pending_orders: 0 // Not implemented in current schema
    };
  } catch (error) {
    console.error('Dashboard summary calculation failed:', error);
    throw error;
  }
}

export async function getDailySalesData(days: number = 30): Promise<{ date: string; sales: number; purchases: number }[]> {
  try {
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get daily sales data
    const salesData = await db.select({
      date: salesTable.tgl_jual,
      total_sales: sql<string>`SUM(${salesTable.hrg_jual} * ${salesTable.jumlah})`
    })
    .from(salesTable)
    .where(gte(salesTable.tgl_jual, sql`${startDateStr}::date`))
    .groupBy(salesTable.tgl_jual)
    .orderBy(salesTable.tgl_jual)
    .execute();

    // Get daily purchases data
    const purchasesData = await db.select({
      date: purchasesTable.tgl_beli,
      total_purchases: sql<string>`SUM(${purchasesTable.hrg_beli} * ${purchasesTable.jumlah})`
    })
    .from(purchasesTable)
    .where(gte(purchasesTable.tgl_beli, sql`${startDateStr}::date`))
    .groupBy(purchasesTable.tgl_beli)
    .orderBy(purchasesTable.tgl_beli)
    .execute();

    // Create a map for easy lookup
    const salesMap = new Map<string, number>();
    salesData.forEach(item => {
      if (item.date) {
        const dateStr = new Date(item.date).toISOString().split('T')[0];
        salesMap.set(dateStr, parseFloat(item.total_sales || '0'));
      }
    });

    const purchasesMap = new Map<string, number>();
    purchasesData.forEach(item => {
      if (item.date) {
        const dateStr = new Date(item.date).toISOString().split('T')[0];
        purchasesMap.set(dateStr, parseFloat(item.total_purchases || '0'));
      }
    });

    // Generate result array with all dates in range
    const result: { date: string; sales: number; purchases: number }[] = [];
    for (let i = 0; i < days; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      result.unshift({
        date: dateStr,
        sales: salesMap.get(dateStr) || 0,
        purchases: purchasesMap.get(dateStr) || 0
      });
    }

    return result;
  } catch (error) {
    console.error('Daily sales data calculation failed:', error);
    throw error;
  }
}

export async function getWeeklySalesData(weeks: number = 12): Promise<{ week: string; sales: number; purchases: number }[]> {
  try {
    // Calculate start date (weeks ago)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get weekly sales data
    const salesData = await db.select({
      week: sql<string>`TO_CHAR(${salesTable.tgl_jual}, 'YYYY-"W"WW')`,
      total_sales: sql<string>`SUM(${salesTable.hrg_jual} * ${salesTable.jumlah})`
    })
    .from(salesTable)
    .where(gte(salesTable.tgl_jual, sql`${startDateStr}::date`))
    .groupBy(sql`TO_CHAR(${salesTable.tgl_jual}, 'YYYY-"W"WW')`)
    .orderBy(sql`TO_CHAR(${salesTable.tgl_jual}, 'YYYY-"W"WW')`)
    .execute();

    // Get weekly purchases data
    const purchasesData = await db.select({
      week: sql<string>`TO_CHAR(${purchasesTable.tgl_beli}, 'YYYY-"W"WW')`,
      total_purchases: sql<string>`SUM(${purchasesTable.hrg_beli} * ${purchasesTable.jumlah})`
    })
    .from(purchasesTable)
    .where(gte(purchasesTable.tgl_beli, sql`${startDateStr}::date`))
    .groupBy(sql`TO_CHAR(${purchasesTable.tgl_beli}, 'YYYY-"W"WW')`)
    .orderBy(sql`TO_CHAR(${purchasesTable.tgl_beli}, 'YYYY-"W"WW')`)
    .execute();

    // Create maps for easy lookup
    const salesMap = new Map<string, number>();
    salesData.forEach(item => {
      salesMap.set(item.week, parseFloat(item.total_sales || '0'));
    });

    const purchasesMap = new Map<string, number>();
    purchasesData.forEach(item => {
      purchasesMap.set(item.week, parseFloat(item.total_purchases || '0'));
    });

    // Generate result array with all weeks in range
    const result: { week: string; sales: number; purchases: number }[] = [];
    for (let i = 0; i < weeks; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - (i * 7));
      
      // Format week string to match PostgreSQL format
      const year = currentDate.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (currentDate.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekStr = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      
      result.unshift({
        week: weekStr,
        sales: salesMap.get(weekStr) || 0,
        purchases: purchasesMap.get(weekStr) || 0
      });
    }

    return result;
  } catch (error) {
    console.error('Weekly sales data calculation failed:', error);
    throw error;
  }
}

export async function getMonthlySalesData(months: number = 12): Promise<{ month: string; sales: number; purchases: number }[]> {
  try {
    // Calculate start date (months ago)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1); // First day of start month
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get monthly sales data
    const salesData = await db.select({
      month: sql<string>`TO_CHAR(${salesTable.tgl_jual}, 'YYYY-MM')`,
      total_sales: sql<string>`SUM(${salesTable.hrg_jual} * ${salesTable.jumlah})`
    })
    .from(salesTable)
    .where(gte(salesTable.tgl_jual, sql`${startDateStr}::date`))
    .groupBy(sql`TO_CHAR(${salesTable.tgl_jual}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${salesTable.tgl_jual}, 'YYYY-MM')`)
    .execute();

    // Get monthly purchases data
    const purchasesData = await db.select({
      month: sql<string>`TO_CHAR(${purchasesTable.tgl_beli}, 'YYYY-MM')`,
      total_purchases: sql<string>`SUM(${purchasesTable.hrg_beli} * ${purchasesTable.jumlah})`
    })
    .from(purchasesTable)
    .where(gte(purchasesTable.tgl_beli, sql`${startDateStr}::date`))
    .groupBy(sql`TO_CHAR(${purchasesTable.tgl_beli}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${purchasesTable.tgl_beli}, 'YYYY-MM')`)
    .execute();

    // Create maps for easy lookup
    const salesMap = new Map<string, number>();
    salesData.forEach(item => {
      salesMap.set(item.month, parseFloat(item.total_sales || '0'));
    });

    const purchasesMap = new Map<string, number>();
    purchasesData.forEach(item => {
      purchasesMap.set(item.month, parseFloat(item.total_purchases || '0'));
    });

    // Generate result array with all months in range
    const result: { month: string; sales: number; purchases: number }[] = [];
    for (let i = 0; i < months; i++) {
      const currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() - i);
      const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      result.unshift({
        month: monthStr,
        sales: salesMap.get(monthStr) || 0,
        purchases: purchasesMap.get(monthStr) || 0
      });
    }

    return result;
  } catch (error) {
    console.error('Monthly sales data calculation failed:', error);
    throw error;
  }
}

export async function getLowStockAlerts(): Promise<{ product: string; current_stock: number; min_stock: number }[]> {
  try {
    const lowStockProducts = await db.select({
      product: productsTable.nama_brg,
      current_stock: productsTable.current_stock,
      min_stock: productsTable.stok_min
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.is_active, true),
        lte(productsTable.current_stock, productsTable.stok_min)
      )
    )
    .orderBy(productsTable.nama_brg)
    .execute();

    return lowStockProducts.map(item => ({
      product: item.product,
      current_stock: parseFloat(item.current_stock),
      min_stock: parseFloat(item.min_stock)
    }));
  } catch (error) {
    console.error('Low stock alerts calculation failed:', error);
    throw error;
  }
}

export async function getExpiryAlerts(): Promise<{ product: string; expiry_date: Date; days_remaining: number }[]> {
  try {
    // This is a placeholder implementation since expiry_date is not in the current schema
    // In a future enhancement, this would query products with expiry dates approaching
    return [];
  } catch (error) {
    console.error('Expiry alerts calculation failed:', error);
    throw error;
  }
}
