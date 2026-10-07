const app = require('../backend/src/app');
const connectDB = require('../backend/src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('[Vercel Monorepo Serverless DB Warning]', err.message);
  }
  return app(req, res);
};
