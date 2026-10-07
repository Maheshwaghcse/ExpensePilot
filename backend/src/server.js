require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startReceiptWorker } = require('./workers/receiptWorker');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // 1. Start Listening immediately to ensure Render / Vercel health checks pass
    app.listen(PORT, () => {
      console.log(`[Server] ExpensePilot Backend listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    // 2. Connect to MongoDB (Non-blocking server boot)
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn(`[MongoDB Warning] Initial DB connection deferred: ${dbErr.message}`);
      console.warn('           Server remains online for health checks. Set valid MONGODB_URI in Render dashboard.');
    }

    // 3. Start BullMQ Worker
    startReceiptWorker();
  } catch (error) {
    console.error(`[Server] Boot failed: ${error.message}`);
  }
};

start();
