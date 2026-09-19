// controllers/searchController.js
const Photo = require('../models/Photo');
const BoardPhoto = require('../models/BoardPhoto');

// Tags are stored lowercased and trimmed by boardPhotoController, so the query
// has to be normalized the same way or nothing matches.
const parseTags = (raw) =>
  String(raw ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

/**
 * GET /api/photos/search?tags=sunset,beach&sort=asc|desc
 * Matches on Photo.sourceTags, then keeps only hits the caller may actually see.
 */
exports.searchPhotos = async (req, res) => {
  const tags = parseTags(req.query.tags);
  if (tags.length === 0) return res.status(400).json({ error: 'tags is required' });

  const direction = req.query.sort === 'asc' ? 1 : -1;

  const photos = await Photo.find({ sourceTags: { $in: tags } }).select('_id').limit(500);

  // Two ways to match: the image's own Pixabay tags, or tags a board member put
  // on that link. $or rather than two queries so the sort stays global.
  const match = [{ userTags: { $in: tags } }];
  if (photos.length > 0) match.push({ photoId: { $in: photos.map((p) => p._id) } });

  const links = await BoardPhoto.find({ $or: match })
    .sort({ addedAt: direction })
    .populate('photoId')
    .populate('boardId');

  // Permission is per board, so it's checked here rather than folded into the
  // query above — a photo stays hidden until it turns up on a board you can see.
  const results = [];
  const byPhoto = new Map();

  for (const link of links) {
    if (!link.boardId || !link.photoId) continue;
    if (!link.boardId.canView(req.session?.userId)) continue;

    // One tile per image even when it appears on several visible boards.
    const key = String(link.photoId._id);
    if (!byPhoto.has(key)) {
      const entry = {
        id: link.photoId._id,
        pixabayId: link.photoId.pixabayId,
        imageUrl: link.photoId.imageUrl,
        thumbnailUrl: link.photoId.thumbnailUrl,
        pageUrl: link.photoId.pageUrl,
        tags: link.photoId.sourceTags,
        addedAt: link.addedAt,
        boards: [],
      };
      byPhoto.set(key, entry);
      results.push(entry);
    }
    byPhoto.get(key).boards.push({
      id: link.boardId._id,
      name: link.boardId.name,
      userTags: link.userTags ?? [],
    });
  }

  res.json({ results });
};

/**
 * GET /api/discover?q=&page=
 * Proxies Pixabay so the API key stays server-side, and drops images the caller
 * has already saved to one of their own boards.
 */
exports.discoverPhotos = async (req, res, next) => {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return next(new Error('PIXABAY_API_KEY is not configured'));

  const params = new URLSearchParams({
    key,
    image_type: 'photo',
    safesearch: 'true',
    per_page: '60',
    page: String(Math.max(1, Number(req.query.page) || 1)),
  });
  if (req.query.q) params.set('q', String(req.query.q));

  const response = await fetch(`https://pixabay.com/api/?${params}`);
  if (!response.ok) {
    return res.status(502).json({ error: 'Could not reach Pixabay' });
  }
  const data = await response.json();

  const saved = req.session?.userId
    ? new Set(await BoardPhoto.savedPixabayIds(req.session.userId))
    : new Set();

  const photos = (data.hits ?? [])
    .filter((hit) => !saved.has(hit.id))
    .map((hit) => ({
      pixabayId: hit.id,
      imageUrl: hit.largeImageURL,
      thumbnailUrl: hit.webformatURL,
      pageUrl: hit.pageURL,
      // Comma-separated from Pixabay; kept as-is so the client can POST it back
      // unchanged when saving.
      tags: hit.tags,
    }));

  res.json({ photos });
};
