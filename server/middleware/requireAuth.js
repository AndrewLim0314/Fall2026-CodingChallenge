// middleware/requireAuth.js

/**
 * Gate for any route that needs to know who is asking.
 *
 * The session is the only source of identity in this app — there is no token
 * header and no user id accepted from the request body, since anything the
 * client can set, the client can forge. Routes that mount this can assume
 * req.session.userId exists by the time their handler runs.
 *
 * This answers "are you logged in?", NOT "are you allowed to touch this board?"
 * That second question is per-resource and is answered later by the Board
 * model's own canView / canEdit / isOwner methods.
 */
module.exports = function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};
