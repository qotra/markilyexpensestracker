import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export interface User {
  id: number;
  balance: number;
}

export interface Expense {
  id: number;
  userId: number;
  amount: number;
  category: string;
  description: string;
  date: string;
}

class Database {
  private db: sqlite3.Database;
  private get: (sql: string, params?: any[]) => Promise<any>;
  private all: (sql: string, params?: any[]) => Promise<any[]>;
  private run: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private initialized = false;

  constructor() {
    this.db = new sqlite3.Database('expenses.db', (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('✅ Database connection established');
      }
    });

    // Promisify database methods
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
    this.run = promisify(this.db.run.bind(this.db));
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          balance REAL DEFAULT 0
        )
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          amount REAL,
          category TEXT,
          description TEXT,
          date TEXT,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);

      this.initialized = true;
      console.log('✅ Database tables initialized');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  async getUser(userId: number): Promise<User | null> {
    await this.initialize();
    return await this.get('SELECT * FROM users WHERE id = ?', [userId]) as User | null;
  }

  async createUser(userId: number): Promise<void> {
    await this.initialize();
    await this.run('INSERT OR IGNORE INTO users (id) VALUES (?)', [userId]);
  }

  async updateBalance(userId: number, newBalance: number): Promise<void> {
    await this.initialize();
    await this.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);
  }

  async addExpense(userId: number, amount: number, category: string, description: string): Promise<void> {
    await this.initialize();
    const date = new Date().toISOString();
    await this.run(
      'INSERT INTO expenses (userId, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
      [userId, amount, category, description, date]
    );
  }

  async getExpenses(userId: number, startDate?: string, endDate?: string): Promise<Expense[]> {
    await this.initialize();
    let query = 'SELECT * FROM expenses WHERE userId = ?';
    const params: any[] = [userId];

    if (startDate && endDate) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY date DESC';
    return await this.all(query, params) as Expense[];
  }

  async getExpensesByCategory(userId: number, startDate?: string, endDate?: string): Promise<{ category: string; total: number }[]> {
    await this.initialize();
    let query = `
      SELECT category, SUM(amount) as total 
      FROM expenses 
      WHERE userId = ?
    `;
    const params: any[] = [userId];

    if (startDate && endDate) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' GROUP BY category ORDER BY total DESC';
    return await this.all(query, params) as { category: string; total: number }[];
  }

  close() {
    this.db.close();
  }
}

export default new Database();
