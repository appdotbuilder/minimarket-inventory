
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import {
  createProduct,
  getProducts,
  getProductById,
  getProductByKode,
  updateProduct,
  getLowStockProducts,
  searchProducts,
  updateProductStock
} from '../handlers/products';
import { eq } from 'drizzle-orm';

const testInput: CreateProductInput = {
  kode_brg: 'TEST001',
  nama_brg: 'Test Product',
  kategori_id: null,
  satuan_default: 'PCS',
  isi_per_satuan: 1.5,
  harga_beli: 10000.50,
  harga_jual: 15000.75,
  stok_min: 10.5,
  stok_max: 100.5,
  barcode: '1234567890'
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product', async () => {
    const result = await createProduct(testInput);

    expect(result.kode_brg).toEqual('TEST001');
    expect(result.nama_brg).toEqual('Test Product');
    expect(result.kategori_id).toBeNull();
    expect(result.satuan_default).toEqual('PCS');
    expect(result.isi_per_satuan).toEqual(1.5);
    expect(typeof result.isi_per_satuan).toBe('number');
    expect(result.harga_beli).toEqual(10000.50);
    expect(typeof result.harga_beli).toBe('number');
    expect(result.harga_jual).toEqual(15000.75);
    expect(typeof result.harga_jual).toBe('number');
    expect(result.stok_min).toEqual(10.5);
    expect(typeof result.stok_min).toBe('number');
    expect(result.stok_max).toEqual(100.5);
    expect(typeof result.stok_max).toBe('number');
    expect(result.current_stock).toEqual(0);
    expect(typeof result.current_stock).toBe('number');
    expect(result.barcode).toEqual('1234567890');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].kode_brg).toEqual('TEST001');
    expect(products[0].nama_brg).toEqual('Test Product');
    expect(parseFloat(products[0].harga_beli)).toEqual(10000.50);
    expect(parseFloat(products[0].harga_jual)).toEqual(15000.75);
  });

  it('should create product with category', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const inputWithCategory = {
      ...testInput,
      kategori_id: categoryResult[0].id
    };

    const result = await createProduct(inputWithCategory);
    expect(result.kategori_id).toEqual(categoryResult[0].id);
  });

  it('should reject invalid category', async () => {
    const inputWithInvalidCategory = {
      ...testInput,
      kategori_id: 999
    };

    await expect(createProduct(inputWithInvalidCategory))
      .rejects.toThrow(/category not found/i);
  });

  it('should reject duplicate kode_brg', async () => {
    await createProduct(testInput);
    
    await expect(createProduct(testInput))
      .rejects.toThrow();
  });
});

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all active products', async () => {
    await createProduct(testInput);
    
    const secondInput = {
      ...testInput,
      kode_brg: 'TEST002',
      nama_brg: 'Test Product 2'
    };
    await createProduct(secondInput);

    const result = await getProducts();
    expect(result).toHaveLength(2);
    expect(result[0].nama_brg).toEqual('Test Product');
    expect(result[1].nama_brg).toEqual('Test Product 2');
    
    // Verify numeric conversions
    expect(typeof result[0].harga_beli).toBe('number');
    expect(typeof result[1].harga_jual).toBe('number');
  });

  it('should not return inactive products', async () => {
    // Create active product
    const activeProduct = await createProduct(testInput);
    
    // Deactivate product
    await db.update(productsTable)
      .set({ is_active: false })
      .where(eq(productsTable.id, activeProduct.id))
      .execute();

    const result = await getProducts();
    expect(result).toHaveLength(0);
  });
});

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent product', async () => {
    const result = await getProductById(999);
    expect(result).toBeNull();
  });

  it('should return product by ID', async () => {
    const created = await createProduct(testInput);
    const result = await getProductById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.kode_brg).toEqual('TEST001');
    expect(typeof result!.harga_beli).toBe('number');
  });
});

