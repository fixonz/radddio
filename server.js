const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;

console.log('🏁 Starting FREq Server...');

// Simple JSON-based database for users and frequencies
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize DB with defaults if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify({
            users: [],
            frequencies: {},
            globalStats: {
                topSongs: {}
            }
        }, null, 2));
        console.log('📦 Database initialized');
    } catch (err) {
        console.error('❌ Database initialization failed:', err);
    }
}

function readDB() {
    const defaults = { users: [], frequencies: {}, globalStats: { topSongs: {} } };
    try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        return { ...defaults, ...JSON.parse(content || '{}') };
    } catch (err) {
        console.error('❌ Database read failed, resetting to defaults:', err);
        return defaults;
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Database write failed:', err);
    }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory state for active connections
const activeFrequencies = new Map();

function getFrequencyState(slug) {
    if (!activeFrequencies.has(slug)) {
        const db = readDB();
        const freqData = db.frequencies[slug] || {};

        // Define robust default state
        const state = {
            playbackState: freqData.playbackState || {
                isPlaying: false,
                currentTime: 0,
                videoId: null,
                startedAt: null,
                title: null,
                thumbnail: null
            },
            playlist: freqData.playlist || [],
            chatHistory: freqData.chatHistory || [],
            owner: freqData.owner || null,
            pinnedMessage: freqData.pinnedMessage || null,
            users: new Map()
        };

        activeFrequencies.set(slug, state);
    }
    return activeFrequencies.get(slug);
}

function getCurrentPlaybackTime(playbackState) {
    if (!playbackState.isPlaying || !playbackState.startedAt) return playbackState.currentTime || 0;
    return playbackState.currentTime + (Date.now() - playbackState.startedAt) / 1000;
}

function persistFrequencyState(slug) {
    const state = activeFrequencies.get(slug);
    if (!state) return;

    const db = readDB();
    db.frequencies[slug] = {
        playbackState: state.playbackState,
        playlist: state.playlist.slice(-50), // Keep last 50 tracks
        chatHistory: state.chatHistory.slice(-50), // Keep last 50 messages
        owner: state.owner,
        pinnedMessage: state.pinnedMessage
    };
    writeDB(db);
}

// Auth Routes
app.post('/api/register', (req, res) => {
    const { username, password, avatar } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const db = readDB();
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.users.push({ username, password: hashedPassword, avatar: avatar || 'zap' });
    writeDB(db);
    res.json({ success: true, username, avatar: avatar || 'zap' });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ success: true, username: user.username, avatar: user.avatar });
});

// Discovery API
app.get('/api/discovery', (req, res) => {
    const db = readDB();
    const active = Array.from(activeFrequencies.entries()).map(([slug, state]) => ({
        slug,
        listeners: state.users.size,
        currentSong: state.playbackState.title,
        owner: state.owner
    }));

    const topSongs = Object.entries(db.globalStats?.topSongs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([id, data]) => ({ id, ...data }));

    res.json({ active, topSongs });
});

