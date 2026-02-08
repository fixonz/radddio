# 🚂 Deploying Radddio to Railway

Since Vercel is a **Serverless** platform, it doesn't support the persistent WebSocket connections needed for a live radio station. **Railway** is a persistent hosting platform that will work perfectly.

## 🚀 Steps to Deploy

### 1. Create a Railway Account
Go to [Railway.app](https://railway.app) and sign up (GitHub login is fastest).

### 2. Install Railway CLI (Optional but recommended)
Open your terminal and run:
`npm i -g @railway/cli`

### 3. Deploy your Folder
In your terminal, inside the `radddio` project folder:
1. `railway login` (follow the browser prompt)
2. `railway init` (choose a name like 'radddio')
3. `railway up`

### 4. Set the Port
Once the project is created on the Railway dashboard:
1. Go to **Settings** -> **Variables**.
2. Railway automatically provides a `PORT`, so our `server.js` code (`process.env.PORT`) will pick it up automatically.

### 5. Get your URL
Go to **Settings** -> **Networking** and click **"Generate Domain"**.

---

## 💎 Why Railway is better for this app:
- **Persistent Server**: The listener list and playlist won't reset every few minutes.
- **Native WebSockets**: No more "400 Bad Request" or polling errors.
- **Shared State**: All users will hit the *same* server instance, keeping them perfectly in sync.

**Your current folder is already pre-configured for Railway!**
