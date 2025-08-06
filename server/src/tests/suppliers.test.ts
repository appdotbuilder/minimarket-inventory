
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  getSupplierByCode,
  updateSupplier,
  deactivateSupplier
} from '../handlers/suppliers';
import { eq } from 'drizzle-orm';

const testSupplierInput: CreateSupplierInput = {
  codesup: 'SUP001',
  nama: 'Test Supplier',
  alamat: '123 Test Street',
  telepon: '555-0123',
  email: 'supplier@test.com',
  contact_person: 'John Doe'
};

describe('Supplier Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createSupplier', () => {
    it('should create a supplier with all fields', async () => {
      const result = await createSupplier(testSupplierInput);

      expect(result.codesup).toEqual('SUP001');
      expect(result.nama).toEqual('Test Supplier');
      expect(result.alamat).toEqual('123 Test Street');
      expect(result.telepon).toEqual('555-0123');
      expect(result.email).toEqual('supplier@test.com');
      expect(result.contact_person).toEqual('John Doe');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a supplier with minimal fields', async () => {
      const minimalInput: CreateSupplierInput = {
        codesup: 'SUP002',
        nama: 'Minimal Supplier'
      };

      const result = await createSupplier(minimalInput);

      expect(result.codesup).toEqual('SUP002');
      expect(result.nama).toEqual('Minimal Supplier');
      expect(result.alamat).toBeNull();
      expect(result.telepon).toBeNull();
      expect(result.email).toBeNull();
      expect(result.contact_person).toBeNull();
      expect(result.is_active).toBe(true);
    });

    it('should save supplier to database', async () => {
      const result = await createSupplier(testSupplierInput);

      const suppliers = await db.select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, result.id))
        .execute();

      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].codesup).toEqual('SUP001');
      expect(suppliers[0].nama).toEqual('Test Supplier');
      expect(suppliers[0].is_active).toBe(true);
    });

    it('should fail with duplicate codesup', async () => {
      await createSupplier(testSupplierInput);

      await expect(createSupplier(testSupplierInput))
        .rejects.toThrow();
    });
  });

  describe('getSuppliers', () => {
    it('should return empty array when no suppliers exist', async () => {
      const result = await getSuppliers();
      expect(result).toEqual([]);
    });

    it('should return active suppliers only', async () => {
      // Create active supplier
      const activeSupplier = await createSupplier(testSupplierInput);

      // Create and deactivate another supplier
      const inactiveInput: CreateSupplierInput = {
        codesup: 'SUP002',
        nama: 'Inactive Supplier'
      };
      const inactiveSupplier = await createSupplier(inactiveInput);
      await deactivateSupplier(inactiveSupplier.id);

      const result = await getSuppliers();

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(activeSupplier.id);
      expect(result[0].codesup).toEqual('SUP001');
      expect(result[0].is_active).toBe(true);
    });

    it('should return multiple active suppliers', async () => {
      await createSupplier(testSupplierInput);
      await createSupplier({
        codesup: 'SUP002',
        nama: 'Second Supplier'
      });

      const result = await getSuppliers();

      expect(result).toHaveLength(2);
      expect(result.every(s => s.is_active)).toBe(true);
    });
  });

  describe('getSupplierById', () => {
    it('should return null for non-existent supplier', async () => {
      const result = await getSupplierById(999);
      expect(result).toBeNull();
    });

    it('should return supplier by ID', async () => {
      const created = await createSupplier(testSupplierInput);
      const result = await getSupplierById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.codesup).toEqual('SUP001');
      expect(result!.nama).toEqual('Test Supplier');
    });

    it('should return inactive supplier by ID', async () => {
      const created = await createSupplier(testSupplierInput);
      await deactivateSupplier(created.id);

      const result = await getSupplierById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.is_active).toBe(false);
    });
  });

  describe('getSupplierByCode', () => {
    it('should return null for non-existent codesup', async () => {
      const result = await getSupplierByCode('NONEXISTENT');
      expect(result).toBeNull();
    });

    it('should return supplier by codesup', async () => {
      const created = await createSupplier(testSupplierInput);
      const result = await getSupplierByCode('SUP001');

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.codesup).toEqual('SUP001');
      expect(result!.nama).toEqual('Test Supplier');
    });

    it('should return inactive supplier by codesup', async () => {
      const created = await createSupplier(testSupplierInput);
      await deactivateSupplier(created.id);

      const result = await getSupplierByCode('SUP001');

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.is_active).toBe(false);
    });
  });

  describe('updateSupplier', () => {
    it('should update supplier fields', async () => {
      const created = await createSupplier(testSupplierInput);

      const updateData = {
        nama: 'Updated Supplier Name',
        alamat: '456 Updated Street',
        email: 'updated@test.com'
      };

      const result = await updateSupplier(created.id, updateData);

      expect(result.id).toEqual(created.id);
      expect(result.nama).toEqual('Updated Supplier Name');
      expect(result.alamat).toEqual('456 Updated Street');
      expect(result.email).toEqual('updated@test.com');
      expect(result.telepon).toEqual('555-0123'); // unchanged
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update partial fields only', async () => {
      const created = await createSupplier(testSupplierInput);

      const result = await updateSupplier(created.id, { nama: 'New Name Only' });

      expect(result.nama).toEqual('New Name Only');
      expect(result.alamat).toEqual('123 Test Street'); // unchanged
      expect(result.telepon).toEqual('555-0123'); // unchanged
    });

    it('should fail for non-existent supplier', async () => {
      await expect(updateSupplier(999, { nama: 'New Name' }))
        .rejects.toThrow(/not found/i);
    });

    it('should save changes to database', async () => {
      const created = await createSupplier(testSupplierInput);
      await updateSupplier(created.id, { nama: 'Updated Name' });

      const fromDb = await db.select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, created.id))
        .execute();

      expect(fromDb[0].nama).toEqual('Updated Name');
    });
  });

  describe('deactivateSupplier', () => {
    it('should deactivate supplier', async () => {
      const created = await createSupplier(testSupplierInput);

      const result = await deactivateSupplier(created.id);

      expect(result.id).toEqual(created.id);
      expect(result.is_active).toBe(false);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should fail for non-existent supplier', async () => {
      await expect(deactivateSupplier(999))
        .rejects.toThrow(/not found/i);
    });

    it('should save deactivation to database', async () => {
      const created = await createSupplier(testSupplierInput);
      await deactivateSupplier(created.id);

      const fromDb = await db.select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, created.id))
        .execute();

      expect(fromDb[0].is_active).toBe(false);
    });

    it('should exclude deactivated supplier from getSuppliers', async () => {
      const created = await createSupplier(testSupplierInput);
      await deactivateSupplier(created.id);

      const activeSuppliers = await getSuppliers();

      expect(activeSuppliers).toHaveLength(0);
    });
  });
});
