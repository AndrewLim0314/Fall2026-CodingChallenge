const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const { MongoStore } = require('connect-mongo')
const connectDB = require('./config/db')

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
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
}))


app.get('/apihello', (req, res) => {
    res.json({message: 'hi'})
})

app.listen(port, ()=>{
    console.log(`listening on port ${port}`)
})
