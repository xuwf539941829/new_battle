require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Configurations
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const MAX_DAILY_THROWS = parseInt(process.env.MAX_DAILY_THROWS || '3', 10);
const MAX_DAILY_PICKS = parseInt(process.env.MAX_DAILY_PICKS || '5', 10);

app.use(cors());
app.use(express.json());

// Helper to check if a date is today
function isToday(date) {
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

// Generate random nickname
function generateNickname() {
  const adjs = ['快乐的', '忧郁的', '神奇的', '可爱的', '神秘的'];
  const nouns = ['海星', '海豚', '鲸鱼', '章鱼', '海龟'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

// User Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        nickname: generateNickname(),
        last_action_date: new Date()
      }
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    let user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const now = new Date();
    // Check and reset daily limits if it's a new day
    if (!isToday(user.last_action_date)) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          daily_throws: 0,
          daily_picks: 0,
          last_action_date: now
        }
      });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { ...user, password: '' } }); // Don't send password back
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Get Current User Info
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if new day to reset limits
    const now = new Date();
    if (!isToday(user.last_action_date)) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          daily_throws: 0,
          daily_picks: 0,
          last_action_date: now
        }
      });
      return res.json({ ...updatedUser, password: '' });
    }

    res.json({ ...user, password: '' });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Throw a bottle
app.post('/api/bottle/throw', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const user_id = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.trim() === '') {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status === 'banned') {
       return res.status(403).json({ error: 'Account is banned' });
    }

    const now = new Date();

    // Check if new day
    let daily_throws = user.daily_throws;
    if (!isToday(user.last_action_date)) {
      daily_throws = 0;
    }

    if (daily_throws >= MAX_DAILY_THROWS) {
      return res.status(403).json({ error: `Daily throw limit reached (${MAX_DAILY_THROWS}/${MAX_DAILY_THROWS})` });
    }

    // Create bottle and update user limits in transaction
    const [bottle, updatedUser] = await prisma.$transaction([
      prisma.bottle.create({
        data: {
          sender_id: user.id,
          content: content.trim(),
          status: 'drifting'
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          daily_throws: daily_throws + 1,
          last_action_date: now
        }
      })
    ]);

    res.json({ bottle, user: updatedUser });
  } catch (error) {
    console.error('Throw error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pickup a bottle
app.post('/api/bottle/pickup', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status === 'banned') {
       return res.status(403).json({ error: 'Account is banned' });
    }

    const now = new Date();

    // Check if new day
    let daily_picks = user.daily_picks;
    if (!isToday(user.last_action_date)) {
      daily_picks = 0;
    }

    if (daily_picks >= MAX_DAILY_PICKS) {
      return res.status(403).json({ error: `Daily pick limit reached (${MAX_DAILY_PICKS}/${MAX_DAILY_PICKS})` });
    }

    // SQLite doesn't have a simple random selection that works well with Prisma directly for a large DB,
    // but for this scale, we can query IDs and pick one randomly.
    // Query eligible drifting bottles
    const driftingBottles = await prisma.bottle.findMany({
      where: {
        status: 'drifting',
        sender_id: { not: user.id }
      },
      select: { id: true }
    });

    if (driftingBottles.length === 0) {
      // Update action date and picks anyway? Usually picking nothing doesn't count against limit,
      // but let's just return empty without incrementing limit to be nice.
      return res.json({ message: '海里空空如也，晚点再来看看吧', bottle: null, user });
    }

    // Select a random bottle
    const randomIndex = Math.floor(Math.random() * driftingBottles.length);
    const selectedBottleId = driftingBottles[randomIndex].id;

    // Transaction to update bottle and user
    const [pickedBottle, updatedUser] = await prisma.$transaction([
      prisma.bottle.update({
        where: { id: selectedBottleId },
        data: {
          status: 'picked',
          picker_id: user.id
        },
        include: {
          sender: {
            select: {
              nickname: true
            }
          }
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          daily_picks: daily_picks + 1,
          last_action_date: now
        }
      })
    ]);

    res.json({ bottle: pickedBottle, user: updatedUser });

  } catch (error) {
    console.error('Pickup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reply to a bottle
app.post('/api/message/reply', authenticateToken, async (req, res) => {
  try {
    const { bottle_id, content } = req.body;
    const user_id = req.user.id;

    if (!bottle_id || !content) {
      return res.status(400).json({ error: 'bottle_id and content are required' });
    }

    if (content.trim() === '') {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const bottle = await prisma.bottle.findUnique({ where: { id: bottle_id } });

    if (!bottle) {
      return res.status(404).json({ error: 'Bottle not found' });
    }

    if (bottle.status !== 'picked') {
       return res.status(400).json({ error: 'Bottle has not been picked up yet' });
    }

    // Determine receiver: if user_id is the sender of the bottle, receiver is the picker. Otherwise, receiver is the sender.
    let receiver_id;
    if (user_id === bottle.sender_id) {
       if (!bottle.picker_id) return res.status(400).json({ error: 'Bottle has no picker' });
       receiver_id = bottle.picker_id;
    } else if (user_id === bottle.picker_id) {
       receiver_id = bottle.sender_id;
    } else {
       return res.status(403).json({ error: 'User is not part of this bottle thread' });
    }

    const message = await prisma.message.create({
      data: {
        bottle_id,
        sender_id: user_id,
        receiver_id,
        content: content.trim()
      }
    });

    res.json(message);
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Report a bottle
app.post('/api/bottle/report', authenticateToken, async (req, res) => {
  try {
    const { bottle_id, reason } = req.body;
    const reporter_id = req.user.id;

    if (!bottle_id || !reason) {
      return res.status(400).json({ error: 'bottle_id and reason are required' });
    }

    const report = await prisma.report.create({
      data: {
        reporter_id,
        target_bottle_id: bottle_id,
        reason
      }
    });

    res.json({ message: 'Report submitted successfully', report });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// History
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.id;

    const thrownBottles = await prisma.bottle.findMany({
      where: { sender_id: uid },
      orderBy: { created_at: 'desc' },
      include: {
        messages: {
           orderBy: { created_at: 'asc' }
        }
      }
    });

    const pickedBottles = await prisma.bottle.findMany({
      where: { picker_id: uid },
      orderBy: { created_at: 'desc' },
      include: {
        sender: {
          select: { nickname: true }
        },
        messages: {
           orderBy: { created_at: 'asc' }
        }
      }
    });

    res.json({ thrown: thrownBottles, picked: pickedBottles });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to reset limits
app.post('/api/debug/reset-limits', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        daily_throws: 0,
        daily_picks: 0
      }
    });
    res.json({ message: 'Limits reset successfully', user: { ...user, password: '' } });
  } catch (error) {
    console.error('Debug reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For testing purposes during implementation
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
