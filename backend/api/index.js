const app = require('../src/app');
const connectDB = require('../src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('[Vercel Serverless DB Warning]', err.message);
  }
  return app(req, res);
};
