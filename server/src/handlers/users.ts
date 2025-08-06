
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User, type UserRole } from '../schema';
import { eq } from 'drizzle-orm';
import { createPasswordHash } from './auth';

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password using proper crypto functions
    const password_hash = createPasswordHash(input.password);

    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        role: input.role,
        is_active: true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const users = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      password_hash: usersTable.password_hash,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    return users;
  } catch (error) {
    console.error('Fetching users failed:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Fetching user by ID failed:', error);
    throw error;
  }
}

export async function updateUserRole(id: number, role: UserRole): Promise<User> {
  try {
    const result = await db.update(usersTable)
      .set({
        role,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with ID ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Updating user role failed:', error);
    throw error;
  }
}

export async function deactivateUser(id: number): Promise<User> {
  try {
    const result = await db.update(usersTable)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with ID ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Deactivating user failed:', error);
    throw error;
  }
}
