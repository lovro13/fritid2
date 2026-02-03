"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const promises_1 = __importDefault(require("dns/promises"));
const dbModel_1 = require("./dbModel");
class User {
    constructor(userData) {
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
    static async findAll() {
        const pool = (0, dbModel_1.getPool)();
        const [rows] = await pool.execute('SELECT * FROM users');
        return rows.map((row) => new User(row));
    }
    static async findById(id) {
        const pool = (0, dbModel_1.getPool)();
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows.length === 1 ? new User(rows[0]) : null;
    }
    static async findByEmail(email) {
        const pool = (0, dbModel_1.getPool)();
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows.length === 1 ? new User(rows[0]) : null;
    }
    static async emailExists(email) {
        const pool = (0, dbModel_1.getPool)();
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
        const countRow = rows[0];
        return countRow.count > 0;
    }
    static async validateEmailDomain(email) {
        try {
            const domain = email.split('@')[1];
            if (!domain)
                return false;
            const mxRecords = await promises_1.default.resolveMx(domain);
            return !!(mxRecords && mxRecords.length > 0);
        }
        catch {
            return false;
        }
    }
    static async create(userData) {
        const pool = (0, dbModel_1.getPool)();
        const { firstName, lastName, email, password, phoneNumber = null, address = null, postalCode = null, city = null, role = 'user' } = userData;
        const passwordHash = password ? await bcryptjs_1.default.hash(password, 10) : null;
        const [result] = await pool.execute('INSERT INTO users (first_name, last_name, email, password_hash, phone_number, address, postal_code, city, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [firstName, lastName, email, passwordHash, phoneNumber, address, postalCode, city, role]);
        return User.findById(result.insertId);
    }
    async save() {
        if (!this.id) {
            throw new Error('Cannot save user without ID');
        }
        const pool = (0, dbModel_1.getPool)();
        await pool.execute(`UPDATE users SET 
       first_name = ?, last_name = ?, email = ?, 
       address = ?, postal_code = ?, city = ?, phone_number = ?, role = ?
       WHERE id = ?`, [this.firstName, this.lastName, this.email,
            this.address, this.postalCode, this.city, this.phoneNumber, this.role, this.id]);
        return this;
    }
    static async delete(id) {
        const pool = (0, dbModel_1.getPool)();
        const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    async validatePassword(password) {
        if (!this.passwordHash) {
            return false;
        }
        return bcryptjs_1.default.compare(password, this.passwordHash);
    }
    async initPassword(password) {
        if (!password) {
            throw new Error('Password is required');
        }
        if (this.passwordHash !== null) {
            throw new Error(`CRITICAL ERROR: Attempted to initialize password for user ${this.id} who already has a password set.`);
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const pool = (0, dbModel_1.getPool)();
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, this.id]);
        this.passwordHash = passwordHash;
        return this;
    }
    isAdmin() {
        return this.role === 'admin';
    }
    static async createAdmin(userData) {
        return User.create({ ...userData, role: 'admin' });
    }
    toJSON() {
        const { passwordHash, ...rest } = this;
        return rest;
    }
}
exports.default = User;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = User;
