const mongoose = require('mongoose');

/**
 * MongoDB connection (Mongoose).
 * URI comes from server/.env (MONGODB_URI) — local MongoDB or MongoDB Atlas.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/social-media-app';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[db] MongoDB connected -> ${mongoose.connection.host}/${mongoose.connection.name}`);
};

module.exports = connectDB;
