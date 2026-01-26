import bcrypt from 'bcryptjs';
import dns from 'dns/promises';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from './dbModel';

export type UserRole = 'user' | 'admin' | 'guest' | string;

export interface UserRow extends RowDataPacket {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone_number: string | null;
  role: UserRole;
  created_at: Date;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  role?: UserRole;
}

class User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  phoneNumber: string | null;
  role: UserRole;
  createdAt: Date;

  constructor(userData: UserRow) {
    this.id = userData.id;
    this.firstName = userData.first_name;
    this.lastName = userData.last_name;
    this.email = userData.email;
    this.passwordHash = userData.password_hash;
    this.address = userData.address;
    this.postalCode = userData.postal_code;
    this.city = userData.city;
    this.phoneNumber = userData.phone_number;
    this.role = userData.role || 'user';
    this.createdAt = userData.created_at;
  }

  static async findAll(): Promise<User[]> {
    const pool = getPool();
    const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users');
    return rows.map((row) => new User(row));
  }

  static async findById(id: number): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);
    return rows.length === 1 ? new User(rows[0]) : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);
    return rows.length === 1 ? new User(rows[0]) : null;
  }

  static async emailExists(email: string): Promise<boolean> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
    const countRow = rows[0] as RowDataPacket & { count: number };
    return countRow.count > 0;
  }

  static async validateEmailDomain(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1];
      if (!domain) return false;

      const mxRecords = await dns.resolveMx(domain);
      return !!(mxRecords && mxRecords.length > 0);
    } catch {
      return false;
    }
  }

  static async create(userData: CreateUserInput): Promise<User> {
    const pool = getPool();
    const { firstName, lastName, email, password, phoneNumber = null, address = null, postalCode = null, city = null, role = 'user' } = userData;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (first_name, last_name, email, password_hash, phone_number, address, postal_code, city, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, phoneNumber, address, postalCode, city, role]
    );

    return User.findById(result.insertId) as Promise<User>;
  }

  async save(): Promise<User> {
    if (!this.id) {
      throw new Error('Cannot save user without ID');
    }

    const pool = getPool();
    await pool.execute(
      `UPDATE users SET 
       first_name = ?, last_name = ?, email = ?, 
       address = ?, postal_code = ?, city = ?, phone_number = ?, role = ?
       WHERE id = ?`,
      [this.firstName, this.lastName, this.email,
      this.address, this.postalCode, this.city, this.phoneNumber, this.role, this.id]
    );

    return this;
  }

  static async delete(id: number): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, this.passwordHash);
  }

  async initPassword(password: string): Promise<User> {
    if (!password) {
      throw new Error('Password is required');
    }

    if (this.passwordHash !== null) {
      throw new Error(`CRITICAL ERROR: Attempted to initialize password for user ${this.id} who already has a password set.`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pool = getPool();

    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, this.id]
    );

    this.passwordHash = passwordHash;
    return this;
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  static async createAdmin(userData: CreateUserInput): Promise<User> {
    return User.create({ ...userData, role: 'admin' });
  }

  toJSON(): Record<string, unknown> {
    const { passwordHash, ...rest } = this;
    return rest;
  }
}

export default User;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = User;
