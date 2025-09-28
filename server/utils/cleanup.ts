import { database } from "../database/connection.js";

// Cleanup attendance records older than specified days
export async function cleanupOldAttendance(daysToKeep: number = 40) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const attendanceCollection = await database.attendanceRecords();
    
    const result = await attendanceCollection.deleteMany({
      submittedAt: { $lt: cutoffDate }
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

// Alternative: Archive old records instead of deleting
export async function archiveOldAttendance(daysToKeep: number = 40) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const attendanceCollection = await database.attendanceRecords();
    
    // Move to archive collection instead of deleting
    const oldRecords = await attendanceCollection.find({
      submittedAt: { $lt: cutoffDate }
    }).toArray();

    if (oldRecords.length > 0) {
      // Create archive collection
      const db = await import('../database/models.js').then(m => m.getDatabase());
      const archiveCollection = (await db).db.collection('attendanceArchive');
      
      await archiveCollection.insertMany(oldRecords);
      
      const result = await attendanceCollection.deleteMany({
        submittedAt: { $lt: cutoffDate }
      });

      console.log(`📦 Archived ${result.deletedCount} attendance records older than ${daysToKeep} days`);
      return result.deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Archive failed:', error);
    return 0;
  }
}