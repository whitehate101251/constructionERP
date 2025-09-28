import { Pool } from 'pg';
import { User, AttendanceRecord, Worker, Site } from '@shared/api';

// PostgreSQL connection pool
let pool: Pool;

export async function connectToDatabase() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please add your Supabase PostgreSQL connection string.');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    let retries = 3;
    while (retries > 0) {
      try {
        const client = await pool.connect();
        client.release();
        console.log('✅ Connected to PostgreSQL (Supabase)');
        break;
      } catch (error) {
        retries--;
        console.log(`⚠️ Database connection attempt failed, ${retries} retries left`);
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return pool;
}

export async function closeDatabaseConnection() {
  if (pool) {
    await pool.end();
    console.log('🔌 Disconnected from PostgreSQL');
  }
}

// Database class with PostgreSQL operations
export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  static async getInstance(): Promise<Database> {
    if (!Database.instance) {
      const pool = await connectToDatabase();
      Database.instance = new Database(pool);
    }
    return Database.instance;
  }

  // Users operations
  get users() {
    return {
      async find(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM users';
          const values: any[] = [];

          if (filter.username) {
            query += ' WHERE username = $1';
            values.push(filter.username);
          }

          const result = await client.query(query, values);
          return result.rows;
        } finally {
          client.release();
        }
      },

      async findOne(filter: any) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM users';
          const values: any[] = [];

          if (filter.id) {
            query += ' WHERE id = $1';
            values.push(filter.id);
          } else if (filter.username) {
            query += ' WHERE username = $1';
            values.push(filter.username);
          }

          query += ' LIMIT 1';
          const result = await client.query(query, values);
          return result.rows[0] || null;
        } finally {
          client.release();
        }
      },

      async insertOne(user: Partial<User>) {
        const client = await pool.connect();
        try {
          const query = `
            INSERT INTO users (id, username, role, name, site_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          const values = [user.id, user.username, user.role, user.name, user.siteId];
          const result = await client.query(query, values);
          return { insertedId: result.rows[0].id };
        } finally {
          client.release();
        }
      },

      async countDocuments() {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) FROM users');
          return parseInt(result.rows[0].count);
        } finally {
          client.release();
        }
      },

      async updateOne(filter: any, update: any) {
        const client = await pool.connect();
        try {
          const setFields = Object.keys(update.$set);
          const setClause = setFields.map((key, index) => `${key} = $${index + 2}`).join(', ');
          const query = `UPDATE users SET ${setClause} WHERE id = $1`;
          const values = [filter.id, ...Object.values(update.$set)];
          await client.query(query, values);
        } finally {
          client.release();
        }
      }
    };
  }

  // Workers operations
  get workers() {
    return {
      async find(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM workers WHERE is_active = true';
          const values: any[] = [];

          if (filter.siteId) {
            query += ' AND site_id = $1';
            values.push(filter.siteId);
          }

          query += ' ORDER BY name';
          const result = await client.query(query, values);
          const rows = result.rows.map(row => ({
            ...row,
            siteId: row.site_id,
            dailyWage: row.daily_wage,
            fatherName: row.father_name,
            isActive: row.is_active,
            createdAt: row.created_at
          }));

          return {
            toArray: async () => rows
          };
        } finally {
          client.release();
        }
      },

      async countDocuments() {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) FROM workers WHERE is_active = true');
          return parseInt(result.rows[0].count);
        } finally {
          client.release();
        }
      }
    };
  }

  // Sites operations
  get sites() {
    return {
      async find(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM sites WHERE is_active = true';
          const result = await client.query(query);
          const rows = result.rows.map(row => ({
            ...row,
            inchargeId: row.incharge_id,
            inchargeName: row.incharge_name,
            isActive: row.is_active,
            createdAt: row.created_at
          }));

          return {
            toArray: async () => rows
          };
        } finally {
          client.release();
        }
      },

      async countDocuments() {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) FROM sites WHERE is_active = true');
          return parseInt(result.rows[0].count);
        } finally {
          client.release();
        }
      },

      async findOne(filter: any) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM sites WHERE is_active = true';
          const values: any[] = [];

          if (filter.id) {
            query += ' AND id = $1';
            values.push(filter.id);
          }

          query += ' LIMIT 1';
          const result = await client.query(query, values);
          const row = result.rows[0];
          return row ? {
            ...row,
            inchargeId: row.incharge_id,
            inchargeName: row.incharge_name,
            isActive: row.is_active,
            createdAt: row.created_at
          } : null;
        } finally {
          client.release();
        }
      },

      async insertOne(site: any) {
        const client = await pool.connect();
        try {
          const query = `
            INSERT INTO sites (id, name, location, incharge_id, incharge_name, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const values = [site.id, site.name, site.location, site.inchargeId, site.inchargeName, site.isActive];
          const result = await client.query(query, values);
          return { insertedId: result.rows[0].id };
        } finally {
          client.release();
        }
      }
    };
  }

  // Attendance records operations
  get attendanceRecords() {
    return {
      async find(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = `
            SELECT ar.*, w.name as worker_name, w.designation, w.daily_wage 
            FROM attendance_records ar 
            LEFT JOIN workers w ON ar.worker_id = w.id
          `;
          const values: any[] = [];
          const conditions: string[] = [];

          if (filter.siteId) {
            conditions.push(`ar.site_id = $${values.length + 1}`);
            values.push(filter.siteId);
          }

          if (filter.date) {
            conditions.push(`ar.date = $${values.length + 1}`);
            values.push(filter.date);
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
          }

          query += ' ORDER BY ar.date DESC, w.name LIMIT 50';
          const result = await client.query(query, values);

          const rows = result.rows.map(row => ({
            ...row,
            workerId: row.worker_id,
            siteId: row.site_id,
            markedBy: row.marked_by,
            markedAt: row.marked_at,
            workerName: row.worker_name,
            dailyWage: row.daily_wage
          }));

          return {
            sort: () => ({
              limit: (num: number) => ({
                toArray: async () => rows.slice(0, num)
              })
            }),
            toArray: async () => rows
          };
        } finally {
          client.release();
        }
      },

      async countDocuments() {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) FROM attendance_records');
          return parseInt(result.rows[0].count);
        } finally {
          client.release();
        }
      },

      async insertOne(record: any) {
        const client = await pool.connect();
        try {
          const query = `
            INSERT INTO attendance_records (worker_id, site_id, date, status, marked_by, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (worker_id, date) 
            DO UPDATE SET status = $4, marked_by = $5, notes = $6, marked_at = NOW()
            RETURNING *
          `;
          const values = [record.workerId, record.siteId, record.date, record.status, record.markedBy, record.notes];
          const result = await client.query(query, values);
          return { insertedId: result.rows[0].id };
        } finally {
          client.release();
        }
      }
    };
  }

  async initializeDemoData() {
    console.log('✅ Production database ready - PostgreSQL fixed - no demo data needed');
  }
}

export const getDatabase = Database.getInstance;
export { connectToDatabase as initializeDatabase };