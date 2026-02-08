// Socket.IO connection
const socket = io();

// User data
let currentUser = {
    username: '',
    avatar: 'music',
    isDJ: false
};

// YouTube Player
let player;
let isPlayerReady = false;
let currentVideoId = null;

// Equalizer animation
let equalizerInterval = null;
let eqBars = [];

// Avatar options (Lucide icon names)
const avatarOptions = [
    'music', 'headset', 'guitar', 'mic-2', 'speaker',
    'drum', 'disc', 'radio', 'star', 'heart',
    'zap', 'flame', 'smile', 'glasses', 'crown'
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeProfileModal();
    setupEventListeners();
    eqBars = document.querySelectorAll('.eq-bar');
    // Initial icon creation
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

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
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    isPlayerReady = true;
    console.log('YouTube player ready');

    // Set initial volume from slider
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        player.setVolume(volumeSlider.value);
    }
}

function onPlayerStateChange(event) {
    // Update album art rotation
    const albumArt = document.getElementById('albumArtCircle');

    if (event.data === YT.PlayerState.PLAYING) {
        if (albumArt) albumArt.classList.remove('paused');
        startEqualizer();
        updatePlayPauseButton(true);
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        if (albumArt) albumArt.classList.add('paused');
        stopEqualizer();
        updatePlayPauseButton(false);
    }

    // Sync playback state if DJ
    if (currentUser.isDJ) {
        const isPlaying = event.data === YT.PlayerState.PLAYING;
        socket.emit('toggle-playback', {
            isPlaying: isPlaying,
            currentTime: player.getCurrentTime()
        });
        updatePlayPauseButton(isPlaying);
    }
}

// Profile Modal
function initializeProfileModal() {
    const avatarGrid = document.getElementById('avatarGrid');
    if (!avatarGrid) return;

    avatarGrid.innerHTML = '';

    // Generate avatar options
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
            document.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            avatarOption.classList.add('selected');
            currentUser.avatar = iconName;
        });

        avatarGrid.appendChild(avatarOption);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Generate random username
    const randomNames = ['MusicLover', 'BeatMaster', 'SoundWave', 'VibeKing', 'MelodyQueen', 'RhythmNinja', 'BassHead', 'TuneSeeker'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)] + Math.floor(Math.random() * 1000);
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) usernameInput.value = randomName;
}

function setupEventListeners() {
    // Join button
    const joinButton = document.getElementById('joinButton');
    if (joinButton) joinButton.addEventListener('click', joinRoom);

    // Enter key on username input
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinRoom();
        });
    }

    // DJ Controls
    const addSongButton = document.getElementById('addSongButton');
    if (addSongButton) addSongButton.addEventListener('click', addSong);

    const youtubeUrlInput = document.getElementById('youtubeUrlInput');
    if (youtubeUrlInput) {
        youtubeUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addSong();
        });
    }

    const playPauseButton = document.getElementById('playPauseButton');
    if (playPauseButton) playPauseButton.addEventListener('click', togglePlayback);

    // Visualizer Controls
    const visualizerButton = document.getElementById('visualizerButton');
    if (visualizerButton) visualizerButton.addEventListener('click', toggleVisualizer);

    const closeVisualizer = document.getElementById('closeVisualizer');
    if (closeVisualizer) closeVisualizer.addEventListener('click', toggleVisualizer);

    // Volume Control
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const volumeIcon = document.getElementById('volumeIcon');

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value;
            if (volumeValue) volumeValue.textContent = volume + '%';

            if (isPlayerReady) {
                player.setVolume(volume);
            }

            // Update icon based on volume
            updateVolumeIcon(volume);
        });
    }

    // Click volume icon to mute/unmute
    if (volumeIcon && volumeSlider) {
        volumeIcon.addEventListener('click', () => {
            if (volumeSlider.value == 0) {
                volumeSlider.value = 50;
            } else {
                volumeSlider.value = 0;
            }
            // Trigger input event manually
            volumeSlider.dispatchEvent(new Event('input'));
        });
    }

    // Chat
    const sendMessageButton = document.getElementById('sendMessageButton');
    if (sendMessageButton) sendMessageButton.addEventListener('click', sendMessage);

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

