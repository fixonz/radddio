// Socket.IO connection
const socket = io();

// Project Branding
const BRAND_NAME = 'FREq';

// App State
let currentUser = {
    username: '',
    avatar: 'zap',
    isHost: false,
    token: null
};

let currentFreq = {
    slug: 'global',
    isOwner: false
};

let authMode = 'guest'; // 'guest', 'register', 'login'

// YouTube Player
let player;
let isPlayerReady = false;
let currentVideoId = null;

// Equalizer animation
let equalizerInterval = null;

// Playlist State
let isPlaylistExpanded = false;
let fullPlaylist = [];

// Avatar options
const avatarOptions = [
    'zap', 'flame', 'sparkles', 'smile', 'glasses',
    'music', 'headset', 'disc', 'radio', 'mic-2',
    'heart', 'star', 'crown', 'ghost', 'cat'
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkLocalSession();
    parseRoute();
    initializeProfileModal();
    setupEventListeners();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

function checkLocalSession() {
    const saved = localStorage.getItem('freq_user');
    if (saved) {
        try {
            const user = JSON.parse(saved);
            currentUser.username = user.username;
            currentUser.avatar = user.avatar;
            currentUser.isHost = false;

            // Show logout button if logged in
            const logoutBtn = document.getElementById('logoutButton');
            if (logoutBtn) logoutBtn.style.display = 'block';
        } catch (e) {
            localStorage.removeItem('freq_user');
        }
    }
}

function parseRoute() {
    const path = window.location.pathname;
    const match = path.match(/^\/f\/([^/]+)/);

    if (match) {
        currentFreq.slug = match[1];
        showAppView('freq');
    } else {
        showAppView('home');
    }
}

function showAppView(view) {
    const home = document.getElementById('home');
    const app = document.getElementById('app');
    const modal = document.getElementById('profileModal');

    if (view === 'home') {
        home.style.display = 'flex';
        app.style.display = 'none';
        modal.style.display = 'none';
        loadDiscoveryData();
    } else {
        home.style.display = 'none';
        // Auto-join guest if no session
        if (!currentUser.username) {
            autoGuestJoin();
        } else {
            app.style.display = 'flex';
        }
    }
}

async function loadDiscoveryData() {
    try {
        const res = await fetch('/api/discovery');
        const data = await res.json();
        renderDiscovery(data);
    } catch (err) {
        console.error('Discovery failed', err);
    }
}

// Auth Mode Toggle
window.setAuthMode = (mode) => {
    authMode = mode;
    const passwordGroup = document.getElementById('passwordGroup');
    const avatarSection = document.getElementById('avatarSection');
    const guestDjToggle = document.getElementById('guestDjToggle');
    const joinBtn = document.getElementById('joinButton');
    const subtext = document.getElementById('modalSubtext');

    // Reset tabs
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tab' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');

    if (mode === 'guest') {
        passwordGroup.style.display = 'none';
        avatarSection.style.display = 'block';
        guestDjToggle.style.display = 'block';
        joinBtn.textContent = 'Join FREQ';
        subtext.textContent = 'Sync your FREQ with others in real-time';
    } else if (mode === 'register') {
        passwordGroup.style.display = 'block';
        avatarSection.style.display = 'block';
        guestDjToggle.style.display = 'none';
        joinBtn.textContent = 'Create Identity';
        subtext.textContent = 'Claim your permanent frequency handle';
    } else {
        passwordGroup.style.display = 'block';
        avatarSection.style.display = 'none';
        guestDjToggle.style.display = 'none';
        joinBtn.textContent = 'Sign In';
        subtext.textContent = 'Welcome back to the FREQ';
    }
};

// Initialize YouTube Player API
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            showinfo: 0
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
        }
    });
}

function onPlayerReady(event) {
    isPlayerReady = true;
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) player.setVolume(volumeSlider.value);
}

function onPlayerStateChange(event) {
    const albumArt = document.getElementById('albumArtCircle');

    if (event.data === YT.PlayerState.PLAYING) {
        if (albumArt) albumArt.classList.remove('paused');
        startFreqSync();
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        if (albumArt) albumArt.classList.add('paused');
        stopFreqSync();
    }

    if (currentUser.isHost) {
        const isPlaying = event.data === YT.PlayerState.PLAYING;
        socket.emit('toggle-playback', {
            isPlaying: isPlaying,
            currentTime: player.getCurrentTime()
        });
    }
}

