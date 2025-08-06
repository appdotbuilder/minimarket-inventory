
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type CreateUnitInput } from '../schema';
import { createUnit, getUnits, getUnitById, updateUnit, deleteUnit } from '../handlers/units';

const baseUnitInput: CreateUnitInput = {
  name: 'Kilogram',
  abbreviation: 'kg',
  conversion_factor: 1,
  base_unit_id: null
};

const derivedUnitInput: CreateUnitInput = {
  name: 'Gram',
  abbreviation: 'g',
  conversion_factor: 0.001,
  base_unit_id: 1
};

describe('Units handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUnit', () => {
    it('should create a base unit', async () => {
      const result = await createUnit(baseUnitInput);

      expect(result.name).toEqual('Kilogram');
      expect(result.abbreviation).toEqual('kg');
      expect(result.conversion_factor).toEqual(1);
      expect(result.base_unit_id).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(typeof result.conversion_factor).toBe('number');
    });

    it('should create a derived unit with base unit reference', async () => {
      // Create base unit first
      const baseUnit = await createUnit(baseUnitInput);

      // Create derived unit
      const derivedInput = {
        ...derivedUnitInput,
        base_unit_id: baseUnit.id
      };
      const result = await createUnit(derivedInput);

      expect(result.name).toEqual('Gram');
      expect(result.abbreviation).toEqual('g');
      expect(result.conversion_factor).toEqual(0.001);
      expect(result.base_unit_id).toEqual(baseUnit.id);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent base unit', async () => {
      const invalidInput = {
        ...derivedUnitInput,
        base_unit_id: 999
      };

      await expect(createUnit(invalidInput)).rejects.toThrow(/Base unit with ID 999 does not exist/i);
    });
  });

  describe('getUnits', () => {
    it('should return empty array when no units exist', async () => {
      const result = await getUnits();
      expect(result).toEqual([]);
    });

    it('should return all units with numeric conversion factors', async () => {
      // Create multiple units
      const baseUnit = await createUnit(baseUnitInput);
      const derivedInput = {
        ...derivedUnitInput,
        base_unit_id: baseUnit.id
      };
      await createUnit(derivedInput);

      const result = await getUnits();
      expect(result).toHaveLength(2);

      result.forEach(unit => {
        expect(typeof unit.conversion_factor).toBe('number');
        expect(unit.id).toBeDefined();
        expect(unit.name).toBeDefined();
        expect(unit.abbreviation).toBeDefined();
        expect(unit.created_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('getUnitById', () => {
    it('should return null for non-existent unit', async () => {
      const result = await getUnitById(999);
      expect(result).toBeNull();
    });

    it('should return unit with numeric conversion factor', async () => {
      const created = await createUnit(baseUnitInput);
      const result = await getUnitById(created.id);

      expect(result).not.toBeNull();
      expect(result?.name).toEqual('Kilogram');
      expect(result?.abbreviation).toEqual('kg');
      expect(result?.conversion_factor).toEqual(1);
      expect(result?.base_unit_id).toBeNull();
      expect(typeof result?.conversion_factor).toBe('number');
    });
  });

  describe('updateUnit', () => {
    it('should throw error for non-existent unit', async () => {
      await expect(updateUnit(999, { name: 'Updated' })).rejects.toThrow(/Unit with ID 999 does not exist/i);
    });

    it('should update unit fields', async () => {
      const created = await createUnit(baseUnitInput);
      
      const result = await updateUnit(created.id, {
        name: 'Updated Kilogram',
        abbreviation: 'ukg',
        conversion_factor: 1.5
      });

      expect(result.name).toEqual('Updated Kilogram');
      expect(result.abbreviation).toEqual('ukg');
      expect(result.conversion_factor).toEqual(1.5);
      expect(result.base_unit_id).toBeNull();
      expect(typeof result.conversion_factor).toBe('number');
    });

    it('should update partial fields', async () => {
      const created = await createUnit(baseUnitInput);
      
      const result = await updateUnit(created.id, {
        name: 'Partial Update'
      });

      expect(result.name).toEqual('Partial Update');
      expect(result.abbreviation).toEqual('kg'); // Should remain unchanged
      expect(result.conversion_factor).toEqual(1); // Should remain unchanged
    });

    it('should throw error for non-existent base unit reference', async () => {
      const created = await createUnit(baseUnitInput);
      
      await expect(updateUnit(created.id, { base_unit_id: 999 })).rejects.toThrow(/Base unit with ID 999 does not exist/i);
    });

    it('should update base unit reference', async () => {
      const baseUnit = await createUnit(baseUnitInput);
      const anotherUnit = await createUnit({
        name: 'Pound',
        abbreviation: 'lb',
        conversion_factor: 0.453592,
        base_unit_id: null
      });
      
      const result = await updateUnit(anotherUnit.id, {
        base_unit_id: baseUnit.id
      });

      expect(result.base_unit_id).toEqual(baseUnit.id);
    });
  });

  describe('deleteUnit', () => {
    it('should throw error for non-existent unit', async () => {
      await expect(deleteUnit(999)).rejects.toThrow(/Unit with ID 999 does not exist/i);
    });

    it('should delete unit successfully', async () => {
      const created = await createUnit(baseUnitInput);
      
      const result = await deleteUnit(created.id);
      expect(result.success).toBe(true);

      // Verify unit is deleted
      const deleted = await getUnitById(created.id);
      expect(deleted).toBeNull();
    });

    it('should throw error when unit is used as base unit', async () => {
      // Create base unit
      const baseUnit = await createUnit(baseUnitInput);
      
      // Create derived unit that references base unit
      const derivedInput = {
        ...derivedUnitInput,
        base_unit_id: baseUnit.id
      };
      await createUnit(derivedInput);

      // Try to delete base unit
      await expect(deleteUnit(baseUnit.id)).rejects.toThrow(/Cannot delete unit.*being used as a base unit/i);
    });

    it('should allow deleting derived unit', async () => {
      // Create base unit
      const baseUnit = await createUnit(baseUnitInput);
      
      // Create derived unit that references base unit
      const derivedInput = {
        ...derivedUnitInput,
        base_unit_id: baseUnit.id
      };
      const derivedUnit = await createUnit(derivedInput);

      // Delete derived unit (should succeed)
      const result = await deleteUnit(derivedUnit.id);
      expect(result.success).toBe(true);

      // Verify derived unit is deleted
      const deleted = await getUnitById(derivedUnit.id);
      expect(deleted).toBeNull();

      // Verify base unit still exists
      const baseStillExists = await getUnitById(baseUnit.id);
      expect(baseStillExists).not.toBeNull();
    });
  });
});
