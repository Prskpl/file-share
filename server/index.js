const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(morgan('dev'));
app.use(cors({
  origin: [
    "http://localhost:5173", // Local development
    process.env.CLIENT_URL   // Deployed Frontend URL (we will set this later)
  ],
  credentials: true
}));

// Routes
app.use('/api/auth', require('./routes/authRoutes')); // Create authRoutes similar to previous response
app.use('/api/files', require('./routes/fileRoutes'));

app.get('/', (req, res) => res.send('NUA API Running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));