function onPlayerError(event) {
    console.error('📺 YouTube Player Error:', event.data);
    const errorMessages = {
        2: 'Invalid video ID',
        100: 'Video not found or private',
        101: 'Embed blocked by owner',
        150: 'Embed blocked by owner'
    };
    const msg = errorMessages[event.data] || 'Unknown playback error';
    console.warn(`⚠️ FREQ Warning: ${msg}`);
}

function initializeProfileModal() {
    const avatarGrid = document.getElementById('avatarGrid');
    if (!avatarGrid) return;

    avatarGrid.innerHTML = '';
    avatarOptions.forEach((iconName, index) => {
        const avatarOption = document.createElement('div');
        avatarOption.className = 'avatar-option';
        avatarOption.innerHTML = `<i data-lucide="${iconName}"></i>`;
        avatarOption.dataset.avatar = iconName;

        if (index === 0) {
            avatarOption.classList.add('selected');
            currentUser.avatar = iconName;
        }

        avatarOption.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
            avatarOption.classList.add('selected');
            currentUser.avatar = iconName;
        });

        avatarGrid.appendChild(avatarOption);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Random Guest Name
    const randomFreqs = ['Flow', 'Echo', 'Neon', 'Static', 'Drift', 'Pulse', 'Wave', 'Void'];
    const randomName = randomFreqs[Math.floor(Math.random() * randomFreqs.length)] + Math.floor(Math.random() * 99);
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) usernameInput.value = randomName;
}

function autoGuestJoin() {
    const randomFreqs = ['Flow', 'Echo', 'Neon', 'Static', 'Drift', 'Pulse', 'Wave', 'Void'];
    const randomName = randomFreqs[Math.floor(Math.random() * randomFreqs.length)] + Math.floor(Math.random() * 99);
    completeJoin(randomName, false);
}

function setupEventListeners() {
    const joinButton = document.getElementById('joinButton');
    if (joinButton) joinButton.addEventListener('click', handleAuth);

    const addSongButton = document.getElementById('addSongButton');
    if (addSongButton) addSongButton.addEventListener('click', addSong);

    const albumArt = document.getElementById('albumArtCircle');
    if (albumArt) albumArt.addEventListener('click', localTogglePlayback);

    const visualizerButton = document.getElementById('visualizerButton');
    if (visualizerButton) visualizerButton.addEventListener('click', toggleVisualizer);

    const closeVisualizer = document.getElementById('closeVisualizer');
    if (closeVisualizer) closeVisualizer.addEventListener('click', toggleVisualizer);

    const togglePlaylist = document.getElementById('togglePlaylist');
    if (togglePlaylist) {
        togglePlaylist.addEventListener('click', () => {
            isPlaylistExpanded = !isPlaylistExpanded;
            updatePlaylistDisplay(fullPlaylist);
            document.getElementById('playlistToggleText').textContent = isPlaylistExpanded ? 'Show Less' : 'View More';
            const icon = document.getElementById('playlistToggleIcon');
            icon.setAttribute('data-lucide', isPlaylistExpanded ? 'chevron-up' : 'chevron-down');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }

    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value;
            document.getElementById('volumeValue').textContent = volume + '%';
            if (isPlayerReady) player.setVolume(volume);
            updateVolumeIcon(volume);
        });
    }

    const sendMessageButton = document.getElementById('sendMessageButton');
    if (sendMessageButton) sendMessageButton.addEventListener('click', sendMessage);

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Discovery logic
    const startBtn = document.getElementById('startYourFreqBtn');
    if (startBtn) {
        // If logged in, button should take you to YOUR freq
        if (currentUser.username && !currentUser.username.startsWith('Guest')) {
            startBtn.innerHTML = `<i data-lucide="zap"></i> Get on YOUR FREQ`;
            startBtn.addEventListener('click', () => {
                window.location.href = `/f/${currentUser.username.toLowerCase()}`;
            });
        } else {
            startBtn.addEventListener('click', () => {
                const input = document.getElementById('newFreqSlugHome');
                const name = input.value.trim();
                if (name) {
                    window.location.href = `/f/${name.toLowerCase().replace(/\s+/g, '-')}`;
                } else {
                    alert('Enter a name or Register to claim a FREQ');
                }
            });
        }
    }

    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('freq_user');
        window.location.href = '/';
    });

    // Share logic
    const shareBtn = document.getElementById('shareFreqBtn');
    if (shareBtn) shareBtn.addEventListener('click', shareCurrentFreq);
}

