const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const { MongoStore } = require('connect-mongo')
const connectDB = require('./config/db')
const authController = require('./controllers/authController')
const requireAuth = require('./middleware/requireAuth')

for (const key of ['MONGO_URI', 'SESSION_SECRET']) {
    if (!process.env[key]) {
        console.error(`Missing ${key}. Add it to server/.env`)
        process.exit(1)
    }
}

connectDB()

const app = express()
const port = process.env.PORT || 5001

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}))
app.use(express.json())

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
    }),
    cookie: {
        // No maxAge on purpose: that makes this a SESSION cookie, which the
        // browser discards when it closes. Nothing identifying the user is left
        // on the device between visits, so every new browser session starts
        // logged out. (A maxAge here would write the cookie to disk instead.)
        httpOnly: true,  // JS can't read it, so an XSS bug can't lift the session
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
    // The server-side half of the same decision. connect-mongo normally derives
    // its TTL from cookie.maxAge; with no maxAge it falls back to a 14-day
    // default, which would leave session documents in Mongo long after the
    // cookies that referenced them were gone.
    ttl: 60 * 60 * 24, // seconds
}))


// Smoke-test route: confirms the frontend can reach the API through CORS.
app.get('/api/hello', (req, res) => {
    res.json({ message: 'hi' })
})

/**
 * ---------------------------------------------------------------------------
 * ROUTE SCAFFOLD
 *
 * Every endpoint the app needs, stubbed out so the whole API surface is
 * visible in one place. Each group is headed by the controller it will move
 * into once the shape settles; the goal of listing them together first is to
 * see which routes share a prefix, a model, and a permission check.
 *
 * Handlers are intentionally empty — hitting any of these returns 501.
 * ---------------------------------------------------------------------------
 */

// Placeholder handler. Lets a route exist and answer predictably before it
// does anything, so the frontend can be wired against the real URLs early.
const notImplemented = (req, res) => {
    res.status(501).json({ error: 'Not implemented yet' })
}

/* --- Auth ---------------------------------------------- authController.js --
 * First group to implement for real: every route below needs to know who is
 * asking, and that identity comes from the session these routes establish.
 */
app.post('/api/auth/register', authController.register)
app.post('/api/auth/login', authController.login)
// requireAuth on logout so logging out while already logged out is a 401 rather
// than a silent 204 that implies a session was ended.
app.post('/api/auth/logout', requireAuth, authController.logout)
app.get('/api/auth/me', authController.me)         // current session's user, or null

/* --- Boards ------------------------------------------- boardController.js --
 * NOTE ON ORDER: Express matches routes in registration order, first match
 * wins. '/api/boards/discover' MUST stay above '/api/boards/:id', or ':id'
 * captures the literal string "discover" and Mongoose throws trying to cast it
 * to an ObjectId. Same rule for any other fixed path under /api/boards.
 */
app.get('/api/boards/discover', notImplemented)    // public boards feed
app.post('/api/boards', notImplemented)            // create (name only; tags fill in later)
app.get('/api/boards/:id', notImplemented)
app.patch('/api/boards/:id', notImplemented)       // owner only: rename, toggle isPublic
app.delete('/api/boards/:id', notImplemented)      // owner only; also clears its BoardPhoto links

// Share link. A separate path from /api/boards/:id because holding the slug is
// its own route to viewing — it works even when the board is private.
app.get('/api/b/:shareSlug', notImplemented)

/* --- Board contents ----------------------------- boardPhotoController.js --
 * Operates on the BoardPhoto join, not on Photo itself. Removing a photo here
 * deletes the link and leaves the canonical Photo alone, since other boards
 * may still reference it. Writes require owner-or-collaborator.
 */
app.get('/api/boards/:id/photos', notImplemented)  // ?sort=asc|desc on addedAt
app.post('/api/boards/:id/photos', notImplemented) // upsert Photo, create link, resync board tags
app.delete('/api/boards/:id/photos/:photoId', notImplemented)  // delete link, resync board tags

/* --- Bookmarks & profile ------------------------------ boardController.js --
 * Saving someone else's board is a bookmark, not a copy: it pushes an id onto
 * User.savedBoards. May end up folded into the board controller rather than
 * standing alone.
 */
app.post('/api/boards/:id/save', notImplemented)
app.delete('/api/boards/:id/save', notImplemented)
app.get('/api/me/boards', notImplemented)          // the 3 profile sections: owned / saved / collaborating

/* --- Collaboration ----------------------------- collaboratorController.js --
 * inviteToken is deliberately separate from shareSlug so that sharing a board
 * to be seen never hands out edit rights. Permissions are flat: any
 * collaborator can edit anything on the board.
 */
app.post('/api/boards/:id/invite', notImplemented)            // owner: generate or rotate the token
app.post('/api/invite/:inviteToken', notImplemented)          // accept: become a collaborator
app.delete('/api/boards/:id/collaborators/:userId', notImplemented)  // owner: revoke access

/* --- Search & Discover ------------------------------- searchController.js --
 * The Pixabay key stays server-side, so the random feed goes through our own
 * proxy rather than being called from the browser.
 */
app.get('/api/photos/search', notImplemented)      // ?tags=sunset,beach&sort= — visible boards only
app.get('/api/discover', notImplemented)           // Pixabay proxy; filters out the user's saved images

app.listen(port, ()=>{
    console.log(`listening on http://localhost:${port}/api/hello`)
})
