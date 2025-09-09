import sqlite3 from 'sqlite3';

export interface User {
  id: number;
  balance: number;
  created_at: string;
}

export interface Expense {
  id: number;
  user_id: number;
  amount: number;
  category: string;
  description: string;
  created_at: string;
}

export type ExpenseCategory = 'personal' | 'food' | 'family' | 'transit' | 'bills' | 'entertainments';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['personal', 'food', 'family', 'transit', 'bills', 'entertainments'];

class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database('expenses.db');
    this.init();
  }

  private async init() {
    return new Promise<void>((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            balance REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
        });

        this.db.run(`
          CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async getUser(userId: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row as User || null);
      });
    });
  }

  async createUser(userId: number): Promise<User> {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT OR IGNORE INTO users (id) VALUES (?)', [userId], (err) => {
        if (err) {
          reject(err);
          return;
        }

        // After inserting, get the user
        this.getUser(userId).then((user) => {
          if (user) {
            resolve(user);
          } else {
            reject(new Error('Failed to create or retrieve user'));
          }
        }).catch(reject);
      });
    });
  }

  async updateBalance(userId: number, newBalance: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async addExpense(userId: number, amount: number, category: ExpenseCategory, description: string = ''): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO expenses (user_id, amount, category, description) VALUES (?, ?, ?, ?)',
        [userId, amount, category, description],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getExpenses(
    userId: number,
    startDate?: string,
    endDate?: string,
    category?: ExpenseCategory
  ): Promise<Expense[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM expenses WHERE user_id = ?';
      const params: any[] = [userId];

      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Expense[]);
      });
    });
  }

  async getTotalExpensesByCategory(
    userId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{ category: string; total: number }[]> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT category, SUM(amount) as total 
        FROM expenses 
        WHERE user_id = ?
      `;
      const params: any[] = [userId];

      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY category ORDER BY total DESC';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as { category: string; total: number }[]);
      });
    });
  }
}

export const db = new Database();