function updateVolumeIcon(volume) {
    const volumeIcon = document.getElementById('volumeIcon');
    if (!volumeIcon) return;

    let iconName = 'volume-2';
    if (volume == 0) {
        iconName = 'volume-x';
    } else if (volume < 50) {
        iconName = 'volume-1';
    }

    volumeIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function joinRoom() {
    const usernameInput = document.getElementById('usernameInput');
    const djCheckbox = document.getElementById('djCheckbox');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const isDJ = djCheckbox ? djCheckbox.checked : false;

    if (!username) {
        alert('Please enter a username');
        return;
    }

    currentUser.username = username;
    currentUser.isDJ = isDJ;

    // Hide modal, show app
    document.getElementById('profileModal').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // Update header avatar
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) {
        headerAvatar.innerHTML = `<i data-lucide="${currentUser.avatar}"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Show DJ controls if DJ
    if (currentUser.isDJ) {
        const djControls = document.getElementById('djControls');
        if (djControls) djControls.style.display = 'block';
    }

    // Join socket room
    socket.emit('user-join', currentUser);

    // Add click listener to album art
    const albumArt = document.getElementById('albumArtCircle');
    if (albumArt) {
        albumArt.addEventListener('click', () => {
            if (isPlayerReady) {
                const state = player.getPlayerState();
                if (state === YT.PlayerState.PLAYING) {
                    player.pauseVideo();
                } else {
                    player.playVideo();
                }
            }
        });
    }

    // Initialize mobile tabs
    if (typeof initMobileTabs === 'function') {
        initMobileTabs();
    }
}

// Socket Events
socket.on('initial-state', (state) => {
    updateUserList(state.users);

    // Load chat history
    state.chatHistory.forEach(msg => {
        addChatMessage(msg);
    });

    // Load current song if playing
    if (state.playbackState.videoId) {
        loadVideo(state.playbackState);
    }

    // Load playlist
    if (state.playlist && state.playlist.length > 0) {
        updatePlaylistDisplay(state.playlist);
    }
});

socket.on('user-list-update', (users) => {
    updateUserList(users);
});

socket.on('play-song', (songData) => {
    loadVideo(songData);
    updateNowPlaying(songData);
    updateAlbumArt(songData);
    addToPlaylistDisplay(songData);
    startEqualizer();
});

socket.on('playback-state-change', (state) => {
    if (!isPlayerReady) return;

    if (state.isPlaying) {
        player.playVideo();
        startEqualizer();
    } else {
        player.pauseVideo();
        stopEqualizer();
    }
    updatePlayPauseButton(state.isPlaying);
});

socket.on('seek', (data) => {
    if (!isPlayerReady) return;
    player.seekTo(data.time, true);
});

socket.on('chat-message', (message) => {
    addChatMessage(message);
});

// User List
function updateUserList(users) {
    const userList = document.getElementById('userList');
    const listenerCount = document.getElementById('listenerCount');

    if (userList) {
        userList.innerHTML = '';
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            if (user.isDJ) userItem.classList.add('dj');

            userItem.innerHTML = `
                <div class="user-avatar"><i data-lucide="${user.avatar || 'user'}"></i></div>
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    ${user.isDJ ? '<span class="user-badge">DJ</span>' : ''}
                </div>
            `;

            userList.appendChild(userItem);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    if (listenerCount) listenerCount.textContent = users.length;
}

// Video Player & Album Art
function loadVideo(songData) {
    if (!isPlayerReady) {
        setTimeout(() => loadVideo(songData), 500);
        return;
    }

    // Check if we're already playing this video to avoid unnecessary restarts
    if (currentVideoId === songData.videoId) {
        if (songData.isPlaying) {
            player.playVideo();
            // Sync if offset is too large
            const currentTime = player.getCurrentTime();
            if (songData.currentTime && Math.abs(currentTime - songData.currentTime) > 3) {
                player.seekTo(songData.currentTime, true);
            }
        } else {
            player.pauseVideo();
        }
        return;
    }

    currentVideoId = songData.videoId;

    // Load video and seek to current position
    player.loadVideoById({
        videoId: songData.videoId,
        startSeconds: songData.currentTime || 0
    });

    if (songData.isPlaying) {
        player.playVideo();
    } else {
        player.pauseVideo();
    }

    // Update UI
    if (songData.title) updateNowPlaying(songData);
    if (songData.videoId) updateAlbumArt(songData);

    // Update Visualizer info
    const vizTitle = document.getElementById('vizTitle');
    const vizArtist = document.getElementById('vizArtist');
    if (vizTitle && songData.title) vizTitle.textContent = songData.title;
    if (vizArtist) vizArtist.textContent = 'Playing on Radddio';
}

function updateAlbumArt(songData) {
    const placeholder = document.getElementById('noSongPlaceholder');
    const albumArtCircle = document.getElementById('albumArtCircle');
    const albumArtImage = document.getElementById('albumArtImage');

    if (placeholder) placeholder.style.display = 'none';
    if (albumArtCircle) {
        albumArtCircle.style.display = 'block';
        albumArtCircle.classList.remove('paused');
    }

    if (albumArtImage) {
        const imageUrl = `https://img.youtube.com/vi/${songData.videoId}/maxresdefault.jpg`;
        albumArtImage.src = imageUrl;

        // Update visualizer background if it exists
        const vizBg = document.getElementById('vizBackground');
        if (vizBg) vizBg.style.backgroundImage = `url(${imageUrl})`;
    }
}

