
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput, type Supplier } from '../schema';
import { eq } from 'drizzle-orm';

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  try {
    const result = await db.insert(suppliersTable)
      .values({
        codesup: input.codesup,
        nama: input.nama,
        alamat: input.alamat || null,
        telepon: input.telepon || null,
        email: input.email || null,
        contact_person: input.contact_person || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supplier creation failed:', error);
    throw error;
  }
}

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const results = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Get suppliers failed:', error);
    throw error;
  }
}

export async function getSupplierById(id: number): Promise<Supplier | null> {
  try {
    const results = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get supplier by ID failed:', error);
    throw error;
  }
}

export async function getSupplierByCode(codesup: string): Promise<Supplier | null> {
  try {
    const results = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.codesup, codesup))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get supplier by code failed:', error);
    throw error;
  }
}

export async function updateSupplier(id: number, input: Partial<CreateSupplierInput>): Promise<Supplier> {
  try {
    const result = await db.update(suppliersTable)
      .set({
        ...input,
        updated_at: new Date()
      })
      .where(eq(suppliersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Supplier not found');
    }

    return result[0];
  } catch (error) {
    console.error('Supplier update failed:', error);
    throw error;
  }
}

export async function deactivateSupplier(id: number): Promise<Supplier> {
  try {
    const result = await db.update(suppliersTable)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(suppliersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Supplier not found');
    }

    return result[0];
  } catch (error) {
    console.error('Supplier deactivation failed:', error);
    throw error;
  }
}
