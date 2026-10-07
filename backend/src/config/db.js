const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Ensure IPv4 first DNS lookup for MongoDB Atlas SRV resolution compatibility
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const seedDefaultDataIfNeeded = async () => {
  try {
    const Company = require('../models/Company');
    const User = require('../models/User');
    const Department = require('../models/Department');
    const Policy = require('../models/Policy');

    const existingUserCount = await User.countDocuments();
    if (existingUserCount === 0) {
      console.log('[Seed] Seeding initial dev workspace accounts & policies...');
      
      const company = await Company.create({
        name: 'Validation Test Corp',
        domain: 'testcorp.com'
      });

      const admin = await User.create({
        name: 'Test Administrator',
        email: 'admin@testcorp.com',
        password: 'testpassword123',
        role: 'Company Admin',
        companyId: company._id,
        isVerified: true,
        status: 'Active'
      });

      const department = await Department.create({
        name: 'Sales Dept',
        companyId: company._id,
        managerId: admin._id
      });

      admin.departmentId = department._id;
      await admin.save();

      await User.create({
        name: 'Test Employee',
        email: 'employee@testcorp.com',
        password: 'employee123',
        role: 'Employee',
        companyId: company._id,
        departmentId: department._id,
        isVerified: true,
        status: 'Active'
      });

      await User.create({
        name: 'Test HR Manager',
        email: 'hr@testcorp.com',
        password: 'hr123',
        role: 'HR Manager',
        companyId: company._id,
        departmentId: department._id,
        isVerified: true,
        status: 'Active'
      });

      await User.create({
        name: 'Test Compliance Auditor',
        email: 'auditor@testcorp.com',
        password: 'auditor123',
        role: 'Auditor',
        companyId: company._id,
        departmentId: department._id,
        isVerified: true,
        status: 'Active'
      });

      await Policy.create({
        companyId: company._id,
        name: 'Standard Travel & Meals Policy',
        rules: {
          maxMealAmount: 50,
          maxTravelAmount: 200,
          allowedVendors: ['Uber', 'Hilton', 'Starbucks', 'Delta'],
          requiresPreApproval: false
        },
        createdBy: admin._id
      });

      console.log('======================================================');
      console.log('   DEFAULT DEV ACCOUNTS SEEDED IN DATABASE            ');
      console.log('======================================================');
      console.log(' Admin Email:    admin@testcorp.com | Pass: testpassword123');
      console.log(' HR Email:       hr@testcorp.com    | Pass: hr123');
      console.log(' Auditor Email:  auditor@testcorp.com | Pass: auditor123');
      console.log(' Employee Email: employee@testcorp.com| Pass: employee123');
      console.log('======================================================\n');
    }
  } catch (err) {
    console.warn(`[Seed Warning] Automated seeding skipped: ${err.message}`);
  }
};

const trySpawnLocalMongod = async () => {
  const mongodPaths = [
    'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe'
  ];

  const foundPath = mongodPaths.find(p => fs.existsSync(p));
  if (!foundPath) return false;

  try {
    const dbDir = path.join(__dirname, '..', '..', 'data', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    console.log('[MongoDB] Auto-launching local mongod.exe binary...');
    const child = spawn(foundPath, ['--dbpath', dbDir], { stdio: 'ignore', detached: true });
    child.unref();
    await new Promise(r => setTimeout(r, 2000));
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Failed to launch mongod.exe: ${err.message}`);
    return false;
  }
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const targetUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expensepilot';
  
  // 1. Attempt connection using configured MONGODB_URI (Cloud Atlas or Local)
  try {
    const conn = await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[MongoDB] Connected to database host: ${conn.connection.host}`);
    await seedDefaultDataIfNeeded();
    return conn;
  } catch (err) {
    if (err.message.includes('whitelist') || err.message.includes('IP') || err.message.includes('Could not connect to any servers')) {
      console.warn('\n======================================================================');
      console.warn('[MongoDB Atlas Action Required] IP Whitelist restriction detected!');
      console.warn('  1. Open MongoDB Atlas Console (https://cloud.mongodb.com)');
      console.warn('  2. Navigate to Security -> Network Access');
      console.warn('  3. Click "+ Add IP Address" and select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0)');
      console.warn('======================================================================\n');
    } else {
      console.warn(`[MongoDB Warning] Direct connection to ${targetUri} failed: ${err.message}`);
    }
  }

  // 2. Fallback: Auto-start installed local mongod.exe binary if present
  const spawned = await trySpawnLocalMongod();
  if (spawned) {
    try {
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/expensepilot', { serverSelectionTimeoutMS: 5000 });
      console.log(`[MongoDB] Connected to auto-started local database host: ${conn.connection.host}`);
      await seedDefaultDataIfNeeded();
      return conn;
    } catch (err) {
      console.warn(`[MongoDB Warning] Connection to auto-launched daemon failed: ${err.message}`);
    }
  }

  // 3. Fallback: Attempt MongoMemoryServer in-process fallback if available
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log('[MongoDB] Attempting MongoMemoryServer in-process fallback...');
    const mongoServer = await MongoMemoryServer.create({
      binary: { version: '4.4.18' }
    });
    const memUri = mongoServer.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`[MongoDB] In-Memory Database Connected: ${conn.connection.host}`);
    await seedDefaultDataIfNeeded();
    return conn;
  } catch (fallbackError) {
    console.warn(`[MongoDB Warning] Could not establish fallback database: ${fallbackError.message}`);
    console.warn('           Please verify your MONGODB_URI setting in Render / Environment variables.');
    return null;
  }
};

module.exports = connectDB;


