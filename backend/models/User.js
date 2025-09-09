const { getPool } = require('./dbModel');
const bcrypt = require('bcryptjs');

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
        const pool = getPool();
        const [rows] = await pool.execute('SELECT * FROM users');
        return rows.map(row => new User(row));
    }

    static async findById(id) {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows.length == 1 ? new User(rows[0]) : null;
    }

    static async findByEmail(email) {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows.length == 1 ? new User(rows[0]) : null;
    }

    static async emailExists(email) {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
        return rows[0].count > 0;
    }

    static async create(userData) {
        const pool = getPool();
        const { firstName, lastName, email, password, role = 'user' } = userData;
        const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

        const [result] = await pool.execute(
            'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [firstName, lastName, email, passwordHash, role]
        );
        
        return User.findById(result.insertId);
    }

    async save() {
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

    static async delete(id) {
        const pool = getPool();
        const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    async validatePassword(password) {
        if (!this.passwordHash) {
            return false; // No password hash means no valid password
        }
        return bcrypt.compareSync(password, this.passwordHash);
    }

    async initPassword(password) {
        if (!password) {
            throw new Error('Password is required');
        }
        
        // Check if user already has a password in the database
        if (this.passwordHash !== null) {
            throw new Error(`CRITICAL ERROR: Attempted to initialize password for user ${this.id} who already has a password set. This should never happen!`);
        }
        
        const passwordHash = bcrypt.hashSync(password, 10);
        const pool = getPool();
        
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, this.id]
        );
        
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
        const { passwordHash, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }
}

module.exports = User;
