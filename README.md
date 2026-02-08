# 🎵 Radddio - Live Music Streaming Platform

A real-time music streaming platform where DJs can play YouTube music and listeners can tune in together, chat, and enjoy synchronized playback.

## ✨ Features

### 🎧 Live Music Streaming
- **YouTube Integration**: DJs can play any YouTube video by pasting the URL
- **Synchronized Playback**: All listeners hear the same music at the same time
- **Real-time Controls**: Play, pause, and seek controls for DJs

### 👥 User Profiles
- **Custom Avatars**: Choose from 15 music-themed emoji avatars (🎵🎧🎸🎹🎤🎺🎷🥁🎻🎼🔊📻💿🎶⭐)
- **Unique Usernames**: Set your own username or use auto-generated ones
- **DJ Mode**: Join as a DJ to control the music or as a listener to enjoy

### 💬 Live Chat
- **Real-time Messaging**: Chat with all listeners in the room
- **User Avatars**: See who's talking with their custom avatars
- **System Messages**: Get notified when users join or leave
- **Timestamps**: All messages show the time they were sent

### 📜 Playlist History
- **Track History**: See all songs that have been played
- **Song Thumbnails**: Visual preview of each track
- **DJ Attribution**: Know who played each song
- **Timestamps**: When each song was played

### 🎚️ Audio Visualizer
- **Animated Equalizer**: 12 dancing bars that respond to playback
- **Purple Gradient**: Beautiful visual feedback with glowing effects
- **Auto-sync**: Starts/stops with music playback

### 🎨 Design Features
- **Dark Theme**: Sleek dark interface (#0a0a0f background)
- **Purple Accents**: Beautiful gradient accents (#8b5cf6 to #6366f1)
- **Smooth Animations**: Slide-ins, fades, and hover effects
- **Glassmorphism**: Modern frosted glass effects
- **Responsive Layout**: Works on desktop and mobile
- **Premium Typography**: Inter font for clean, modern look

## 🚀 Getting Started

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Open in Browser**
   Navigate to `http://localhost:3000`

### For Development

Use nodemon for auto-restart on file changes:
```bash
npm run dev
```

## 🎮 How to Use

### As a Listener

1. **Join the Room**
   - Choose an avatar from the emoji grid
   - Enter your username (or use the auto-generated one)
   - Click "Join Room"

2. **Enjoy the Music**
   - Watch the video player in the center
   - See the animated equalizer bars dance
   - Check the playlist history to see what's been played

3. **Chat with Others**
   - Type messages in the chat input (right sidebar)
   - See who's online in the user list (left sidebar)
   - React to the music and connect with other listeners

### As a DJ

1. **Join as DJ**
   - Select your avatar and username
   - **Check the "Join as DJ" checkbox**
   - Click "Join Room"

2. **Play Music**
   - Paste a YouTube URL in the input field
   - Click the "Play" button or press Enter
   - The song will start playing for everyone

3. **Control Playback**
   - Use the play/pause button to control playback
   - The YouTube player controls also work
   - All listeners will sync automatically

## 🏗️ Technical Stack

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web server framework
- **Socket.IO**: Real-time bidirectional communication

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **YouTube IFrame API**: Embedded video player
- **Socket.IO Client**: Real-time updates
- **CSS3**: Modern animations and effects

## 📁 Project Structure

```
radddio/
├── server.js           # Node.js server with Socket.IO
├── package.json        # Dependencies and scripts
├── public/
│   ├── index.html     # Main HTML structure
│   ├── styles.css     # All styling and animations
│   └── app.js         # Client-side JavaScript
└── README.md          # This file
```

## 🎯 Key Features Explained

### Real-time Synchronization
All users experience the same playback state:
- When DJ plays a song, everyone hears it
- Pause/play actions sync across all clients
- Seek operations update for all listeners
- New users joining get the current state

### User Management
- Each user gets a unique socket ID
- User list updates in real-time
- DJs are highlighted with special badges
- Profile data persists during session

### Chat System
- Messages broadcast to all connected users
- Last 100 messages stored in memory
- New users see last 50 messages
- System messages for join/leave events

### Playlist Tracking
- Every played song is recorded
- Includes video ID, title, thumbnail
- Tracks who played it and when
- Displays last 10 songs in history

## 🎨 Customization

### Colors
Edit CSS variables in `public/styles.css`:
```css
:root {
    --bg-primary: #0a0a0f;
    --accent-primary: #8b5cf6;
    --accent-secondary: #6366f1;
    /* ... more variables */
}
```

### Avatars
Add more emojis in `public/app.js`:
```javascript
const avatarOptions = ['🎵', '🎧', '🎸', /* add more */];
```

### Port
Change port in `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)

### YouTube API
Currently uses basic video info. For production:
1. Get a YouTube Data API key
2. Update `fetchVideoInfo()` in `app.js`
3. Fetch real video titles and metadata

## 🌐 Deployment

### Heroku
```bash
# Add Procfile
echo "web: node server.js" > Procfile

# Deploy
git init
heroku create your-app-name
git add .
git commit -m "Initial commit"
git push heroku main
```

### Vercel/Netlify
Not recommended - requires WebSocket support. Use platforms that support Node.js servers.

## 📝 Future Enhancements

- [ ] User authentication and persistent profiles
- [ ] Multiple rooms/channels
- [ ] Song queue system
- [ ] Volume controls
- [ ] Reactions/emojis during playback
- [ ] User roles and permissions
- [ ] Playlist export/import
- [ ] Audio-only mode (no video)
- [ ] Mobile app version
- [ ] Spotify/SoundCloud integration

## 🐛 Troubleshooting

### YouTube Player Not Loading
- Check internet connection
- Ensure YouTube is not blocked
- Clear browser cache

### Chat Not Working
- Check browser console for errors
- Ensure Socket.IO connection is established
- Verify server is running

### Sync Issues
- Refresh the page
- Check network latency
- Ensure stable internet connection

## 📄 License

ISC

## 🙏 Credits

Built with ❤️ using modern web technologies.

---

**Enjoy the music! 🎵**
