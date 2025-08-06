
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  try {
    const result = await db.insert(categoriesTable)
      .values({
        name: input.name,
        description: input.description || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const result = await db.select()
      .from(categoriesTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
}

export async function getCategoryById(id: number): Promise<Category | null> {
  try {
    const result = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch category by ID:', error);
    throw error;
  }
}

export async function updateCategory(id: number, input: Partial<CreateCategoryInput>): Promise<Category> {
  try {
    const result = await db.update(categoriesTable)
      .set({
        name: input.name,
        description: input.description !== undefined ? input.description : undefined
      })
      .where(eq(categoriesTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Category with ID ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<{ success: boolean }> {
  try {
    const result = await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
}
