const mongoose = require('mongoose');

/**
 * One Follow document per (follower, following) pair.
 * The compound unique index makes duplicate follows impossible at the DB level.
 * Self-follows are rejected in the follow controller.
 */
const followSchema = new mongoose.Schema(
  {
    follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1 });

module.exports = mongoose.model('Follow', followSchema);