async function handleAuth() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!username) return alert('Username required');

    if (authMode === 'guest') {
        const isHost = document.getElementById('djCheckbox').checked;
        completeJoin(username, isHost);
    } else {
        if (!password) return alert('Password required');
        const endpoint = authMode === 'register' ? '/api/register' : '/api/login';

        try {
            const body = { username, password };
            if (authMode === 'register') body.avatar = currentUser.avatar;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.error) return alert(data.error);

            if (data.avatar) currentUser.avatar = data.avatar;

            // Remember across reloads
            localStorage.setItem('freq_user', JSON.stringify({
                username: data.username,
                avatar: currentUser.avatar
            }));

            // Redirect to their unique FREQ
            window.location.href = `/f/${data.username.toLowerCase()}`;
        } catch (err) {
            alert('Auth failed');
        }
    }
}

function completeJoin(username, isHost) {
    currentUser.username = username;
    currentUser.isHost = isHost;

    document.getElementById('profileModal').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) {
        headerAvatar.innerHTML = `<i data-lucide="${currentUser.avatar}"></i>`;
        lucide.createIcons();
    }

    if (currentUser.isHost) {
        document.getElementById('djControls').style.display = 'flex';
        document.getElementById('ownerTools').style.display = 'flex';
    }

    socket.emit('join-frequency', {
        slug: currentFreq.slug,
        user: currentUser
    });

    // Update UI slug display
    const slugDisplay = document.getElementById('currentFreqSlug');
    if (slugDisplay) slugDisplay.textContent = `/${currentFreq.slug}`;
}

// Socket Events
socket.on('initial-state', (state) => {
    updateUserList(state.users);

    // Server tells us if we are the host
    if (state.isHost) {
        currentUser.isHost = true;
        document.getElementById('djControls').style.display = 'flex';
        document.getElementById('ownerTools').style.display = 'flex';
    }

    state.chatHistory.forEach(msg => addChatMessage(msg));
    if (state.playbackState.videoId) loadVideo(state.playbackState);
    if (state.playlist) updatePlaylistDisplay(state.playlist);
});

socket.on('user-list-update', (users) => updateUserList(users));

socket.on('play-song', (songData) => {
    loadVideo(songData);
    updateNowPlaying(songData);
    updateAlbumArt(songData);
    addToPlaylistDisplay(songData);
    startFreqSync();
});

socket.on('playback-state-change', (state) => {
    if (!isPlayerReady) return;
    state.isPlaying ? player.playVideo() : player.pauseVideo();
});

socket.on('seek', (data) => {
    if (isPlayerReady) player.seekTo(data.time, true);
});

socket.on('connect', () => {
    console.log('⚡ Connected to Wavefront');
    if (currentUser.username && currentFreq.slug) {
        socket.emit('join-frequency', {
            slug: currentFreq.slug,
            user: currentUser
        });
    }
});

socket.on('chat-message', (message) => addChatMessage(message));

socket.on('reaction', (emoji) => showReaction(emoji));

// UIs
function updateUserList(users) {
    const userList = document.getElementById('userList');
    if (userList) {
        userList.innerHTML = '';
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-item';
            if (user.isHost) item.classList.add('dj');
            item.innerHTML = `
                <div class="user-avatar"><i data-lucide="${user.avatar || 'user'}"></i></div>
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    ${user.isHost ? '<span class="user-badge">Host</span>' : ''}
                </div>
            `;
            userList.appendChild(item);
        });
        lucide.createIcons();
    }
    document.getElementById('listenerCount').textContent = users.length;
}

function loadVideo(songData) {
    if (!isPlayerReady) return setTimeout(() => loadVideo(songData), 500);

    if (currentVideoId === songData.videoId) {
        if (songData.isPlaying) {
            player.playVideo();
            if (Math.abs(player.getCurrentTime() - songData.currentTime) > 3) {
                player.seekTo(songData.currentTime, true);
            }
        } else {
            player.pauseVideo();
        }
        return;
    }

    currentVideoId = songData.videoId;
    player.loadVideoById({
        videoId: songData.videoId,
        startSeconds: songData.currentTime || 0
    });
    songData.isPlaying ? player.playVideo() : player.pauseVideo();
    updateNowPlaying(songData);
    updateAlbumArt(songData);
}

