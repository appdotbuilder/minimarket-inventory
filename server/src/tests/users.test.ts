
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UserRole } from '../schema';
import { createUser, getUsers, getUserById, updateUserRole, deactivateUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'cashier'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.password_hash).toEqual('hashed_password123');
    expect(result.role).toEqual('cashier');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].password_hash).toEqual('hashed_password123');
    expect(users[0].role).toEqual('cashier');
    expect(users[0].is_active).toBe(true);
  });

  it('should reject duplicate username', async () => {
    await createUser(testInput);

    const duplicateInput = {
      ...testInput,
      email: 'different@example.com'
    };

    expect(async () => {
      await createUser(duplicateInput);
    }).toThrow();
  });

  it('should reject duplicate email', async () => {
    await createUser(testInput);

    const duplicateInput = {
      ...testInput,
      username: 'differentuser'
    };

    expect(async () => {
      await createUser(duplicateInput);
    }).toThrow();
  });
});

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const users = await getUsers();
    expect(users).toEqual([]);
  });

  it('should return all users', async () => {
    await createUser(testInput);
    await createUser({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password456',
      role: 'admin'
    });

    const users = await getUsers();

    expect(users).toHaveLength(2);
    expect(users[0].username).toEqual('testuser');
    expect(users[1].username).toEqual('testuser2');
  });

  it('should include password_hash in response', async () => {
    await createUser(testInput);

    const users = await getUsers();

    expect(users).toHaveLength(1);
    expect(users[0].password_hash).toEqual('hashed_password123');
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent user', async () => {
    const user = await getUserById(999);
    expect(user).toBe(null);
  });

  it('should return user by ID', async () => {
    const createdUser = await createUser(testInput);

    const user = await getUserById(createdUser.id);

    expect(user).not.toBe(null);
    expect(user!.id).toEqual(createdUser.id);
    expect(user!.username).toEqual('testuser');
    expect(user!.email).toEqual('test@example.com');
    expect(user!.role).toEqual('cashier');
  });
});

describe('updateUserRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user role', async () => {
    const createdUser = await createUser(testInput);
    const newRole: UserRole = 'admin';

    const updatedUser = await updateUserRole(createdUser.id, newRole);

    expect(updatedUser.id).toEqual(createdUser.id);
    expect(updatedUser.role).toEqual('admin');
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
    expect(updatedUser.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should persist role update in database', async () => {
    const createdUser = await createUser(testInput);

    await updateUserRole(createdUser.id, 'manager');

    const user = await getUserById(createdUser.id);
    expect(user!.role).toEqual('manager');
  });

  it('should throw error for non-existent user', async () => {
    expect(async () => {
      await updateUserRole(999, 'admin');
    }).toThrow(/User with ID 999 not found/);
  });
});

describe('deactivateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should deactivate user', async () => {
    const createdUser = await createUser(testInput);

    const deactivatedUser = await deactivateUser(createdUser.id);

    expect(deactivatedUser.id).toEqual(createdUser.id);
    expect(deactivatedUser.is_active).toBe(false);
    expect(deactivatedUser.updated_at).toBeInstanceOf(Date);
    expect(deactivatedUser.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should persist deactivation in database', async () => {
    const createdUser = await createUser(testInput);

    await deactivateUser(createdUser.id);

    const user = await getUserById(createdUser.id);
    expect(user!.is_active).toBe(false);
  });

  it('should throw error for non-existent user', async () => {
    expect(async () => {
      await deactivateUser(999);
    }).toThrow(/User with ID 999 not found/);
  });

  it('should deactivate already inactive user', async () => {
    const createdUser = await createUser(testInput);
    await deactivateUser(createdUser.id);

    const deactivatedAgain = await deactivateUser(createdUser.id);

    expect(deactivatedAgain.is_active).toBe(false);
  });
});
