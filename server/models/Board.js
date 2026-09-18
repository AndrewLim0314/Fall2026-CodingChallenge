// models/Board.js
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Generates an unguessable URL-safe token.
 * Used for both shareSlug and inviteToken — these appear in URLs that are only
 * as private as they are hard to guess, so they need to be random, not sequential.
 */
function generateToken() {
  return crypto.randomBytes(12).toString('base64url');
}

const boardSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // Union of all this board's photos' tags. Derived data, recomputed on every
  // photo add/remove. Used for the tag chips on a board card — tag SEARCH
  // queries Photo.sourceTags directly, not this field.
  tags: {
    type: [String],
    default: [],
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  // Grants viewing via /b/:shareSlug, even when the board is private.
  shareSlug: {
    type: String,
    default: generateToken,
    unique: true,
  },
  // Grants EDITING via /invite/:inviteToken. Deliberately a separate token from
  // shareSlug so that sharing a board to be seen never hands out edit rights.
  inviteToken: {
    type: String,
    default: generateToken,
    unique: true,
  },
  // Users who can add/remove photos. Flat permissions: any collaborator can
  // edit anything on the board, regardless of who added it.
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Users the owner has removed. Without this, revoking is cosmetic: the
  // invite link still works, so anyone removed can immediately re-accept it.
  // Cleared when the token is rotated, since a new link is a new grant.
  revokedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

// Board names are unique per owner, not globally — two different users can each
// have a board called "Nature", but one user can't have two of them.
boardSchema.index({ owner: 1, name: 1 }, { unique: true });

/**
 * True if the given user may view this board.
 * Public boards are visible to everyone (including logged-out visitors, who
 * arrive here as null). Private boards are owner + collaborators only.
 * Note this deliberately ignores shareSlug: holding the link is its own,
 * separate path to viewing, checked by the route that handles /b/:shareSlug.
 */
boardSchema.methods.canView = function (userId) {
  if (this.isPublic) return true;
  return this.canEdit(userId);
};

/**
 * True if the given user may add or remove photos on this board.
 * Board-level changes (rename, delete, visibility) are owner-only and are
 * checked with isOwner instead.
 */
boardSchema.methods.canEdit = function (userId) {
  if (!userId) return false;
  return this.isOwner(userId) ||
    this.collaborators.some((id) => id.equals(userId));
};

boardSchema.methods.isOwner = function (userId) {
  if (!userId) return false;
  return this.owner.equals(userId);
};

/**
 * Issues a new inviteToken, invalidating every edit link handed out before now.
 * Lives here so the token format is defined in one place.
 */
boardSchema.methods.rotateInviteToken = function () {
  this.inviteToken = generateToken();
  // A fresh link is a fresh grant, so past removals stop blocking anyone.
  this.revokedUsers = [];
  return this.inviteToken;
};

module.exports = mongoose.model('Board', boardSchema);
