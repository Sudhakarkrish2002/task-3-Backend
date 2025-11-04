# Kiwise EduTech Backend

Backend server built with Node.js, Express, and MongoDB.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` file with your MongoDB connection string and other configurations.

3. **Start the Server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

## MongoDB Setup

### Local MongoDB
1. Install MongoDB on your system
2. Start MongoDB service
3. Use the connection string: `mongodb://localhost:27017/kiwisedutech`

### MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string and update it in `.env` file

## Project Structure

```
server/
├── config/          # Configuration files (database, etc.)
├── models/          # MongoDB models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── controllers/     # Route controllers
├── utils/           # Utility functions
├── server.js        # Main server file
└── package.json     # Dependencies
```

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check

## Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **dotenv** - Environment variables
- **cors** - Cross-Origin Resource Sharing
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication

