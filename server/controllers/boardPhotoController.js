// controllers/boardPhotoController.js
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
  addedBy: link.addedBy,
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

/** GET /api/boards/:id/photos — ?sort=asc|desc on addedAt, newest first by default. */
exports.list = async (req, res) => {
  const direction = req.query.sort === 'asc' ? 1 : -1;
  const links = await BoardPhoto.find({ boardId: req.board._id })
    .sort({ addedAt: direction })
    .populate('photoId');

  res.json({ photos: links.map(boardPhoto) });
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
