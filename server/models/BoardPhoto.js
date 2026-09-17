// models/BoardPhoto.js
const mongoose = require('mongoose');

/**
 * Links one Photo to one Board — a single "this image is on that board" fact.
 *
 * A photo can belong to many boards and a board holds many photos, so this is
 * the join between them. Anything that depends on the PAIR rather than on the
 * image alone lives here: who put this image on this board, and when.
 *
 * Saving a photo creates one of these. Removing a photo from a board deletes
 * one of these — the underlying Photo document survives, because other boards
 * may still reference it.
 */
const boardPhotoSchema = new mongoose.Schema({
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
  },
  photoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
    required: true,
  },
  // Who saved it to this board. On a collaboration board this isn't always the
  // owner. Attribution only — it does not affect who may remove the photo,
  // since any collaborator can edit anything on the board.
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Per-board timestamp, which is why it lives here and not on Photo: the same
  // image can be added to two boards on different days. This is the field the
  // board view and search results sort on.
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Loading a board means fetching its links newest-or-oldest first, so index the
// exact shape of that query rather than boardId alone.
boardPhotoSchema.index({ boardId: 1, addedAt: -1 });

// A board can't hold the same image twice. Enforced in the database rather than
// with a read-then-write check in the route, which could race and let a
// double-click create two links.
//
// Note this is scoped to the board: the same photo on a DIFFERENT board is a
// separate document and perfectly allowed. That's the whole point of the join.
boardPhotoSchema.index({ boardId: 1, photoId: 1 }, { unique: true });

// Reverse lookup: "which boards is this photo on?", used to annotate search
// results and to check whether a Photo is orphaned.
boardPhotoSchema.index({ photoId: 1 });

/**
 * Recomputes a board's `tags` field from the photos it currently contains.
 *
 * Board.tags is the union of its photos' tags, so it has to be re-derived after
 * every add and remove. Deriving it from scratch, rather than pushing and
 * pulling individual tags, means removing a photo can't strip a tag that
 * another photo on the board still legitimately provides — and the board
 * correctly ends up with an empty tag list once its last photo is gone.
 *
 * This needs an aggregation rather than a simple `distinct` because the tags
 * live on Photo while the board membership lives here, so the two have to be
 * joined first.
 */
boardPhotoSchema.statics.syncBoardTags = async function (boardId) {
  const result = await this.aggregate([
    { $match: { boardId: new mongoose.Types.ObjectId(boardId) } },
    {
      $lookup: {
        from: 'photos',
        localField: 'photoId',
        foreignField: '_id',
        as: 'photo',
      },
    },
    { $unwind: '$photo' },
    { $unwind: '$photo.sourceTags' },
    { $group: { _id: null, tags: { $addToSet: '$photo.sourceTags' } } },
  ]);

  // An empty board aggregates to zero rows, which is the case that correctly
  // clears the tag list.
  const tags = result.length > 0 ? result[0].tags : [];
  await mongoose.model('Board').findByIdAndUpdate(boardId, { tags });
  return tags;
};

/**
 * The set of Pixabay ids this user has already saved, used to filter the
 * Discover feed.
 *
 * "Already saved" means the image is on a board the user OWNS. Boards they
 * collaborate on or have merely bookmarked don't count — those aren't their
 * collection, and counting them would hide images the user never saved.
 */
boardPhotoSchema.statics.savedPixabayIds = async function (userId) {
  const ownedBoards = await mongoose.model('Board')
    .find({ owner: userId })
    .select('_id')
    .lean();

  if (ownedBoards.length === 0) return [];

  const result = await this.aggregate([
    { $match: { boardId: { $in: ownedBoards.map((b) => b._id) } } },
    {
      $lookup: {
        from: 'photos',
        localField: 'photoId',
        foreignField: '_id',
        as: 'photo',
      },
    },
    { $unwind: '$photo' },
    { $group: { _id: null, ids: { $addToSet: '$photo.pixabayId' } } },
  ]);

  return result.length > 0 ? result[0].ids : [];
};

module.exports = mongoose.model('BoardPhoto', boardPhotoSchema);
