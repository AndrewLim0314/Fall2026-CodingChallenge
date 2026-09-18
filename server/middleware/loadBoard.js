// middleware/loadBoard.js
const Board = require('../models/Board');

const CHECKS = {
  view: (board, userId) => board.canView(userId),
  edit: (board, userId) => board.canEdit(userId),
  own: (board, userId) => board.isOwner(userId),
};

/**
 * Route guard for /api/boards/:id. Loads the board and checks the caller at the
 * given level ('view' | 'edit' | 'own'), leaving it on req.board.
 */
module.exports = function loadBoard(level) {
  const isAllowed = CHECKS[level];
  if (!isAllowed) throw new Error(`loadBoard: unknown level "${level}"`);

  return async (req, res, next) => {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const userId = req.session?.userId;

    // 404 rather than 403: a 403 would confirm a private board with this id exists.
    if (!board.canView(userId)) {
      return res.status(404).json({ error: 'Board not found' });
    }
    if (!isAllowed(board, userId)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    req.board = board;
    next();
  };
};
