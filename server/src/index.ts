
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  loginInputSchema,
  createUserInputSchema,
  userRoleEnum,
  createCategoryInputSchema,
  createUnitInputSchema,
  createProductInputSchema,
  createSupplierInputSchema,
  createPurchaseInputSchema,
  purchaseExcelRowSchema,
  createSalesInputSchema,
  salesExcelRowSchema,
  createStockAdjustmentInputSchema
} from './schema';

// Handler imports
import { login, logout, verifyToken } from './handlers/auth';
import { createUser, getUsers, getUserById, updateUserRole, deactivateUser } from './handlers/users';
import { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory } from './handlers/categories';
import { createUnit, getUnits, getUnitById, updateUnit, deleteUnit } from './handlers/units';
import {
  createProduct,
  getProducts,
  getProductById,
  getProductByKode,
  updateProduct,
  getLowStockProducts,
  searchProducts,
  updateProductStock
} from './handlers/products';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  getSupplierByCode,
  updateSupplier,
  deactivateSupplier
} from './handlers/suppliers';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  getPurchasesByDateRange,
  getPurchasesBySupplier,
  importPurchasesFromExcel,
  updatePurchase,
  deletePurchase
} from './handlers/purchases';
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
} from './handlers/sales';
import {
  createStockAdjustment,
  getStockAdjustments,
  getStockAdjustmentsByProduct,
  getStockAdjustmentsByDateRange,
  performStockOpname
} from './handlers/stock_adjustments';
import {
  getDashboardSummary,
  getDailySalesData,
  getWeeklySalesData,
  getMonthlySalesData,
  getLowStockAlerts,
  getExpiryAlerts
} from './handlers/dashboard';
import { seedDemoUsers } from './handlers/setup';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  logout: publicProcedure
    .input(z.string())
    .mutation(({ input }) => logout(input)),

  verifyToken: publicProcedure
    .input(z.string())
    .query(({ input }) => verifyToken(input)),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),

  updateUserRole: publicProcedure
    .input(z.object({ id: z.number(), role: userRoleEnum }))
    .mutation(({ input }) => updateUserRole(input.id, input.role)),

  deactivateUser: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deactivateUser(input)),

  // Category routes
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getCategories: publicProcedure
    .query(() => getCategories()),

  getCategoryById: publicProcedure
    .input(z.number())
    .query(({ input }) => getCategoryById(input)),

  updateCategory: publicProcedure
    .input(z.object({ id: z.number(), data: createCategoryInputSchema.partial() }))
    .mutation(({ input }) => updateCategory(input.id, input.data)),

  deleteCategory: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCategory(input)),

  // Unit routes
  createUnit: publicProcedure
    .input(createUnitInputSchema)
    .mutation(({ input }) => createUnit(input)),

  getUnits: publicProcedure
    .query(() => getUnits()),

  getUnitById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUnitById(input)),

  updateUnit: publicProcedure
    .input(z.object({ id: z.number(), data: createUnitInputSchema.partial() }))
    .mutation(({ input }) => updateUnit(input.id, input.data)),

  deleteUnit: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteUnit(input)),

  // Product routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .query(() => getProducts()),

  getProductById: publicProcedure
    .input(z.number())
    .query(({ input }) => getProductById(input)),

  getProductByKode: publicProcedure
    .input(z.string())
    .query(({ input }) => getProductByKode(input)),

  updateProduct: publicProcedure
    .input(z.object({ id: z.number(), data: createProductInputSchema.partial() }))
    .mutation(({ input }) => updateProduct(input.id, input.data)),

  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),

  searchProducts: publicProcedure
    .input(z.string())
    .query(({ input }) => searchProducts(input)),

  updateProductStock: publicProcedure
    .input(z.object({ id: z.number(), quantity: z.number() }))
    .mutation(({ input }) => updateProductStock(input.id, input.quantity)),

  // Supplier routes
  createSupplier: publicProcedure
    .input(createSupplierInputSchema)
    .mutation(({ input }) => createSupplier(input)),

  getSuppliers: publicProcedure
    .query(() => getSuppliers()),

  getSupplierById: publicProcedure
    .input(z.number())
    .query(({ input }) => getSupplierById(input)),

  getSupplierByCode: publicProcedure
    .input(z.string())
    .query(({ input }) => getSupplierByCode(input)),

  updateSupplier: publicProcedure
    .input(z.object({ id: z.number(), data: createSupplierInputSchema.partial() }))
    .mutation(({ input }) => updateSupplier(input.id, input.data)),

  deactivateSupplier: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deactivateSupplier(input)),

  // Purchase routes
  createPurchase: publicProcedure
    .input(createPurchaseInputSchema)
    .mutation(({ input }) => createPurchase(input)),

  getPurchases: publicProcedure
    .query(() => getPurchases()),

  getPurchaseById: publicProcedure
    .input(z.number())
    .query(({ input }) => getPurchaseById(input)),

  getPurchasesByDateRange: publicProcedure
    .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
    .query(({ input }) => getPurchasesByDateRange(input.startDate, input.endDate)),

  getPurchasesBySupplier: publicProcedure
    .input(z.string())
    .query(({ input }) => getPurchasesBySupplier(input)),

  importPurchasesFromExcel: publicProcedure
    .input(z.array(purchaseExcelRowSchema))
    .mutation(({ input }) => importPurchasesFromExcel(input)),

  updatePurchase: publicProcedure
    .input(z.object({ id: z.number(), data: createPurchaseInputSchema.partial() }))
    .mutation(({ input }) => updatePurchase(input.id, input.data)),

  deletePurchase: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deletePurchase(input)),

  // Sales routes
  createSales: publicProcedure
    .input(createSalesInputSchema)
    .mutation(({ input }) => createSales(input)),

  getSales: publicProcedure
    .query(() => getSales()),

  getSalesById: publicProcedure
    .input(z.number())
    .query(({ input }) => getSalesById(input)),

  getSalesByDateRange: publicProcedure
    .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
    .query(({ input }) => getSalesByDateRange(input.startDate, input.endDate)),

  getSalesByProduct: publicProcedure
    .input(z.string())
    .query(({ input }) => getSalesByProduct(input)),

  importSalesFromExcel: publicProcedure
    .input(z.array(salesExcelRowSchema))
    .mutation(({ input }) => importSalesFromExcel(input)),

  getDailySalesTotal: publicProcedure
    .input(z.coerce.date())
    .query(({ input }) => getDailySalesTotal(input)),

  getMonthlySalesReport: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(({ input }) => getMonthlySalesReport(input.year, input.month)),

  updateSales: publicProcedure
    .input(z.object({ id: z.number(), data: createSalesInputSchema.partial() }))
    .mutation(({ input }) => updateSales(input.id, input.data)),

  deleteSales: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteSales(input)),

  // Stock adjustment routes
  createStockAdjustment: publicProcedure
    .input(createStockAdjustmentInputSchema)
    .mutation(({ input }) => createStockAdjustment(input)),

  getStockAdjustments: publicProcedure
    .query(() => getStockAdjustments()),

  getStockAdjustmentsByProduct: publicProcedure
    .input(z.number())
    .query(({ input }) => getStockAdjustmentsByProduct(input)),

  getStockAdjustmentsByDateRange: publicProcedure
    .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
    .query(({ input }) => getStockAdjustmentsByDateRange(input.startDate, input.endDate)),

  performStockOpname: publicProcedure
    .input(z.array(z.object({
      product_id: z.number(),
      actual_quantity: z.number(),
      user_id: z.number()
    })))
    .mutation(({ input }) => performStockOpname(input)),

  // Dashboard routes
  getDashboardSummary: publicProcedure
    .query(() => getDashboardSummary()),

  getDailySalesData: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getDailySalesData(input)),

  getWeeklySalesData: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getWeeklySalesData(input)),

  getMonthlySalesData: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getMonthlySalesData(input)),

  getLowStockAlerts: publicProcedure
    .query(() => getLowStockAlerts()),

  getExpiryAlerts: publicProcedure
    .query(() => getExpiryAlerts()),

  // Setup route for manual demo user seeding
  seedDemoUsers: publicProcedure
    .mutation(() => seedDemoUsers()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  
  // Seed demo users on server start
  try {
    await seedDemoUsers();
  } catch (error) {
    console.warn('Demo user seeding failed:', error);
  }
  
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
