const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Import CORS middleware

const app = express();
const server = http.createServer(app);

// In-memory high score storage (for simplicity; replace with database for persistence)
let highScores = [
    { name: "Player1", score: 1000 },
    { name: "Player2", score: 800 },
    { name: "Player3", score: 600 }
];

// Configure CORS for Express (for the High Score API)
// IMPORTANT: Update 'origin' with your actual frontend GitHub Pages URL later!
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'https://broofnotascammer.github.io/Maingame/', // Use env variable or allow all for testing
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json()); // For parsing JSON request bodies

// Configure Socket.IO with CORS settings
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*', // Use env variable or allow all for testing
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 10000;

// --- High Score API Endpoints ---

// GET /api/highscores - Get all high scores
app.get('/api/highscores', (req, res) => {
    // Sort scores in descending order before sending
    const sortedScores = [...highScores].sort((a, b) => b.score - a.score);
    res.json(sortedScores);
});

// POST /api/highscores - Submit a new high score
app.post('/api/highscores', (req, res) => {
    const { name, score } = req.body;
    if (typeof name !== 'string' || typeof score !== 'number' || score < 0) {
        return res.status(400).json({ message: 'Invalid high score data. Name must be string, score must be non-negative number.' });
    }

    const newScore = { name, score };
    highScores.push(newScore);

    // Keep only top 10 scores (optional, for simple in-memory storage)
    highScores = highScores.sort((a, b) => b.score - a.score).slice(0, 10);

    // Optionally, broadcast an update to all connected clients that high scores have changed
    io.emit('highScoresUpdated', highScores);

    res.status(201).json({ message: 'High score submitted successfully!', score: newScore });
    console.log(`New high score submitted: ${name} - ${score}`);
});


// --- Socket.IO Game Logic ---
// In a more complex game, you'd manage rooms, game state, authoritative logic here.
// For this basic demo, we'll just relay player and car positions.

const players = {}; // Keep track of connected players and their states

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Initialize new player's state
    players[socket.id] = {
        x: 250, // Default starting position, adjust as needed
        y: 550,
        id: socket.id,
        score: 0,
        // Add other player properties if needed (e.g., color, name)
    };

    // Send current players data to the newly connected client
    socket.emit('currentPlayers', players);
    // Notify other players about the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);


    // Listen for player movement updates from clients
    socket.on('playerMoved', (playerData) => {
        if (players[socket.id]) {
            players[socket.id].x = playerData.x;
            players[socket.id].y = playerData.y;
            // Broadcast player movement to all other clients
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Listen for car updates (e.g., when a car is spawned by one client, tell others)
    // IMPORTANT: In a real game, car spawning/movement should be server-authoritative
    // or handled consistently by all clients based on a seed. For this demo,
    // we'll let one client (the spawner) tell others about a new car.
    socket.on('carSpawned', (carData) => {
        socket.broadcast.emit('carSpawned', carData);
    });

    // Listen for game state updates (e.g., score changes, game over)
    socket.on('gameUpdate', (update) => {
        // This is a generic update. You might send player scores, car states etc.
        // For a basic demo, we'll just echo it.
        io.emit('gameUpdate', update); // Emit to all including sender if needed
    });

    // Listen for client disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete players[socket.id];
        // Notify other players about the disconnected player
        io.emit('playerDisconnected', socket.id);
    });
});


// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Dodge Cars backend running on http://0.0.0.0:${PORT}`);
});
