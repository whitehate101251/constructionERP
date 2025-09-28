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

// Database class with complete PostgreSQL operations
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

  // Users operations - Complete CRUD
  get users() {
    return {
      async find(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM users';
          const values: any[] = [];
          const conditions: string[] = [];

          if (filter.username) {
            conditions.push(`username = $${values.length + 1}`);
            values.push(filter.username);
          }
          if (filter.role) {
            conditions.push(`role = $${values.length + 1}`);
            values.push(filter.role);
          }
          if (filter.siteId) {
            conditions.push(`site_id = $${values.length + 1}`);
            values.push(filter.siteId);
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
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
          const conditions: string[] = [];

          if (filter.id) {
            conditions.push(`id = $${values.length + 1}`);
            values.push(filter.id);
          }
          if (filter.username) {
            conditions.push(`username = $${values.length + 1}`);
            values.push(filter.username);
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
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
            INSERT INTO users (id, username, password_hash, role, name, site_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const values = [user.id, user.username, user.password_hash, user.role, user.name, user.siteId];
          const result = await client.query(query, values);
          return { insertedId: result.rows[0].id };
        } finally {
          client.release();
        }
      },

      async updateOne(filter: any, update: any) {
        const client = await pool.connect();
        try {
          const setFields = Object.keys(update.$set || update);
          const setClause = setFields.map((key, index) => {
            const dbKey = key === 'siteId' ? 'site_id' : key;
            return `${dbKey} = $${index + 2}`;
          }).join(', ');
          
          const query = `UPDATE users SET ${setClause} WHERE id = $1`;
          const values = [filter.id, ...Object.values(update.$set || update)];
          await client.query(query, values);
        } finally {
          client.release();
        }
      },

      async updateMany(filter: any, update: any) {
        const client = await pool.connect();
        try {
          let query = 'UPDATE users SET ';
          const values: any[] = [];
          
          if (update.$set) {
            const setFields = Object.keys(update.$set);
            const setClause = setFields.map((key, index) => {
              const dbKey = key === 'siteId' ? 'site_id' : key;
              return `${dbKey} = $${index + 1}`;
            }).join(', ');
            query += setClause;
            values.push(...Object.values(update.$set));
          }
          
          if (update.$unset) {
            const unsetFields = Object.keys(update.$unset);
            const unsetClause = unsetFields.map((key, index) => {
              const dbKey = key === 'siteId' ? 'site_id' : key;
              return `${dbKey} = NULL`;
            }).join(', ');
            query += (values.length > 0 ? ', ' : '') + unsetClause;
          }

          if (filter.siteId) {
            query += ` WHERE site_id = $${values.length + 1}`;
            values.push(filter.siteId);
          }

          await client.query(query, values);
        } finally {
          client.release();
        }
      },

      async deleteOne(filter: any) {
        const client = await pool.connect();
        try {
          const query = 'DELETE FROM users WHERE id = $1';
          await client.query(query, [filter.id]);
        } finally {
          client.release();
        }
      },

      async countDocuments(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = 'SELECT COUNT(*) FROM users';
          const values: any[] = [];
          const conditions: string[] = [];

          if (filter.role) {
            conditions.push(`role = $${values.length + 1}`);
            values.push(filter.role);
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
          }

          const result = await client.query(query, values);
          return parseInt(result.rows[0].count);
        } finally {
          client.release();
        }
      }
    };
  }

  // Workers operations - Complete CRUD
  get workers() {
    return {
      async find(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM workers WHERE is_active = true';
          const values: any[] = [];
          const conditions: string[] = [];

          if (filter.siteId) {
            conditions.push(`site_id = $${values.length + 1}`);
            values.push(filter.siteId);
          }

          if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
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

      async findOne(filter: any) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM workers WHERE is_active = true AND id = $1';
          const result = await client.query(query, [filter.id]);
          const row = result.rows[0];
          return row ? {
            ...row,
            siteId: row.site_id,
            dailyWage: row.daily_wage,
            fatherName: row.father_name,
            isActive: row.is_active,
            createdAt: row.created_at
          } : null;
        } finally {
          client.release();
        }
      },

      async insertOne(worker: any) {
        const client = await pool.connect();
        try {
          const query = `
            INSERT INTO workers (id, name, father_name, designation, daily_wage, site_id, phone)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
          const values = [worker.id, worker.name, worker.fatherName, worker.designation, worker.dailyWage, worker.siteId, worker.phone];
          const result = await client.query(query, values);
          return { insertedId: result.rows[0].id };
        } finally {
          client.release();
        }
      },

      async updateOne(filter: any, update: any) {
        const client = await pool.connect();
        try {
          const setFields = Object.keys(update.$set || update);
          const setClause = setFields.map((key, index) => {
            const dbKey = key === 'siteId' ? 'site_id' :
              key === 'dailyWage' ? 'daily_wage' :
                key === 'fatherName' ? 'father_name' :
                  key === 'isActive' ? 'is_active' : key;
            return `${dbKey} = $${index + 2}`;
          }).join(', ');

          const query = `UPDATE workers SET ${setClause} WHERE id = $1`;
          const values = [filter.id, ...Object.values(update.$set || update)];
          await client.query(query, values);
        } finally {
          client.release();
        }
      },

      async deleteOne(filter: any) {
        const client = await pool.connect();
        try {
          const query = 'UPDATE workers SET is_active = false WHERE id = $1';
          await client.query(query, [filter.id]);
          return { deletedCount: 1 };
        } finally {
          client.release();
        }
      },

      async deleteMany(filter: any) {
        const client = await pool.connect();
        try {
          let query = 'UPDATE workers SET is_active = false';
          const values: any[] = [];

          if (filter.siteId) {
            query += ' WHERE site_id = $1';
            values.push(filter.siteId);
          }

          await client.query(query, values);
        } finally {
          client.release();
        }
      },

      async countDocuments(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = 'SELECT COUNT(*) FROM workers WHERE is_active = true';
          const values: any[] = [];

          if (filter.siteId) {
            query += ' AND site_id = $1';
            values.push(filter.siteId);
          }

          const result = await client.query(query, values);
          return parseInt(result.rows[0].count);
        } finally {
          client.release();
        }
      }
    };
  }

  // Sites operations - Complete CRUD
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

      async findOne(filter: any) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM sites WHERE is_active = true AND id = $1';
          const result = await client.query(query, [filter.id]);
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
      },

      async updateOne(filter: any, update: any) {
        const client = await pool.connect();
        try {
          const setFields = Object.keys(update.$set || update);
          const setClause = setFields.map((key, index) => {
            const dbKey = key === 'inchargeId' ? 'incharge_id' :
              key === 'inchargeName' ? 'incharge_name' :
                key === 'isActive' ? 'is_active' : key;
            return `${dbKey} = $${index + 2}`;
          }).join(', ');

          const query = `UPDATE sites SET ${setClause} WHERE id = $1`;
          const values = [filter.id, ...Object.values(update.$set || update)];
          await client.query(query, values);
        } finally {
          client.release();
        }
      },

      async updateMany(filter: any, update: any) {
        const client = await pool.connect();
        try {
          let query = 'UPDATE sites SET ';
          const values: any[] = [];
          
          if (update.$unset) {
            const unsetFields = Object.keys(update.$unset);
            const unsetClause = unsetFields.map(key => {
              const dbKey = key === 'inchargeId' ? 'incharge_id' :
                key === 'inchargeName' ? 'incharge_name' : key;
              return `${dbKey} = NULL`;
            }).join(', ');
            query += unsetClause;
          }

          if (filter.inchargeId) {
            query += ` WHERE incharge_id = $${values.length + 1}`;
            values.push(filter.inchargeId);
          }

          await client.query(query, values);
        } finally {
          client.release();
        }
      },

      async deleteOne(filter: any) {
        const client = await pool.connect();
        try {
          const query = 'UPDATE sites SET is_active = false WHERE id = $1';
          await client.query(query, [filter.id]);
        } finally {
          client.release();
        }
      },

      async countDocuments(filter: any = {}) {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) FROM sites WHERE is_active = true');
          return parseInt(result.rows[0].count);
        } finally {
          client.release();
        }
      }
    };
  }

  // Attendance records operations - Complete CRUD
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
          if (filter.status) {
            if (filter.status.$in) {
              const placeholders = filter.status.$in.map((_, index) => `$${values.length + index + 1}`).join(', ');
              conditions.push(`ar.status IN (${placeholders})`);
              values.push(...filter.status.$in);
            } else {
              conditions.push(`ar.status = $${values.length + 1}`);
              values.push(filter.status);
            }
          }
          if (filter.foremanId) {
            conditions.push(`ar.marked_by = $${values.length + 1}`);
            values.push(filter.foremanId);
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
          }

          query += ' ORDER BY ar.date DESC, w.name LIMIT 100';
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
            sort: (sortObj?: any) => ({
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

      async findOne(filter: any) {
        const client = await pool.connect();
        try {
          let query = 'SELECT * FROM attendance_records';
          const values: any[] = [];
          const conditions: string[] = [];

          if (filter.id) {
            conditions.push(`id = $${values.length + 1}`);
            values.push(filter.id);
          }
          if (filter.workerId && filter.date) {
            conditions.push(`worker_id = $${values.length + 1}`);
            conditions.push(`date = $${values.length + 2}`);
            values.push(filter.workerId, filter.date);
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
          }

          query += ' LIMIT 1';
          const result = await client.query(query, values);
          const row = result.rows[0];
          return row ? {
            ...row,
            workerId: row.worker_id,
            siteId: row.site_id,
            markedBy: row.marked_by,
            markedAt: row.marked_at
          } : null;
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
      },

      async updateOne(filter: any, update: any) {
        const client = await pool.connect();
        try {
          const setFields = Object.keys(update.$set || update);
          const setClause = setFields.map((key, index) => {
            const dbKey = key === 'markedBy' ? 'marked_by' :
              key === 'markedAt' ? 'marked_at' : key;
            return `${dbKey} = $${index + 2}`;
          }).join(', ');

          const query = `UPDATE attendance_records SET ${setClause} WHERE id = $1`;
          const values = [filter.id, ...Object.values(update.$set || update)];
          await client.query(query, values);
        } finally {
          client.release();
        }
      },

      async deleteMany(filter: any) {
        const client = await pool.connect();
        try {
          let query = 'DELETE FROM attendance_records';
          const values: any[] = [];
          const conditions: string[] = [];

          if (filter.date && filter.date.$lt) {
            conditions.push(`date < $${values.length + 1}`);
            values.push(filter.date.$lt);
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
          }

          const result = await client.query(query, values);
          return { deletedCount: result.rowCount };
        } finally {
          client.release();
        }
      },

      async countDocuments(filter: any = {}) {
        const client = await pool.connect();
        try {
          let query = 'SELECT COUNT(*) FROM attendance_records';
          const values: any[] = [];
          const conditions: string[] = [];

          if (filter.date) {
            conditions.push(`date = $${values.length + 1}`);
            values.push(filter.date);
          }
          if (filter.status) {
            if (filter.status.$in) {
              const placeholders = filter.status.$in.map((_, index) => `$${values.length + index + 1}`).join(', ');
              conditions.push(`status IN (${placeholders})`);
              values.push(...filter.status.$in);
            } else {
              conditions.push(`status = $${values.length + 1}`);
              values.push(filter.status);
            }
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
          }

          const result = await client.query(query, values);
          return parseInt(result.rows[0].count);
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