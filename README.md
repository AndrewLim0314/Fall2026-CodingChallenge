<h1 align="center">Photo_Sharing_Website</h1>

<p align="center">
  <strong>Andrew Lim</strong><br>
  <a href="mailto:andrew.k.lim@vanderbilt.edu">andrew.k.lim@vanderbilt.edu</a><br>
  <sub>Change++ Fall 2026 Coding Challenge</sub>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-20-5FA04E?logo=nodedotjs&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white">
</p>

---

This challenge uses a MERN stack to create a photo sharing website that allows users to browse and store photos on boards that allows them to look them up later, similar to Pinterest.

---

## Tech Stack

### Frontend

The frontend is ran on Vite, with the website written using React.js.

### Backend

The backend uses Express and runs on Node.js. It defines basic CRUD logic for a board, photo board, and photo.

### Database

I used MongoDB for my database. I also used Mongo Atlas to store it on a cloud, rather than locally.

---

## How to Download and Run

> The app is **two servers that run at the same time**: the backend API on port `5001`, and the frontend on port `5173`. Both need to be running for the site to work.

### Before you start

| You will need | Notes |
| --- | --- |
| **Node.js 20+** | check with `node --version` |
| **npm** | comes with Node |
| **A MongoDB connection string** | I used the MongoDB Atlas free tier |
| **A Pixabay API key** | free at [pixabay.com/api/docs](https://pixabay.com/api/docs/) |

### 1. Download the code

```bash
git clone https://github.com/AndrewLim0314/Fall2026-CodingChallenge.git
cd Fall2026-CodingChallenge
```

### 2. Install the backend and create its config file

```bash
cd server
npm install
```

Then make a file named `.env` inside the `server` folder containing these three lines, with your own values:

```ini
MONGO_URI=your MongoDB connection string
SESSION_SECRET=any long random string
PIXABAY_API_KEY=your Pixabay API key
```

> ⚠️ The server will refuse to start if `MONGO_URI` or `SESSION_SECRET` is missing. The `.env` file is gitignored, so it is not in this repository. If you are using Atlas, **also add your IP address to the project's Network Access list**, or every database request will fail.

### 3. Install the frontend

```bash
cd ../photo_app
npm install
```

### 4. Start the backend — leave this terminal running

```bash
cd server
npm run dev
```

Wait until it prints:

```
listening on http://localhost:5001/api/hello
```

> 🕐 The very first start after `npm install` can take a few minutes before that line appears, because Node is scanning the dependency files for the first time. **It is not frozen.** Every start after that takes about a second.

### 5. Open a second terminal and start the frontend — leave this one running too

```bash
cd photo_app
npm run dev
```

Wait until it prints:

```
Local: http://localhost:5173/
```

### 6. Open the site

Go to **[http://localhost:5173](http://localhost:5173)** in a browser and register an account. Only visit port `5173` directly; the frontend forwards its `/api` requests to port `5001` for you.

---

## Using the Site

| Page | What it does |
| --- | --- |
| **Feed** | Photos from Pixabay that you can save to a board |
| **Boards** | Create boards and manage them |
| **Discover** | Other people's public boards |
| **Search** | Find saved photos by tag |

---

## Challenge Reflection

It was my first time using the MERN tech stack,  so I got to learn how to use mongoose to write schemas, connect Mongo Atlas for cloud-based storage, and other techniques.

I have experience in full-stack development, so I reinforced my CRUD knowledge.

The main issue I ran into was trying to learn the MERN tech stack. I didn't run into many coding issues because I used AI coding assistants, and this is a relatively simple job for current models. However, trying to understand the logic and make choices was difficult.
