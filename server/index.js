const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const { MongoStore } = require('connect-mongo')
const connectDB = require('./config/db')
const authController = require('./controllers/authController')
const boardController = require('./controllers/boardController')
const boardPhotoController = require('./controllers/boardPhotoController')
const searchController = require('./controllers/searchController')
const collaboratorController = require('./controllers/collaboratorController')
const requireAuth = require('./middleware/requireAuth')
const loadBoard = require('./middleware/loadBoard')

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
 * ROUTES
 *
 * The whole API surface in one place, grouped by the controller that serves it.
 * Keeping the table together makes it obvious which routes share a prefix, a
 * model, and a permission check — the three things that have to agree.
 * ---------------------------------------------------------------------------
 */

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
app.get('/api/boards/discover', boardController.discover)    // public boards feed
app.post('/api/boards', requireAuth, boardController.create)
app.get('/api/boards/:id', loadBoard('view'), boardController.show)
app.patch('/api/boards/:id', requireAuth, loadBoard('own'), boardController.update)
app.delete('/api/boards/:id', requireAuth, loadBoard('own'), boardController.remove)

// Share link. A separate path from /api/boards/:id because holding the slug is
// its own route to viewing — it works even when the board is private.
app.get('/api/b/:shareSlug', boardController.showBySlug)
// The board's contents by slug too. /api/boards/:id/photos authorizes by board
// id via loadBoard, which knows nothing about slugs — so a private board opened
// by share link would render empty without this.
app.get('/api/b/:shareSlug/photos', boardPhotoController.listBySlug)

/* --- Board contents ----------------------------- boardPhotoController.js --
 * Operates on the BoardPhoto join, not on Photo itself. Removing a photo here
 * deletes the link and leaves the canonical Photo alone, since other boards
 * may still reference it. Writes require owner-or-collaborator.
 */
app.get('/api/boards/:id/photos', loadBoard('view'), boardPhotoController.list)  // ?sort=asc|desc
app.post('/api/boards/:id/photos', requireAuth, loadBoard('edit'), boardPhotoController.add)
app.delete('/api/boards/:id/photos/:photoId', requireAuth, loadBoard('edit'), boardPhotoController.remove)
app.patch('/api/boards/:id/photos/:photoId', requireAuth, loadBoard('edit'), boardPhotoController.setTags)

/* --- Bookmarks & profile ------------------------------ boardController.js --
 * Saving someone else's board is a bookmark, not a copy: it pushes an id onto
 * User.savedBoards. May end up folded into the board controller rather than
 * standing alone.
 */
app.post('/api/boards/:id/save', requireAuth, loadBoard('view'), boardController.save)
app.delete('/api/boards/:id/save', requireAuth, loadBoard('view'), boardController.unsave)
app.get('/api/me/boards', requireAuth, boardController.myBoards)   // owned / saved / collaborating

/* --- Collaboration ----------------------------- collaboratorController.js --
 * inviteToken is deliberately separate from shareSlug so that sharing a board
 * to be seen never hands out edit rights. Permissions are flat: any
 * collaborator can edit anything on the board.
 */
app.get('/api/boards/:id/collaborators', requireAuth, loadBoard('own'), collaboratorController.list)
app.post('/api/boards/:id/invite', requireAuth, loadBoard('own'), collaboratorController.invite)
app.post('/api/invite/:inviteToken', requireAuth, collaboratorController.accept)
app.delete('/api/boards/:id/collaborators/:userId', requireAuth, loadBoard('own'), collaboratorController.revoke)

/* --- Search & Discover ------------------------------- searchController.js --
 * The Pixabay key stays server-side, so the random feed goes through our own
 * proxy rather than being called from the browser.
 */
app.get('/api/photos/search', searchController.searchPhotos)  // ?tags=sunset,beach&sort=
app.get('/api/discover', searchController.discoverPhotos)     // Pixabay proxy; hides saved images

// Nothing matched. Express would send an HTML page here, and every other
// response in this API is JSON — a typo'd URL shouldn't break the client's parse.
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' })
})

/**
 * ---------------------------------------------------------------------------
 * ERROR HANDLER
 *
 * Must be registered LAST — Express only hands an error to middleware declared
 * after the route that produced it.
 *
 * The four-argument signature is what marks this as an error handler rather
 * than an ordinary one; Express dispatches on arity, so dropping the unused
 * `next` would silently turn this back into a normal middleware that never runs.
 * ---------------------------------------------------------------------------
 */
app.use((err, req, res, next) => {
    // Something already started writing the response, so the status and headers
    // are locked in. Only Express's default handler can close out a half-sent
    // response; trying to send our own JSON here would throw a second error.
    if (res.headersSent) return next(err)

    // A malformed ObjectId in the URL is a bad request, not a server fault —
    // it means the client asked for an id that could never exist.
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Malformed id' })
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message })
    }

    // Unique-index violation. Routes that can say something specific about
    // WHICH constraint broke (register, for one) handle 11000 themselves; this
    // is the generic fallback for the rest.
    if (err.code === 11000) {
        return res.status(409).json({ error: 'Already exists' })
    }

    // Log the real error server-side, return a generic one to the client. The
    // default Express handler would send the stack trace — including absolute
    // file paths — straight to the browser.
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
})

app.listen(port, ()=>{
    console.log(`listening on http://localhost:${port}/api/hello`)
})
