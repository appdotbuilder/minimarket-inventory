
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { 
  createCategory, 
  getCategories, 
  getCategoryById, 
  updateCategory, 
  deleteCategory 
} from '../handlers/categories';
import { eq } from 'drizzle-orm';

const testInput: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing'
};

const testInputWithoutDescription: CreateCategoryInput = {
  name: 'No Description Category',
  description: null
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with description', async () => {
    const result = await createCategory(testInput);

    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('A category for testing');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category without description', async () => {
    const result = await createCategory(testInputWithoutDescription);

    expect(result.name).toEqual('No Description Category');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Test Category');
    expect(categories[0].description).toEqual('A category for testing');
  });
});

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    expect(result).toHaveLength(0);
  });

  it('should return all categories', async () => {
    await createCategory(testInput);
    await createCategory(testInputWithoutDescription);

    const result = await getCategories();

    expect(result).toHaveLength(2);
    expect(result.some(c => c.name === 'Test Category')).toBe(true);
    expect(result.some(c => c.name === 'No Description Category')).toBe(true);
  });
});

describe('getCategoryById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent category', async () => {
    const result = await getCategoryById(999);
    expect(result).toBeNull();
  });

  it('should return category by ID', async () => {
    const created = await createCategory(testInput);
    const result = await getCategoryById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.name).toEqual('Test Category');
    expect(result!.description).toEqual('A category for testing');
  });
});

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    const created = await createCategory(testInput);
    
    const result = await updateCategory(created.id, {
      name: 'Updated Category Name'
    });

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.description).toEqual('A category for testing');
  });

  it('should update category description', async () => {
    const created = await createCategory(testInput);
    
    const result = await updateCategory(created.id, {
      description: 'Updated description'
    });

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('Updated description');
  });

  it('should update both name and description', async () => {
    const created = await createCategory(testInput);
    
    const result = await updateCategory(created.id, {
      name: 'New Name',
      description: 'New description'
    });

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('New Name');
    expect(result.description).toEqual('New description');
  });

  it('should throw error for non-existent category', async () => {
    await expect(updateCategory(999, { name: 'Test' }))
      .rejects.toThrow(/Category with ID 999 not found/);
  });
});

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return false for non-existent category', async () => {
    const result = await deleteCategory(999);
    expect(result.success).toBe(false);
  });

  it('should delete existing category', async () => {
    const created = await createCategory(testInput);
    
    const result = await deleteCategory(created.id);
    expect(result.success).toBe(true);

    // Verify category is deleted
    const check = await getCategoryById(created.id);
    expect(check).toBeNull();
  });

  it('should remove category from database', async () => {
    const created = await createCategory(testInput);
    
    await deleteCategory(created.id);

    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, created.id))
      .execute();

    expect(categories).toHaveLength(0);
  });
});
