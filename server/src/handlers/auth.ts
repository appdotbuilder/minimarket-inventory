
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput, type User } from '../schema';

// Simple password hashing using crypto (built-in Node.js module)
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'default-secret-key';
const JWT_EXPIRES_IN = '24h';

// Simple password hashing functions
const hashPassword = (password: string, salt: string): string => {
  return createHash('sha256').update(password + salt).digest('hex');
};

const generateSalt = (): string => {
  return randomBytes(16).toString('hex');
};

const verifyPassword = (password: string, hashedPassword: string): boolean => {
  // Extract salt from stored hash (format: salt:hash)
  const [salt, hash] = hashedPassword.split(':');
  if (!salt || !hash) return false;
  
  const candidateHash = hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidateHash, 'hex'));
};

// Simple JWT implementation
const createJWT = (payload: any): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (24 * 60 * 60); // 24 hours
  
  const jwtPayload = { ...payload, iat: now, exp };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  
  const signature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyJWT = (token: string): any => {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  
  const [encodedHeader, encodedPayload, signature] = parts;
  
  // Verify signature
  const expectedSignature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`)
    .digest('base64url');
  
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid signature');
  }
  
  // Decode payload
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
  
  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  
  return payload;
};

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    const user = users[0];
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isPasswordValid = verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Generate JWT token
    const token = createJWT({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Return user data and token
    const userData: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return { user: userData, token };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function logout(token: string): Promise<{ success: boolean }> {
  try {
    // Verify token is valid before "logging out"
    verifyJWT(token);
    
    // In a real implementation, you would add token to blacklist
    // For now, we just verify the token is valid
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    throw new Error('Invalid token');
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    // Verify and decode JWT token
    const decoded = verifyJWT(token);
    
    if (!decoded.userId) {
      return null;
    }

    // Fetch current user data from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    const user = users[0];
    if (!user || !user.is_active) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Helper function to hash password for user creation
export const createPasswordHash = (password: string): string => {
  const salt = generateSalt();
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
};
