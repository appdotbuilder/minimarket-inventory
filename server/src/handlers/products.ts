
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';
import { eq, like, or, lte, sql } from 'drizzle-orm';

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    // Validate category exists if provided
    if (input.kategori_id) {
      const category = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.kategori_id))
        .execute();

      if (category.length === 0) {
        throw new Error('Category not found');
      }
    }

    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        kode_brg: input.kode_brg,
        nama_brg: input.nama_brg,
        kategori_id: input.kategori_id || null,
        satuan_default: input.satuan_default,
        isi_per_satuan: input.isi_per_satuan.toString(),
        harga_beli: input.harga_beli.toString(),
        harga_jual: input.harga_jual.toString(),
        stok_min: input.stok_min.toString(),
        stok_max: input.stok_max.toString(),
        barcode: input.barcode || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const product = result[0];
    return {
      ...product,
      isi_per_satuan: parseFloat(product.isi_per_satuan),
      harga_beli: parseFloat(product.harga_beli),
      harga_jual: parseFloat(product.harga_jual),
      stok_min: parseFloat(product.stok_min),
      stok_max: parseFloat(product.stok_max),
      current_stock: parseFloat(product.current_stock)
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.is_active, true))
      .execute();

    return results.map(product => ({
      ...product,
      isi_per_satuan: parseFloat(product.isi_per_satuan),
      harga_beli: parseFloat(product.harga_beli),
      harga_jual: parseFloat(product.harga_jual),
      stok_min: parseFloat(product.stok_min),
      stok_max: parseFloat(product.stok_max),
      current_stock: parseFloat(product.current_stock)
    }));
  } catch (error) {
    console.error('Get products failed:', error);
    throw error;
  }
}

export async function getProductById(id: number): Promise<Product | null> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const product = results[0];
    return {
      ...product,
      isi_per_satuan: parseFloat(product.isi_per_satuan),
      harga_beli: parseFloat(product.harga_beli),
      harga_jual: parseFloat(product.harga_jual),
      stok_min: parseFloat(product.stok_min),
      stok_max: parseFloat(product.stok_max),
      current_stock: parseFloat(product.current_stock)
    };
  } catch (error) {
    console.error('Get product by ID failed:', error);
    throw error;
  }
}

export async function getProductByKode(kode_brg: string): Promise<Product | null> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.kode_brg, kode_brg))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const product = results[0];
    return {
      ...product,
      isi_per_satuan: parseFloat(product.isi_per_satuan),
      harga_beli: parseFloat(product.harga_beli),
      harga_jual: parseFloat(product.harga_jual),
      stok_min: parseFloat(product.stok_min),
      stok_max: parseFloat(product.stok_max),
      current_stock: parseFloat(product.current_stock)
    };
  } catch (error) {
    console.error('Get product by kode failed:', error);
    throw error;
  }
}

export async function updateProduct(id: number, input: Partial<CreateProductInput>): Promise<Product> {
  try {
    // Validate category exists if provided
    if (input.kategori_id !== undefined && input.kategori_id !== null) {
      const category = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.kategori_id))
        .execute();

      if (category.length === 0) {
        throw new Error('Category not found');
      }
    }

    // Build update values, converting numbers to strings for numeric columns
    const updateValues: any = {};
    if (input.kode_brg !== undefined) updateValues.kode_brg = input.kode_brg;
    if (input.nama_brg !== undefined) updateValues.nama_brg = input.nama_brg;
    if (input.kategori_id !== undefined) updateValues.kategori_id = input.kategori_id;
    if (input.satuan_default !== undefined) updateValues.satuan_default = input.satuan_default;
    if (input.isi_per_satuan !== undefined) updateValues.isi_per_satuan = input.isi_per_satuan.toString();
    if (input.harga_beli !== undefined) updateValues.harga_beli = input.harga_beli.toString();
    if (input.harga_jual !== undefined) updateValues.harga_jual = input.harga_jual.toString();
    if (input.stok_min !== undefined) updateValues.stok_min = input.stok_min.toString();
    if (input.stok_max !== undefined) updateValues.stok_max = input.stok_max.toString();
    if (input.barcode !== undefined) updateValues.barcode = input.barcode;

    // Always update timestamp
    updateValues.updated_at = new Date();

    const result = await db.update(productsTable)
      .set(updateValues)
      .where(eq(productsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Product not found');
    }

    // Convert numeric fields back to numbers
    const product = result[0];
    return {
      ...product,
      isi_per_satuan: parseFloat(product.isi_per_satuan),
      harga_beli: parseFloat(product.harga_beli),
      harga_jual: parseFloat(product.harga_jual),
      stok_min: parseFloat(product.stok_min),
      stok_max: parseFloat(product.stok_max),
      current_stock: parseFloat(product.current_stock)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
}

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(
        lte(
          sql`CAST(${productsTable.current_stock} AS NUMERIC)`,
          sql`CAST(${productsTable.stok_min} AS NUMERIC)`
        )
      )
      .execute();

    return results.map(product => ({
      ...product,
      isi_per_satuan: parseFloat(product.isi_per_satuan),
      harga_beli: parseFloat(product.harga_beli),
      harga_jual: parseFloat(product.harga_jual),
      stok_min: parseFloat(product.stok_min),
      stok_max: parseFloat(product.stok_max),
      current_stock: parseFloat(product.current_stock)
    }));
  } catch (error) {
    console.error('Get low stock products failed:', error);
    throw error;
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const searchPattern = `%${query}%`;
    const results = await db.select()
      .from(productsTable)
      .where(
        or(
          like(productsTable.nama_brg, searchPattern),
          like(productsTable.kode_brg, searchPattern),
          like(productsTable.barcode, searchPattern)
        )
      )
      .execute();

    return results.map(product => ({
      ...product,
      isi_per_satuan: parseFloat(product.isi_per_satuan),
      harga_beli: parseFloat(product.harga_beli),
      harga_jual: parseFloat(product.harga_jual),
      stok_min: parseFloat(product.stok_min),
      stok_max: parseFloat(product.stok_max),
      current_stock: parseFloat(product.current_stock)
    }));
  } catch (error) {
    console.error('Search products failed:', error);
    throw error;
  }
}

export async function updateProductStock(id: number, quantity: number): Promise<Product> {
  try {
    const result = await db.update(productsTable)
      .set({
        current_stock: sql`CAST(${productsTable.current_stock} AS NUMERIC) + ${quantity}`,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Product not found');
    }

    // Convert numeric fields back to numbers
    const product = result[0];
    return {
      ...product,
      isi_per_satuan: parseFloat(product.isi_per_satuan),
      harga_beli: parseFloat(product.harga_beli),
      harga_jual: parseFloat(product.harga_jual),
      stok_min: parseFloat(product.stok_min),
      stok_max: parseFloat(product.stok_max),
      current_stock: parseFloat(product.current_stock)
    };
  } catch (error) {
    console.error('Update product stock failed:', error);
    throw error;
  }
}