// Socket.io logic
io.on('connection', (socket) => {
    let currentSlug = null;

    socket.on('join-frequency', (data) => {
        const { slug, user } = data;
        currentSlug = slug;
        socket.join(slug);

        const state = getFrequencyState(slug);

        // Ownership Logic: Only the user whose username matches the slug is the Host
        const isHost = (user.username.toLowerCase() === slug.toLowerCase());
        const activeUser = { ...user, id: socket.id, isHost: isHost };
        state.users.set(socket.id, activeUser);

        socket.emit('initial-state', {
            users: Array.from(state.users.values()),
            isHost: isHost,
            playbackState: {
                ...state.playbackState,
                currentTime: getCurrentPlaybackTime(state.playbackState)
            },
            playlist: state.playlist,
            chatHistory: state.chatHistory.slice(-50)
        });

        io.to(slug).emit('user-list-update', Array.from(state.users.values()));
    });

    socket.on('user-update', (userData) => {
        if (!currentSlug) return;
        const state = getFrequencyState(currentSlug);
        state.users.set(socket.id, { ...state.users.get(socket.id), ...userData });
        io.to(currentSlug).emit('user-list-update', Array.from(state.users.values()));
    });

    socket.on('play-song', (data) => {
        if (!currentSlug) return;
        const state = getFrequencyState(currentSlug);
        const user = state.users.get(socket.id);

        if (!user || !user.isHost) return; // Only Host can play

        // Basic ownership check (to be refined)
        // For now, if no owner, first one to play becomes owner? Or we check if registered.
        state.playbackState = {
            isPlaying: true,
            currentTime: 0,
            videoId: data.videoId,
            startedAt: Date.now(),
            title: data.title,
            thumbnail: data.thumbnail
        };
        state.playlist.push({ ...data, playedAt: Date.now(), playedBy: user.username });

        io.to(currentSlug).emit('play-song', state.playbackState);
        persistFrequencyState(currentSlug);

        // Track Global Top Songs
        const db = readDB();
        if (!db.globalStats) db.globalStats = { topSongs: {} };
        const videoId = data.videoId;
        if (!db.globalStats.topSongs[videoId]) {
            db.globalStats.topSongs[videoId] = { title: data.title, count: 0 };
        }
        db.globalStats.topSongs[videoId].count += 1;
        writeDB(db);
    });

    socket.on('toggle-playback', (data) => {
        if (!currentSlug) return;
        const state = getFrequencyState(currentSlug);
        state.playbackState.isPlaying = data.isPlaying;
        state.playbackState.currentTime = data.currentTime;
        state.playbackState.startedAt = data.isPlaying ? (Date.now() - (data.currentTime * 1000)) : null;
        io.to(currentSlug).emit('playback-state-change', state.playbackState);
        persistFrequencyState(currentSlug);
    });

    socket.on('seek', (data) => {
        if (!currentSlug) return;
        const state = getFrequencyState(currentSlug);
        state.playbackState.currentTime = data.time;
        if (state.playbackState.isPlaying) state.playbackState.startedAt = Date.now() - (data.time * 1000);
        io.to(currentSlug).emit('seek', { time: data.time });
    });

    socket.on('chat-message', (message) => {
        if (!currentSlug) return;
        const state = getFrequencyState(currentSlug);
        const user = state.users.get(socket.id);
        if (!user) return;

        const msg = {
            type: 'user',
            userId: socket.id,
            username: user.username,
            avatar: user.avatar,
            message,
            timestamp: Date.now()
        };
        state.chatHistory.push(msg);
        if (state.chatHistory.length > 100) state.chatHistory = state.chatHistory.slice(-100);
        io.to(currentSlug).emit('chat-message', msg);
        persistFrequencyState(currentSlug);
    });

    socket.on('pin-message', (message) => {
        if (!currentSlug) return;
        const state = getFrequencyState(currentSlug);
        state.pinnedMessage = message;
        io.to(currentSlug).emit('pinned-update', message);

        // Persist to DB
        const db = readDB();
        if (!db.frequencies[currentSlug]) db.frequencies[currentSlug] = {};
        db.frequencies[currentSlug].pinnedMessage = message;
        writeDB(db);
    });

    socket.on('toggle-song-pin', (data) => {
        if (!currentSlug) return;
        const state = getFrequencyState(currentSlug);

        state.playlist = state.playlist.map(song => {
            if (song.videoId === data.videoId) {
                return { ...song, isPinned: !song.isPinned };
            }
            return song;
        });

        io.to(currentSlug).emit('playlist-update', state.playlist);
        persistFrequencyState(currentSlug);
    });

    socket.on('reaction', (emoji) => {
        if (!currentSlug) return;
        io.to(currentSlug).emit('reaction', emoji);
    });

    socket.on('disconnect', () => {
        if (!currentSlug) return;
        const state = getFrequencyState(currentSlug);
        state.users.delete(socket.id);
        io.to(currentSlug).emit('user-list-update', Array.from(state.users.values()));
    });
});

// Serve frontend and handle SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

http.listen(PORT, '0.0.0.0', () => console.log(`⚡ FREq running on port ${PORT}`));