function updateNowPlaying(songData) {
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');

    if (songTitle) songTitle.textContent = songData.title || 'Now Playing';
    if (songArtist) songArtist.textContent = 'Playing on Radddio';
}

// DJ Controls
function addSong() {
    const urlInput = document.getElementById('youtubeUrlInput');
    const url = urlInput ? urlInput.value.trim() : '';

    if (!url) return;

    const videoId = extractVideoId(url);
    if (!videoId) {
        alert('Invalid YouTube URL');
        return;
    }

    fetchVideoInfo(videoId).then(videoInfo => {
        socket.emit('play-song', {
            videoId: videoId,
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail
        });
        if (urlInput) urlInput.value = '';
    });
}

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

async function fetchVideoInfo(videoId) {
    try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        const data = await response.json();
        return {
            title: data.title || 'YouTube Video',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
    } catch (error) {
        return {
            title: 'YouTube Video',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
    }
}

function togglePlayback() {
    if (!isPlayerReady) return;

    const state = player.getPlayerState();
    const isPlaying = state === YT.PlayerState.PLAYING;

    socket.emit('toggle-playback', {
        isPlaying: !isPlaying,
        currentTime: player.getCurrentTime()
    });

    updatePlayPauseButton(!isPlaying);
}

function updatePlayPauseButton(isPlaying) {
    const iconSpan = document.getElementById('playPauseIcon');
    if (iconSpan) {
        iconSpan.innerHTML = isPlaying ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// Equalizer
function startEqualizer() {
    const equalizer = document.getElementById('equalizer');
    if (equalizer) equalizer.classList.remove('paused');

    if (equalizerInterval) clearInterval(equalizerInterval);

    const isMobile = window.innerWidth <= 768;
    const updateInterval = isMobile ? 80 : 50;

    equalizerInterval = setInterval(() => {
        if (!eqBars.length) return;
        eqBars.forEach((bar, index) => {
            const baseHeight = 20;
            const maxHeight = isMobile ? 100 : 140;
            const time = Date.now() / 1000;
            const frequency = 0.5 + (index * 0.1);
            const phase = index * 0.3;
            const wave1 = Math.sin(time * frequency + phase) * 0.4;
            const wave2 = Math.sin(time * frequency * 2 + phase) * 0.3;
            const random = (Math.random() - 0.5) * 0.3;
            const normalized = (wave1 + wave2 + random + 1) / 2;
            const height = baseHeight + (normalized * (maxHeight - baseHeight));
            bar.style.height = `${height}px`;
        });

        // Visualizer reactive effects
        const vizContainer = document.getElementById('visualizerContainer');
        if (vizContainer && vizContainer.classList.contains('active')) {
            let avgLow = 0;
            const lowCount = 6;
            for (let i = 0; i < lowCount; i++) {
                if (eqBars[i]) {
                    const h = parseFloat(eqBars[i].style.height);
                    avgLow += h / 140;
                }
            }
            avgLow /= lowCount;

            const iframe = document.querySelector('#player iframe');
            const overlay = document.querySelector('.visualizer-overlay');
            const vizBg = document.getElementById('vizBackground');

            if (vizBg) {
                // Dynamic Zoom & Intensity based on "beat"
                const scale = 1.0 + (avgLow * 0.2); // Zoom between 0% and 15%
                vizBg.style.transform = `scale(${scale})`;

                // Reactive Blur and Brightness
                const blur = 30 - (avgLow * 25); // Clearer on loud beats
                const bright = 0.5 + (avgLow * 1.0);
                vizBg.style.filter = `blur(${blur}px) brightness(${bright})`;

                // Trigger Glitch on high energy
                if (avgLow > 0.8) {
                    vizBg.classList.add('glitch');
                } else {
                    vizBg.classList.remove('glitch');
                }
            }

            if (overlay) {
                overlay.style.opacity = 0.2 + (avgLow * 0.8);
                overlay.style.boxShadow = `inset 0 0 ${100 + avgLow * 200}px rgba(139, 92, 246, ${0.3 + avgLow * 0.4})`;
            }
        }
    }, updateInterval);
}

function stopEqualizer() {
    const equalizer = document.getElementById('equalizer');
    if (equalizer) equalizer.classList.add('paused');
    if (equalizerInterval) {
        clearInterval(equalizerInterval);
        equalizerInterval = null;
    }
    eqBars.forEach(bar => { bar.style.height = '20px'; });
}

function toggleVisualizer() {
    const vizContainer = document.getElementById('visualizerContainer');
    if (!vizContainer) return;

    const isActive = vizContainer.classList.toggle('active');

    // Update viz info if opening
    if (isActive) {
        const songTitle = document.getElementById('songTitle').textContent;
        const songArtist = document.getElementById('songArtist').textContent;
        const vizTitle = document.getElementById('vizTitle');
        const vizArtist = document.getElementById('vizArtist');
        if (vizTitle) vizTitle.textContent = songTitle;
        if (vizArtist) vizArtist.textContent = songArtist;
    }
}

// Playlist
function updatePlaylistDisplay(playlist) {
    const playlistHistory = document.getElementById('playlistHistory');
    const songCount = document.getElementById('songCount');

    if (songCount) songCount.textContent = playlist.length;
    if (!playlistHistory) return;

    if (playlist.length === 0) {
        playlistHistory.innerHTML = '<p class="empty-state">No songs played yet</p>';
        return;
    }

    playlistHistory.innerHTML = '';
    playlist.slice(-10).reverse().forEach(song => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        const timeStr = new Date(song.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        item.innerHTML = `
            <div class="playlist-info">
                <div class="playlist-title">${song.title}</div>
                <div class="playlist-meta">${song.playedBy} • ${timeStr}</div>
            </div>
        `;
        playlistHistory.appendChild(item);
    });
}

function addToPlaylistDisplay(songData) {
    const playlistHistory = document.getElementById('playlistHistory');
    const songCount = document.getElementById('songCount');

    if (playlistHistory) {
        const emptyState = playlistHistory.querySelector('.empty-state');
        if (emptyState) playlistHistory.innerHTML = '';

        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.innerHTML = `
            <div class="playlist-info">
                <div class="playlist-title">${songData.title}</div>
                <div class="playlist-meta">Playing now</div>
            </div>
        `;
        playlistHistory.insertBefore(item, playlistHistory.firstChild);
        while (playlistHistory.children.length > 10) playlistHistory.removeChild(playlistHistory.lastChild);
    }

    if (songCount) {
        const currentCount = parseInt(songCount.textContent) || 0;
        songCount.textContent = currentCount + 1;
    }
}

// Chat
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input ? input.value.trim() : '';
    if (!message) return;
    socket.emit('chat-message', message);
    if (input) input.value = '';
}

function addChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.type}`;

    if (message.type === 'system') {
        messageDiv.textContent = message.message;
    } else {
        const timeStr = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageDiv.innerHTML = `
            <div class="chat-avatar"><i data-lucide="${message.avatar || 'user'}"></i></div>
            <div class="chat-content">
                <div class="chat-header">
                    <span class="chat-username">${message.username}</span>
                    <span class="chat-time">${timeStr}</span>
                </div>
                <div class="chat-text">${escapeHtml(message.message)}</div>
            </div>
        `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