function updateAlbumArt(songData) {
    document.getElementById('noSongPlaceholder').style.display = 'none';
    const circle = document.getElementById('albumArtCircle');
    circle.style.display = 'block';
    circle.classList.remove('paused');
    document.getElementById('albumArtImage').src = `https://img.youtube.com/vi/${songData.videoId}/maxresdefault.jpg`;

    const vizBg = document.getElementById('vizBackground');
    if (vizBg) vizBg.style.backgroundImage = `url(https://img.youtube.com/vi/${songData.videoId}/maxresdefault.jpg)`;
}

function updateNowPlaying(songData) {
    document.getElementById('songTitle').textContent = songData.title || 'Syncing...';
    document.getElementById('songArtist').textContent = `In FREQ: ${currentFreq.slug}`;
}

function addSong() {
    const input = document.getElementById('youtubeUrlInput');
    const url = input.value.trim();
    if (!url) return;

    const videoId = extractVideoId(url);
    if (!videoId) return alert('Bad Link');

    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then(r => r.json())
        .then(data => {
            socket.emit('play-song', {
                videoId: videoId,
                title: data.title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            });
            input.value = '';
        })
        .catch(() => alert('Could not catch wave'));
}

function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : (url.length === 11 ? url : null);
}

function localTogglePlayback() {
    if (!isPlayerReady) return;
    const isPlaying = player.getPlayerState() === YT.PlayerState.PLAYING;
    if (currentUser.isHost) {
        socket.emit('toggle-playback', { isPlaying: !isPlaying, currentTime: player.getCurrentTime() });
    } else {
        isPlaying ? player.pauseVideo() : player.playVideo();
    }
}

function startFreqSync() {
    if (equalizerInterval) clearInterval(equalizerInterval);
    equalizerInterval = setInterval(() => {
        const energy = Math.random();
        const albumArt = document.getElementById('albumArtCircle');
        const vizBg = document.getElementById('vizBackground');
        const logos = document.querySelectorAll('.logo-icon');

        if (albumArt) {
            const scale = 1.0 + (energy * 0.05);
            const shadow = 30 + (energy * 50);
            albumArt.style.transform = `scale(${scale})`;
            albumArt.style.boxShadow = `0 0 ${shadow}px rgba(168, 85, 247, ${0.4 + energy * 0.4})`;
        }

        if (logos.length > 0) {
            const logoScale = 1.0 + (energy * 0.1);
            logos.forEach(logo => logo.style.transform = `scale(${logoScale})`);
        }

        if (vizBg && energy > 0.85) {
            vizBg.classList.add('glitch');
            setTimeout(() => vizBg.classList.remove('glitch'), 100);
        }
    }, 100);
}

function stopFreqSync() {
    if (equalizerInterval) clearInterval(equalizerInterval);
    const albumArt = document.getElementById('albumArtCircle');
    const logos = document.querySelectorAll('.logo-icon');
    if (albumArt) {
        albumArt.style.transform = 'scale(1)';
        albumArt.style.boxShadow = '0 0 50px rgba(168, 85, 247, 0.4)';
    }
    logos.forEach(logo => logo.style.transform = 'scale(1)');
}

function toggleVisualizer() {
    document.getElementById('visualizerContainer').classList.toggle('active');
}

function updatePlaylistDisplay(playlist) {
    fullPlaylist = playlist;
    const container = document.getElementById('playlistHistory');
    document.getElementById('songCount').textContent = playlist.length;
    if (!container) return;
    if (playlist.length === 0) return container.innerHTML = '<p class="empty-state">No FREQs yet.</p>';

    container.innerHTML = '';
    const limit = isPlaylistExpanded ? 20 : 5;
    [...playlist].reverse().slice(0, limit).forEach(song => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        if (song.isPinned) item.classList.add('pinned-track');
        item.innerHTML = `
            <div class="playlist-info">
                <div class="playlist-title">${song.title}</div>
                <div class="playlist-meta">${song.playedBy} • ${new Date(song.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            ${currentUser.isHost ? `<button class="pin-song-btn ${song.isPinned ? 'active' : ''}" onclick="toggleSongPin('${song.videoId}')"><i data-lucide="star"></i></button>` : ''}
        `;
        container.appendChild(item);
    });
    lucide.createIcons();
}