describe('getProductByKode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent kode', async () => {
    const result = await getProductByKode('NONEXISTENT');
    expect(result).toBeNull();
  });

  it('should return product by kode_brg', async () => {
    await createProduct(testInput);
    const result = await getProductByKode('TEST001');

    expect(result).not.toBeNull();
    expect(result!.kode_brg).toEqual('TEST001');
    expect(result!.nama_brg).toEqual('Test Product');
    expect(typeof result!.harga_jual).toBe('number');
  });
});

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update product fields', async () => {
    const created = await createProduct(testInput);
    
    const updates = {
      nama_brg: 'Updated Product Name',
      harga_jual: 20000.99
    };

    const result = await updateProduct(created.id, updates);
    
    expect(result.nama_brg).toEqual('Updated Product Name');
    expect(result.harga_jual).toEqual(20000.99);
    expect(typeof result.harga_jual).toBe('number');
    expect(result.kode_brg).toEqual('TEST001'); // Unchanged
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should update category', async () => {
    const created = await createProduct(testInput);
    
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'New Category',
        description: 'A new category'
      })
      .returning()
      .execute();

    const result = await updateProduct(created.id, {
      kategori_id: categoryResult[0].id
    });
    
    expect(result.kategori_id).toEqual(categoryResult[0].id);
  });

  it('should reject non-existent product', async () => {
    await expect(updateProduct(999, { nama_brg: 'Updated' }))
      .rejects.toThrow(/product not found/i);
  });

  it('should reject invalid category', async () => {
    const created = await createProduct(testInput);
    
    await expect(updateProduct(created.id, { kategori_id: 999 }))
      .rejects.toThrow(/category not found/i);
  });
});

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no low stock products', async () => {
    const result = await getLowStockProducts();
    expect(result).toEqual([]);
  });

  it('should return products with low stock', async () => {
    // Create product with low stock (current_stock = 0, stok_min = 10.5)
    const created = await createProduct(testInput);
    
    const result = await getLowStockProducts();
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(created.id);
    expect(typeof result[0].current_stock).toBe('number');
    expect(typeof result[0].stok_min).toBe('number');
  });

  it('should not return products with sufficient stock', async () => {
    const created = await createProduct(testInput);
    
    // Update stock to be above minimum
    await updateProductStock(created.id, 20);
    
    const result = await getLowStockProducts();
    expect(result).toHaveLength(0);
  });
});

describe('searchProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for no matches', async () => {
    await createProduct(testInput);
    const result = await searchProducts('NOMATCH');
    expect(result).toEqual([]);
  });

  it('should search by nama_brg', async () => {
    await createProduct(testInput);
    const result = await searchProducts('Test Product');
    
    expect(result).toHaveLength(1);
    expect(result[0].nama_brg).toEqual('Test Product');
  });

  it('should search by kode_brg', async () => {
    await createProduct(testInput);
    const result = await searchProducts('TEST001');
    
    expect(result).toHaveLength(1);
    expect(result[0].kode_brg).toEqual('TEST001');
  });

  it('should search by barcode', async () => {
    await createProduct(testInput);
    const result = await searchProducts('1234567890');
    
    expect(result).toHaveLength(1);
    expect(result[0].barcode).toEqual('1234567890');
  });

  it('should perform partial search', async () => {
    await createProduct(testInput);
    const result = await searchProducts('Test');
    
    expect(result).toHaveLength(1);
    expect(result[0].nama_brg).toEqual('Test Product');
  });
});

describe('updateProductStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should increase product stock', async () => {
    const created = await createProduct(testInput);
    expect(created.current_stock).toEqual(0);
    
    const result = await updateProductStock(created.id, 50.5);
    expect(result.current_stock).toEqual(50.5);
    expect(typeof result.current_stock).toBe('number');
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should decrease product stock', async () => {
    const created = await createProduct(testInput);
    await updateProductStock(created.id, 100);
    
    const result = await updateProductStock(created.id, -25.5);
    expect(result.current_stock).toEqual(74.5);
    expect(typeof result.current_stock).toBe('number');
  });

  it('should reject non-existent product', async () => {
    await expect(updateProductStock(999, 10))
      .rejects.toThrow(/product not found/i);
  });

  it('should save updated stock to database', async () => {
    const created = await createProduct(testInput);
    await updateProductStock(created.id, 75.25);
    
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, created.id))
      .execute();

    expect(parseFloat(products[0].current_stock)).toEqual(75.25);
  });
});
