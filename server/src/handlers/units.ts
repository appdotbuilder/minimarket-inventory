
import { db } from '../db';
import { unitsTable } from '../db/schema';
import { type CreateUnitInput, type Unit } from '../schema';
import { eq } from 'drizzle-orm';

export async function createUnit(input: CreateUnitInput): Promise<Unit> {
  try {
    // Verify base_unit_id exists if provided
    if (input.base_unit_id) {
      const baseUnit = await db.select()
        .from(unitsTable)
        .where(eq(unitsTable.id, input.base_unit_id))
        .execute();
      
      if (baseUnit.length === 0) {
        throw new Error(`Base unit with ID ${input.base_unit_id} does not exist`);
      }
    }

    const result = await db.insert(unitsTable)
      .values({
        name: input.name,
        abbreviation: input.abbreviation,
        conversion_factor: input.conversion_factor.toString(),
        base_unit_id: input.base_unit_id || null
      })
      .returning()
      .execute();

    const unit = result[0];
    return {
      ...unit,
      conversion_factor: parseFloat(unit.conversion_factor)
    };
  } catch (error) {
    console.error('Unit creation failed:', error);
    throw error;
  }
}

export async function getUnits(): Promise<Unit[]> {
  try {
    const results = await db.select()
      .from(unitsTable)
      .execute();

    return results.map(unit => ({
      ...unit,
      conversion_factor: parseFloat(unit.conversion_factor)
    }));
  } catch (error) {
    console.error('Failed to fetch units:', error);
    throw error;
  }
}

export async function getUnitById(id: number): Promise<Unit | null> {
  try {
    const results = await db.select()
      .from(unitsTable)
      .where(eq(unitsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const unit = results[0];
    return {
      ...unit,
      conversion_factor: parseFloat(unit.conversion_factor)
    };
  } catch (error) {
    console.error('Failed to fetch unit by ID:', error);
    throw error;
  }
}

export async function updateUnit(id: number, input: Partial<CreateUnitInput>): Promise<Unit> {
  try {
    // Check if unit exists
    const existingUnit = await getUnitById(id);
    if (!existingUnit) {
      throw new Error(`Unit with ID ${id} does not exist`);
    }

    // Verify base_unit_id exists if provided
    if (input.base_unit_id) {
      const baseUnit = await db.select()
        .from(unitsTable)
        .where(eq(unitsTable.id, input.base_unit_id))
        .execute();
      
      if (baseUnit.length === 0) {
        throw new Error(`Base unit with ID ${input.base_unit_id} does not exist`);
      }
    }

    // Build update values with numeric conversion
    const updateValues: any = {};
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.abbreviation !== undefined) updateValues.abbreviation = input.abbreviation;
    if (input.conversion_factor !== undefined) updateValues.conversion_factor = input.conversion_factor.toString();
    if (input.base_unit_id !== undefined) updateValues.base_unit_id = input.base_unit_id;

    const result = await db.update(unitsTable)
      .set(updateValues)
      .where(eq(unitsTable.id, id))
      .returning()
      .execute();

    const unit = result[0];
    return {
      ...unit,
      conversion_factor: parseFloat(unit.conversion_factor)
    };
  } catch (error) {
    console.error('Unit update failed:', error);
    throw error;
  }
}

export async function deleteUnit(id: number): Promise<{ success: boolean }> {
  try {
    // Check if unit exists
    const existingUnit = await getUnitById(id);
    if (!existingUnit) {
      throw new Error(`Unit with ID ${id} does not exist`);
    }

    // Check if unit is being used as a base unit by other units
    const dependentUnits = await db.select()
      .from(unitsTable)
      .where(eq(unitsTable.base_unit_id, id))
      .execute();

    if (dependentUnits.length > 0) {
      throw new Error(`Cannot delete unit: it is being used as a base unit by ${dependentUnits.length} other unit(s)`);
    }

    await db.delete(unitsTable)
      .where(eq(unitsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Unit deletion failed:', error);
    throw error;
  }
}
