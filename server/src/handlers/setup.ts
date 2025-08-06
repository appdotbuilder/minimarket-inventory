import { db } from '../db';
import * as schema from "../db/schema";
import { createUser } from './users';
import { userRoleEnum } from '../schema';

export const seedDemoUsers = async (): Promise<void> => {
  try {
    // Check if users already exist
    const existingUsers = await db.select().from(schema.usersTable).execute();
    
    if (existingUsers.length === 0) {
      console.log('Seeding demo users...');
      const demoUsers = [
        { username: 'admin', email: 'admin@example.com', password: 'admin123', role: 'admin' as const },
        { username: 'manager', email: 'manager@example.com', password: 'manager123', role: 'manager' as const },
        { username: 'warehouse', email: 'warehouse@example.com', password: 'warehouse123', role: 'warehouse' as const },
        { username: 'cashier', email: 'cashier123@example.com', password: 'cashier123', role: 'cashier' as const }
      ];

      for (const user of demoUsers) {
        try {
          await createUser(user);
        } catch (e) {
          console.error(`Failed to create demo user ${user.username}:`, e);
        }
      }
      console.log('Demo users seeded.');
    }
  } catch (error) {
    console.error('Failed to seed demo users:', error);
    throw error;
  }
};