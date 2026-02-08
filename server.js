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

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

let users = new Map();
let playbackState = {
    isPlaying: false,
    currentTime: 0,
    videoId: null,
    startedAt: null,
    title: null,
    thumbnail: null
};
let playlist = [];
let chatHistory = [];

function getCurrentPlaybackTime() {
    if (!playbackState.isPlaying || !playbackState.startedAt) return playbackState.currentTime;
    return playbackState.currentTime + (Date.now() - playbackState.startedAt) / 1000;
}

io.on('connection', (socket) => {
    socket.emit('initial-state', {
        users: Array.from(users.values()),
        playbackState: { ...playbackState, currentTime: getCurrentPlaybackTime() },
        playlist,
        chatHistory: chatHistory.slice(-50)
    });

    socket.on('user-join', (userData) => {
        users.set(socket.id, { ...userData, id: socket.id });
        io.emit('user-list-update', Array.from(users.values()));
        const msg = { type: 'system', message: `${userData.username} joined`, timestamp: Date.now() };
        chatHistory.push(msg);
        io.emit('chat-message', msg);
    });

    socket.on('play-song', (data) => {
        const user = users.get(socket.id);
        if (!user || !user.isDJ) return;
        playbackState = { isPlaying: true, currentTime: 0, videoId: data.videoId, startedAt: Date.now(), title: data.title, thumbnail: data.thumbnail };
        playlist.push({ ...data, playedAt: Date.now(), playedBy: user.username });
        io.emit('play-song', playbackState);
    });

    socket.on('toggle-playback', (data) => {
        const user = users.get(socket.id);
        if (!user || !user.isDJ) return;
        playbackState.isPlaying = data.isPlaying;
        playbackState.currentTime = data.currentTime;
        playbackState.startedAt = data.isPlaying ? (Date.now() - (data.currentTime * 1000)) : null;
        io.emit('playback-state-change', playbackState);
    });

    socket.on('seek', (data) => {
        const user = users.get(socket.id);
        if (!user || !user.isDJ) return;
        playbackState.currentTime = data.time;
        if (playbackState.isPlaying) playbackState.startedAt = Date.now() - (data.time * 1000);
        io.emit('seek', { time: data.time });
    });

    socket.on('chat-message', (message) => {
        const user = users.get(socket.id);
        if (!user) return;
        const msg = { type: 'user', userId: socket.id, username: user.username, avatar: user.avatar, message, timestamp: Date.now() };
        chatHistory.push(msg);
        if (chatHistory.length > 100) chatHistory = chatHistory.slice(-100);
        io.emit('chat-message', msg);
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const msg = { type: 'system', message: `${user.username} left`, timestamp: Date.now() };
            chatHistory.push(msg);
            io.emit('chat-message', msg);
        }
        users.delete(socket.id);
        io.emit('user-list-update', Array.from(users.values()));
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

http.listen(PORT, () => console.log(`🎵 Radddio running on port ${PORT}`));
