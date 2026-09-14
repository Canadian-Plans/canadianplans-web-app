import { createApp } from '../src/app.js';

// Vercel's Node.js runtime accepts a plain (req, res) => void handler, and an
// Express app already has that shape — no adapter package needed. vercel.json
// rewrites every path to this one function.
export default createApp();
