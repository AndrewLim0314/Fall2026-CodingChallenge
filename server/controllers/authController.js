// controllers/authController.js
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Work factor for bcrypt. Higher is slower to hash and therefore slower to
// brute-force; 12 is the current common default and costs a few hundred ms,
// which is fine on a login route and painful on an offline cracking rig.
const SALT_ROUNDS = 12;

// hashedPassword must never leave the server, so responses are built from an
// explicit whitelist rather than by deleting fields off the document. A
// whitelist stays safe when new fields are added to the schema later.
const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
});

/**
 * Writes the user's id onto a FRESH session id.
 *
 * regenerate() guards against session fixation: if an attacker can plant a
 * known session id in the victim's browser before login, reusing that id after
 * authentication would hand them a logged-in session. Issuing a new id at the
 * moment credentials are accepted makes any pre-login id worthless.
 *
 * Promisified because express-session is callback-based and the handlers below
 * are async — without this the response could be sent before the session write
 * finishes.
 */
function startSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user._id.toString();
      // Explicit save so the Mongo write completes before we respond. Without
      // it the client can race ahead and send its next request before the
      // session document exists, and get a surprise 401.
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

/**
 * POST /api/auth/register
 * Creates the account and logs them straight in — making a new user click
 * through to a login form to retype what they just typed serves no purpose.
 */
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body ?? {};
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: 'username, email and password are required' });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ username, email, hashedPassword });

    await startSession(req, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    // The unique indexes on username/email are the real guard. A findOne check
    // first would still let two simultaneous signups race through the gap
    // between read and write, so the duplicate-key error is handled rather
    // than pre-empted.
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0] ?? 'account';
      return res.status(409).json({ error: `That ${field} is already taken` });
    }
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Same message and same status whether the email is unknown or the
    // password is wrong. Distinguishing them turns this route into a tool for
    // discovering which emails have accounts.
    const ok = user && (await bcrypt.compare(password, user.hashedPassword));
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await startSession(req, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Both halves of the session have to go: the document in Mongo and the cookie
 * in the browser. Dropping only the cookie would leave a valid session alive
 * server-side; dropping only the document leaves the browser presenting an id
 * that no longer resolves.
 */
exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
};

/**
 * GET /api/auth/me
 *
 * Who am I? The frontend calls this on load to choose between the logged-in
 * and logged-out UI. A missing session is a normal answer here, not a failure,
 * so this returns 200 with null rather than 401 — the app shell has to render
 * either way, and a 401 would be indistinguishable from a real auth error.
 */
exports.me = async (req, res, next) => {
  try {
    if (!req.session?.userId) return res.json({ user: null });

    const user = await User.findById(req.session.userId);
    if (!user) {
      // The account was deleted while the session outlived it. Clear the stale
      // session rather than reporting a user that no longer exists.
      return req.session.destroy(() => res.json({ user: null }));
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};
