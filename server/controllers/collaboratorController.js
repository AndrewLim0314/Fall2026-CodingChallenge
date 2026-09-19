// controllers/collaboratorController.js
const Board = require('../models/Board');
const User = require('../models/User');

/**
 * GET /api/boards/:id/collaborators — owner only.
 *
 * Its own route rather than a field on publicBoard: every other board response
 * would then have to populate users it doesn't need, and who can edit a board
 * is the owner's business, not a viewer's.
 */
exports.list = async (req, res) => {
  const users = await User.find({ _id: { $in: req.board.collaborators } })
    .select('username')
    .lean();

  res.json({ collaborators: users.map((u) => ({ id: u._id, username: u.username })) });
};

/**
 * POST /api/boards/:id/invite — owner only.
 * Returns the current invite token, or a fresh one with ?rotate=true, which
 * invalidates every link handed out before now.
 */
exports.invite = async (req, res) => {
  if (req.query.rotate === 'true') {
    req.board.rotateInviteToken();
    await req.board.save();
  }
  res.json({ inviteToken: req.board.inviteToken });
};

/**
 * POST /api/invite/:inviteToken — accept an invite and become a collaborator.
 * Looked up by token rather than :id, so holding the link is the whole grant.
 */
exports.accept = async (req, res) => {
  const board = await Board.findOne({ inviteToken: req.params.inviteToken });
  if (!board) return res.status(404).json({ error: 'Invite not found' });

  if (board.isOwner(req.session.userId)) {
    return res.status(400).json({ error: 'You already own this board' });
  }

  // Removed users can't walk back in on the same link; the owner rotates the
  // token to re-open it.
  if (board.revokedUsers.some((id) => id.equals(req.session.userId))) {
    return res.status(403).json({ error: 'Your access to this board was removed' });
  }

  // $addToSet, so following the link twice is a no-op rather than an error.
  await Board.updateOne({ _id: board._id }, { $addToSet: { collaborators: req.session.userId } });
  res.json({ board: { id: board._id, name: board.name } });
};

/** DELETE /api/boards/:id/collaborators/:userId — owner only. */
exports.revoke = async (req, res) => {
  const result = await Board.updateOne(
    { _id: req.board._id, collaborators: req.params.userId },
    {
      $pull: { collaborators: req.params.userId },
      $addToSet: { revokedUsers: req.params.userId },
    },
  );
  // matchedCount, not modifiedCount: timestamps:true appends an updatedAt write
  // to every update, so modifiedCount is never 0 even when nothing was pulled.
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'Not a collaborator on this board' });
  }

  // Their photos stay: addedBy is attribution, not ownership, and the board's
  // contents shouldn't change because someone lost write access.
  res.status(204).end();
};
