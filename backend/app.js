// app.js (Ultra Light Version - 20 lines)
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import mp3Routes from './features/mp3-cutter/routes.js';
import cloudRoutes from './features/cloud-storage/routes.js';

const app = express();

// Session middleware for OAuth state management
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Minimal middleware
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'] }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Routes
app.get('/', (req, res) => res.json({ status: 'OK', service: 'MP3 Cutter Pro' }));
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.use('/api/mp3-cutter', mp3Routes);
app.use('/api/cloud', cloudRoutes);

// 404 & Error handlers
app.use('*', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

export default app;