window.closeAuthModal = () => {
    document.getElementById('profileModal').style.display = 'none';
}

function renderDiscovery(data) {
    const topList = document.getElementById('topSongsList');
    const activeList = document.getElementById('activeFreqsList');
    const isLoggedIn = currentUser.username && !currentUser.username.startsWith('Guest');

    // Update Home Header message
    const homeHeaderP = document.querySelector('.home-header p');
    if (isLoggedIn) {
        homeHeaderP.innerHTML = `Welcome back, <strong>${currentUser.username}</strong>. Your frequency is ready.`;
    }

    topList.innerHTML = data.topSongs.length ? '' : '<p class="empty">No stats yet.</p>';
    data.topSongs.forEach((song, i) => {
        const el = document.createElement('div');
        el.className = 'compact-item';
        el.innerHTML = `
            <span class="rank">#${i + 1}</span>
            <div class="item-info">
                <div class="item-title">${song.title}</div>
                <div class="item-meta">${song.count} plays platform-wide</div>
            </div>
        `;
        topList.appendChild(el);
    });

    activeList.innerHTML = data.active.length ? '' : '<p class="empty">Scanning frequencies...</p>';
    data.active.forEach(freq => {
        const el = document.createElement('div');
        el.className = 'compact-item clickable';
        const isMine = isLoggedIn && freq.slug.toLowerCase() === currentUser.username.toLowerCase();
        el.onclick = () => window.location.href = `/f/${freq.slug}`;
        el.innerHTML = `
            <div class="item-info">
                <div class="item-title">/f/${freq.slug} ${isMine ? '<span class="user-badge">MINE</span>' : ''}</div>
                <div class="item-meta">${freq.listeners} folk • ${freq.currentSong || 'Pure Pulse'}</div>
            </div>
            <i data-lucide="chevron-right"></i>
        `;
        activeList.appendChild(el);
    });
    lucide.createIcons();
}

function addToPlaylistDisplay(song) {
    fullPlaylist.push({ ...song, playedAt: Date.now(), playedBy: song.playedBy || 'Guest' });
    updatePlaylistDisplay(fullPlaylist);
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    socket.emit('chat-message', msg);
    input.value = '';
}

function addChatMessage(message) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-message ${message.type}`;
    if (message.type === 'system') {
        div.textContent = message.message;
    } else {
        const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `
            <div class="chat-avatar"><i data-lucide="${message.avatar || 'user'}"></i></div>
            <div class="chat-content">
                <div class="chat-header"><span class="chat-username">${message.username}</span> <span class="chat-time">${time}</span></div>
                <div class="chat-text">${message.message}</div>
            </div>
        `;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    // Performance optimization: only create icons for the new message
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({
            dataset: 'lucide',
            root: div
        });
    }
}

window.closeCreateModal = () => document.getElementById('createModal').style.display = 'none';

function toggleSongPin(videoId) {
    if (!currentUser.isHost) return;
    socket.emit('toggle-song-pin', { videoId });
}

socket.on('playlist-update', (playlist) => {
    updatePlaylistDisplay(playlist);
});

function shareCurrentFreq() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        const slugDisplay = document.getElementById('currentFreqSlug');
        const oldText = slugDisplay.textContent;
        slugDisplay.textContent = 'LINK COPIED!';
        slugDisplay.style.color = 'var(--accent-primary)';
        setTimeout(() => {
            slugDisplay.textContent = oldText;
            slugDisplay.style.color = '';
        }, 2000);
    });
}

function sendReaction(emoji) {
    socket.emit('reaction', emoji);
}

function showReaction(emoji) {
    const container = document.querySelector('.album-art-container');
    const el = document.createElement('div');
    el.className = 'floating-reaction';
    el.textContent = emoji;

    // Random horizontal position
    const left = 20 + Math.random() * 60;
    el.style.left = `${left}%`;

    container.appendChild(el);

    // Remove after animation
    setTimeout(() => {
        el.remove();
    }, 2000);
}
