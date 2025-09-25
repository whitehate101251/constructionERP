// MongoDB Atlas connection and models
// Note: This is prepared for MongoDB Atlas but uses in-memory storage for demo
// To use MongoDB Atlas:
// 1. Install mongodb package: pnpm add mongodb
// 2. Set MONGODB_URI environment variable
// 3. Uncomment the MongoDB code and comment out the in-memory storage

import { User, AttendanceRecord, Worker, Site } from "@shared/api";

// Environment configuration
export const DB_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/constructerp",
  DB_NAME: "constructerp",
};

// In-memory storage (for demo purposes)
// Replace with MongoDB collections in production
export class InMemoryDatabase {
  static users: User[] = [
    {
      id: "user_1",
      username: "demo_foreman",
      role: "foreman",
      name: "John Smith",
      email: "john.smith@construction.com",
      siteId: "site_1",
      createdAt: new Date(),
    },
    {
      id: "user_2", 
      username: "demo_site_incharge",
      role: "site_incharge",
      name: "Sarah Johnson",
      email: "sarah.johnson@construction.com",
      siteId: "site_1",
      createdAt: new Date(),
    },
    {
      id: "user_3",
      username: "demo_admin", 
      role: "admin",
      name: "Michael Davis",
      email: "michael.davis@construction.com",
      createdAt: new Date(),
    },
  ];

  static attendanceRecords: AttendanceRecord[] = [];

  static workers: Worker[] = [
    { id: "worker_1", name: "Rajesh Kumar", fatherName: "Mahesh Kumar", designation: "Mason", dailyWage: 800, siteId: "site_1", phone: "9876543210" },
    { id: "worker_2", name: "Suresh Sharma", fatherName: "Naresh Sharma", designation: "Carpenter", dailyWage: 900, siteId: "site_1" },
    { id: "worker_3", name: "Ramesh Yadav", fatherName: "Kailash Yadav", designation: "Helper", dailyWage: 600, siteId: "site_1" },
    { id: "worker_4", name: "Dinesh Gupta", fatherName: "Harish Gupta", designation: "Electrician", dailyWage: 1200, siteId: "site_1" },
    { id: "worker_5", name: "Mukesh Singh", fatherName: "Sohan Singh", designation: "Plumber", dailyWage: 1000, siteId: "site_1" },
    { id: "worker_6", name: "Vikash Jha", fatherName: "Ramesh Jha", designation: "Mason", dailyWage: 750, siteId: "site_1" },
    { id: "worker_7", name: "Ravi Verma", fatherName: "Shiv Verma", designation: "Helper", dailyWage: 650, siteId: "site_1" },
    { id: "worker_8", name: "Sandeep Roy", fatherName: "Umesh Roy", designation: "Carpenter", dailyWage: 850, siteId: "site_1" },
    { id: "worker_9", name: "Anil Tiwari", fatherName: "Shankar Tiwari", designation: "Welder", dailyWage: 1100, siteId: "site_1" },
    { id: "worker_10", name: "Deepak Pandey", fatherName: "Ajay Pandey", designation: "Helper", dailyWage: 600, siteId: "site_1" },
    { id: "worker_11", name: "Gopal Sharma", fatherName: "Raghav Sharma", designation: "Mason", dailyWage: 800, siteId: "site_1" },
    { id: "worker_12", name: "Krishnan Nair", fatherName: "Mohan Nair", designation: "Supervisor", dailyWage: 1500, siteId: "site_1" },
  ];

  static sites: Site[] = [
    {
      id: "site_1",
      name: "Downtown Construction Site",
      location: "Mumbai, Maharashtra", 
      inchargeId: "user_2",
      inchargeName: "Sarah Johnson",
      isActive: true,
    },
  ];
}

// MongoDB Collections (for production deployment)
/*
import { MongoClient, Db, Collection } from 'mongodb';

class MongoDatabase {
  private client: MongoClient;
  private db: Db;

  constructor() {
    this.client = new MongoClient(DB_CONFIG.MONGODB_URI);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(DB_CONFIG.DB_NAME);
    console.log('Connected to MongoDB Atlas');
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  get users(): Collection<User> {
    return this.db.collection('users');
  }

  get attendanceRecords(): Collection<AttendanceRecord> {
    return this.db.collection('attendanceRecords');
  }

  get workers(): Collection<Worker> {
    return this.db.collection('workers');
  }

  get sites(): Collection<Site> {
    return this.db.collection('sites');
  }
}

export const database = new MongoDatabase();
*/

// Export the in-memory database for now
export const database = InMemoryDatabase;
