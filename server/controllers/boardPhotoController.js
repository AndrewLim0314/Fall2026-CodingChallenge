// controllers/boardPhotoController.js
const Board = require('../models/Board');
const Photo = require('../models/Photo');
const BoardPhoto = require('../models/BoardPhoto');

/** Shapes a populated BoardPhoto link: the image, plus the per-board facts. */
const boardPhoto = (link) => ({
  id: link.photoId._id,
  pixabayId: link.photoId.pixabayId,
  imageUrl: link.photoId.imageUrl,
  thumbnailUrl: link.photoId.thumbnailUrl,
  pageUrl: link.photoId.pageUrl,
  tags: link.photoId.sourceTags,
  userTags: link.userTags ?? [],
  // Populated when it came through list(); fall back to the raw id otherwise.
  addedBy: link.addedBy?._id ?? link.addedBy,
  addedByUsername: link.addedBy?.username,
  addedAt: link.addedAt,
});

// Pixabay sends tags as one comma-separated string, but the client may already
// have split them.
const normalizeTags = (tags) => {
  const list = Array.isArray(tags) ? tags : String(tags ?? '').split(',');
  return list.map((t) => t.trim().toLowerCase()).filter(Boolean);
};

/**
 * Returns the canonical Photo for this image, creating it on first save.
 * $setOnInsert so saving an image someone else already saved doesn't rewrite it.
 */
async function findOrCreatePhoto(fields) {
  const query = { pixabayId: fields.pixabayId };
  try {
    return await Photo.findOneAndUpdate(query, { $setOnInsert: fields }, { upsert: true, new: true });
  } catch (err) {
    // An upsert isn't atomic against a concurrent upsert on the same key: two
    // users saving the same new image can both attempt the insert. The loser
    // finds the winner's document on the retry.
    if (err.code !== 11000) throw err;
    return Photo.findOne(query);
  }
}

/** A board's links, newest first unless ?sort=asc. Shared by both list routes. */
async function listPhotos(boardId, sort) {
  const direction = sort === 'asc' ? 1 : -1;
  const links = await BoardPhoto.find({ boardId })
    .sort({ addedAt: direction })
    .populate('photoId')
    // Only the username — publicUser's whitelist rule applies here too.
    .populate('addedBy', 'username');

  return links.map(boardPhoto);
}

/** GET /api/boards/:id/photos — ?sort=asc|desc on addedAt, newest first by default. */
exports.list = async (req, res) => {
  res.json({ photos: await listPhotos(req.board._id, req.query.sort) });
};

/**
 * GET /api/b/:shareSlug/photos — the same list, reached by share link.
 * Authorizes by slug rather than by board id: holding the link is its own grant
 * to view, which is exactly the case loadBoard('view') can't answer.
 */
exports.listBySlug = async (req, res) => {
  const board = await Board.findOne({ shareSlug: req.params.shareSlug }).select('_id');
  if (!board) return res.status(404).json({ error: 'Board not found' });

  res.json({ photos: await listPhotos(board._id, req.query.sort) });
};

/** POST /api/boards/:id/photos — save a Pixabay image onto this board. */
exports.add = async (req, res, next) => {
  const { pixabayId, imageUrl, thumbnailUrl, pageUrl, tags } = req.body ?? {};
  if (!pixabayId || !imageUrl || !thumbnailUrl) {
    return res.status(400).json({ error: 'pixabayId, imageUrl and thumbnailUrl are required' });
  }

  const photo = await findOrCreatePhoto({
    pixabayId: Number(pixabayId),
    imageUrl,
    thumbnailUrl,
    pageUrl,
    sourceTags: normalizeTags(tags),
  });

  try {
    await BoardPhoto.create({
      boardId: req.board._id,
      photoId: photo._id,
      addedBy: req.session.userId,
    });
  } catch (err) {
    // Unique index on { boardId, photoId } — a double-click, not a failure.
    if (err.code === 11000) {
      return res.status(409).json({ error: 'That photo is already on this board' });
    }
    return next(err);
  }

  const boardTags = await BoardPhoto.syncBoardTags(req.board._id);
  res.status(201).json({
    photo: {
      id: photo._id,
      pixabayId: photo.pixabayId,
      imageUrl: photo.imageUrl,
      thumbnailUrl: photo.thumbnailUrl,
      pageUrl: photo.pageUrl,
      tags: photo.sourceTags,
    },
    boardTags,
  });
};

/** DELETE /api/boards/:id/photos/:photoId — unlink; the Photo itself survives. */
exports.remove = async (req, res) => {
  const result = await BoardPhoto.deleteOne({
    boardId: req.board._id,
    photoId: req.params.photoId,
  });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'That photo is not on this board' });
  }

  const boardTags = await BoardPhoto.syncBoardTags(req.board._id);
  res.json({ boardTags });
};

/**
 * PATCH /api/boards/:id/photos/:photoId — replace this link's user tags.
 *
 * Scoped to the pair, not the Photo: one image can carry different tags on
 * different boards, and tagging never touches the shared Photo document.
 */
exports.setTags = async (req, res) => {
  const userTags = normalizeTags(req.body?.tags);

  const result = await BoardPhoto.updateOne(
    { boardId: req.board._id, photoId: req.params.photoId },
    { $set: { userTags } },
  );

  // matchedCount, not modifiedCount: timestamps make every update a write.
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'That photo is not on this board' });
  }

  res.json({ userTags });
};
