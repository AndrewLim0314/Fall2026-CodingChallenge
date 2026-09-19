// controllers/boardController.js
const Board = require('../models/Board');
const BoardPhoto = require('../models/BoardPhoto');
const User = require('../models/User');

/**
 * Shapes a board for the client. Both tokens are withheld by default:
 * inviteToken grants editing, and shareSlug grants viewing a private board.
 */
const publicBoard = (board, userId) => {
  // owner is an ObjectId normally, a User document where the caller populated
  // it, and null if that user no longer exists — populate nulls a dangling ref
  // rather than leaving the id behind. Emit the id either way, plus the
  // username when we actually have one.
  const owner = board.owner;
  const out = {
    id: board._id,
    name: board.name,
    tags: board.tags,
    isPublic: board.isPublic,
    owner: owner?._id ?? owner ?? null,
    ...(owner?.username ? { ownerUsername: owner.username } : {}),
    collaboratorCount: board.collaborators.length,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
  if (board.canEdit(userId)) out.shareSlug = board.shareSlug;
  if (board.isOwner(userId)) out.inviteToken = board.inviteToken;
  return out;
};

/**
 * GET /api/boards/discover — every public board, newest activity first.
 * Board names are unique per owner, not globally, so a card is only meaningful
 * with its owner's name attached — hence the populate.
 */
exports.discover = async (req, res) => {
  const boards = await Board.find({ isPublic: true })
    .sort({ updatedAt: -1 })
    .limit(50)
    .populate('owner', 'username');

  res.json({ boards: boards.map((b) => publicBoard(b, req.session?.userId)) });
};

/** POST /api/boards — create a board owned by the current user. */
exports.create = async (req, res, next) => {
  try {
    const { name, isPublic } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    const board = await Board.create({
      owner: req.session.userId,
      name: name.trim(),
      ...(isPublic === undefined ? {} : { isPublic: Boolean(isPublic) }),
    });
    res.status(201).json({ board: publicBoard(board, req.session.userId) });
  } catch (err) {
    // Unique index on { owner, name } — the user already has a board by this name.
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You already have a board with that name' });
    }
    next(err);
  }
};

/** GET /api/boards/:id */
exports.show = async (req, res) => {
  res.json({ board: publicBoard(req.board, req.session?.userId) });
};

/** PATCH /api/boards/:id — owner only: rename, toggle visibility. */
exports.update = async (req, res, next) => {
  try {
    const { name, isPublic } = req.body ?? {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      req.board.name = name.trim();
    }
    if (isPublic !== undefined) req.board.isPublic = Boolean(isPublic);

    await req.board.save();
    res.json({ board: publicBoard(req.board, req.session.userId) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You already have a board with that name' });
    }
    next(err);
  }
};

/** DELETE /api/boards/:id — owner only. */
exports.remove = async (req, res) => {
  // The links go too, or they outlive the board they point at. The Photo
  // documents stay: other boards may still reference them.
  await BoardPhoto.deleteMany({ boardId: req.board._id });
  await User.updateMany({ savedBoards: req.board._id }, { $pull: { savedBoards: req.board._id } });
  await req.board.deleteOne();
  res.status(204).end();
};

/**
 * GET /api/b/:shareSlug — view by share link.
 * Holding the slug is its own grant, so this deliberately skips canView.
 */
exports.showBySlug = async (req, res) => {
  const board = await Board.findOne({ shareSlug: req.params.shareSlug });
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json({ board: publicBoard(board, req.session?.userId) });
};

/** POST /api/boards/:id/save — bookmark someone else's board. */
exports.save = async (req, res) => {
  if (req.board.isOwner(req.session.userId)) {
    return res.status(400).json({ error: 'You already own this board' });
  }
  // $addToSet so saving twice is a no-op rather than a duplicate entry.
  await User.findByIdAndUpdate(req.session.userId, { $addToSet: { savedBoards: req.board._id } });
  res.status(204).end();
};

/** DELETE /api/boards/:id/save */
exports.unsave = async (req, res) => {
  await User.findByIdAndUpdate(req.session.userId, { $pull: { savedBoards: req.board._id } });
  res.status(204).end();
};

/** GET /api/me/boards — the three profile sections. */
exports.myBoards = async (req, res) => {
  const userId = req.session.userId;

  const [owned, collaborating, user] = await Promise.all([
    Board.find({ owner: userId }).sort({ updatedAt: -1 }),
    Board.find({ collaborators: userId }).sort({ updatedAt: -1 }),
    User.findById(userId).populate('savedBoards'),
  ]);

  // A bookmarked board can go private after it was saved, so re-check each one
  // rather than trusting that it was visible when it landed in the list.
  const saved = (user?.savedBoards ?? []).filter((b) => b.canView(userId));

  res.json({
    owned: owned.map((b) => publicBoard(b, userId)),
    collaborating: collaborating.map((b) => publicBoard(b, userId)),
    saved: saved.map((b) => publicBoard(b, userId)),
  });
};
