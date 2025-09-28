// Supabase PostgreSQL connection - Production Ready
import { getDatabase, initializeDatabase as connectToDatabase } from './models.js';

// Export getDatabase for direct use
export { getDatabase };

// For backward compatibility, export database instance
export const database = {
  async users() {
    const db = await getDatabase();
    return db.users;
  },
  async attendanceRecords() {
    const db = await getDatabase();
    return db.attendanceRecords;
  },
  async workers() {
    const db = await getDatabase();
    return db.workers;
  },
  async sites() {
    const db = await getDatabase();
    return db.sites;
  }
};

// Initialize database and demo data on startup
export async function initializeDatabase() {
  let retries = 3;
  while (retries > 0) {
    try {
      await connectToDatabase(); // Connect to database
      const db = await getDatabase();
      await db.initializeDemoData();
      console.log('🚀 Database initialized successfully');
      return;
    } catch (error) {
      retries--;
      console.error(`❌ Database initialization failed (${retries} retries left):`, error);
      if (retries === 0) {
        console.error('❌ Database initialization failed after all retries. Server will continue without database.');
        return; // Don't throw error, let server start without database
      }
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
    }
  }
}
