// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  hashedPassword: {
    type: String,
    required: true,
  },
  // Boards this user has bookmarked from other people — the "Saved Boards"
  // section of their profile. These are references, not copies, so a saver sees
  // the owner's edits live. If a saved board later goes private it stays in
  // this list but is filtered out at read time by the board's own view check.
  savedBoards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);