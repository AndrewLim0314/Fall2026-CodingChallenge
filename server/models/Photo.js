// models/Photo.js
const mongoose = require('mongoose');

/**
 * A Pixabay image we've seen before — the canonical record of one image.
 *
 * There is exactly ONE Photo document per Pixabay image, no matter how many
 * users save it or how many boards it lands in. Which boards contain it lives
 * in the BoardPhoto collection, not here.
 *
 * Photos in the Discover feed are not stored at all; they exist only in the
 * Pixabay API response. A Photo document is created (upserted) the first time
 * anyone saves that image to a board.
 *
 * Because this doc is shared across users, it holds only facts about the image
 * itself — nothing about who saved it or when. That's per-board data and it
 * belongs on the BoardPhoto link.
 */
const photoSchema = new mongoose.Schema({
  // Pixabay's own numeric id. Unique: this is what makes one document per
  // image, and it's the key we upsert on when someone saves an image.
  pixabayId: {
    type: Number,
    required: true,
    unique: true,
  },
  // Full-size image, shown when a photo is opened.
  imageUrl: {
    type: String,
    required: true,
  },
  // Smaller preview for the board and search grids, so rendering 20 tiles
  // doesn't download 20 full-resolution images.
  thumbnailUrl: {
    type: String,
    required: true,
  },
  // Link back to the image's page on Pixabay. Their terms ask for attribution,
  // and it gives users a route to the original.
  pageUrl: {
    type: String,
  },
  // Tags from Pixabay, captured at first save. Pixabay returns these as a
  // single comma-separated string; the route splits it before saving.
  // This is the field the global tag search queries.
  sourceTags: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

// The global tag search is `{ sourceTags: { $in: [...] } }` across every photo
// in the database. Without this index, that query scans the whole collection.
//
// One payoff of the canonical-photo design: this search now returns one
// document per image, so a popular image saved by 50 users no longer produces
// 50 near-identical tiles in the results grid.
photoSchema.index({ sourceTags: 1 });

module.exports = mongoose.model('Photo', photoSchema);
