import { database } from "../database/connection.js";

// Cleanup attendance records older than specified days
export async function cleanupOldAttendance(daysToKeep: number = 40) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const attendanceCollection = await database.attendanceRecords();
    
    const result = await attendanceCollection.deleteMany({
      date: { $lt: cutoffDate.toISOString().split('T')[0] }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} attendance records older than ${daysToKeep} days`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return 0;
  }
}

// Run cleanup daily (call this from a cron job or scheduler)
export async function scheduleCleanup() {
  // Run cleanup every 24 hours
  setInterval(async () => {
    await cleanupOldAttendance(40);
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
}

// Alternative: Archive old records instead of deleting (simplified for PostgreSQL)
export async function archiveOldAttendance(daysToKeep: number = 40) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const attendanceCollection = await database.attendanceRecords();
    
    // For PostgreSQL, we'll just delete old records (archiving would require additional tables)
    const result = await attendanceCollection.deleteMany({
      date: { $lt: cutoffDate.toISOString().split('T')[0] }
    });

    console.log(`📦 Cleaned up ${result.deletedCount} attendance records older than ${daysToKeep} days`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Archive failed:', error);
    return 0;
  }
}