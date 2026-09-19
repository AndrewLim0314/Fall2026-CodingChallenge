===============================================================================
Photo Board Website - Change++ Fall 2026 Coding Challenge
===============================================================================

Name: Andrew Lim
Vanderbilt email: andrew.k.lim@vanderbilt.edu


-------------------------------------------------------------------------------
WHAT IT IS
-------------------------------------------------------------------------------

The Photo Board Website allows users to browse and save photos they like to boards that they can
search up later. Users can create their own boards, public or private visibility, and can invite 
collaborators on it. There is a page with a feed of photos populated by the Pixabay API, 
each with its own tags. When users save these photos, they can go to the search bar and look up 
by tag, which will show all photos saved with the tags.


-------------------------------------------------------------------------------
REQUIREMENTS
-------------------------------------------------------------------------------

  - Node.js 20 or newer          (node --version)
  - npm                          (ships with Node)
  - A MongoDB database           MongoDB Atlas free tier is fine
  - A Pixabay API key            free at https://pixabay.com/api/docs/

The website runs as two servers at once: the API on port 5001 and the frontend on
port 5173.


-------------------------------------------------------------------------------
SETUP
-------------------------------------------------------------------------------

1. Clone the repository and enter it:

       git clone https://github.com/AndrewLim0314/Fall2026-CodingChallenge.git
       cd Fall2026-CodingChallenge

2. Install backend dependencies:

       cd server
       npm install

3. Create a file named ".env" inside the server/ folder with these three keys:

       MONGO_URI=<your MongoDB connection string>
       SESSION_SECRET=<any long random string>
       PIXABAY_API_KEY=<your Pixabay API key>

   Notes:
     - The server refuses to start if MONGO_URI or SESSION_SECRET is missing.
     - .env is gitignored and is never committed.
     - If you use MongoDB Atlas, add your current IP address to the project's
       Network Access allowlist, or every database request will fail.

4. Install frontend dependencies:

       cd ../photo_app
       npm install


-------------------------------------------------------------------------------
RUNNING IT
-------------------------------------------------------------------------------

Open two terminal windows.

  Terminal 1 - the API:

       cd server
       npm run dev

    Wait for:  listening on http://localhost:5001/api/hello

    NOTE: the very first start after "npm install" can take a few minutes
    before that line appears, because Node is scanning dependency files for
    the first time. It is not frozen. Later starts take under a second.

  Terminal 2 - the frontend:

       cd photo_app
       npm run dev

    Wait for:  Local: http://localhost:5173/

Then open http://localhost:5173 in a browser and register an account.

The frontend proxies every /api request to port 5001, so you only ever visit
port 5173 directly.

-------------------------------------------------------------------------------
REFLECTION
-------------------------------------------------------------------------------

It was my first time using the MERN tech stack,  so I got to learn how to use mongoose to write schemas, connect Mongo Atlas for cloud-based storage, and other techniques.
I have experience in full-stack development, so I reinforced my CRUD knowledge.
The main issue I ran into was trying to learn the MERN tech stack. I didn’t run into many coding issues because I used AI coding assistants, and this is a relatively simple job for current models. However, trying to understand the logic and make choices was difficult.

-------------------------------------------------------------------------------
FEEDBACK ON THE CHALLENGE
-------------------------------------------------------------------------------

I think it would help to make the workshops more concept-based. I would have liked
to have an educational workshop that teaches us the basic tech stack, rather than
how to get the project started.