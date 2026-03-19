require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Configurations
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const MAX_DAILY_THROWS = parseInt(process.env.MAX_DAILY_THROWS || '3', 10);
const MAX_DAILY_PICKS = parseInt(process.env.MAX_DAILY_PICKS || '5', 10);

app.use(cors());
app.use(express.json());

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

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

// Update Current User Profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { avatar, nickname, bio, gender } = req.body;

    // Validate inputs or allow undefined to ignore updates
    const dataToUpdate = {};
    if (avatar !== undefined) dataToUpdate.avatar = avatar;
    if (nickname !== undefined) dataToUpdate.nickname = nickname;
    if (bio !== undefined) dataToUpdate.bio = bio;
    if (gender !== undefined) dataToUpdate.gender = gender;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate
    });

    res.json({ message: 'Profile updated successfully', user: { ...user, password: '' } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User Info
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        _count: {
          select: { sent_bottles: true, picked_bottles: true }
        }
      }
    });
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
        },
        include: {
          _count: {
            select: { sent_bottles: true, picked_bottles: true }
          }
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
    const { content, content_type, media_url } = req.body;
    const user_id = req.user.id;

    if (!content && !media_url) {
      return res.status(400).json({ error: 'Content or media is required' });
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
          content: content ? content.trim() : '',
          content_type: content_type || 'TEXT',
          media_url: media_url || null,
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
    const { bottle_id, content, content_type, media_url } = req.body;
    const user_id = req.user.id;

    if (!bottle_id || (!content && !media_url)) {
      return res.status(400).json({ error: 'bottle_id and content/media are required' });
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
        content: content ? content.trim() : '',
        content_type: content_type || 'TEXT',
        media_url: media_url || null
      }
    });

    // --- Socket.io Real-time Push ---
    const receiverSocketId = userSockets.get(receiver_id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_message', {
        bottle_id,
        message
      });
    }

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

// Get Unread Count for Picked Bottles
app.get('/api/bottles/unread-count', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    // Get bottles where the current user is a participant (sender or picker)
    // and there are messages addressed to the current user with is_read = false
    const unreadMessagesCount = await prisma.message.groupBy({
      by: ['bottle_id'],
      where: {
        receiver_id: user_id,
        is_read: false
      },
      _count: {
        id: true
      }
    });

    const unreadMap = {};
    unreadMessagesCount.forEach(item => {
      unreadMap[item.bottle_id] = item._count.id;
    });

    res.json(unreadMap);
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark messages in a bottle as read
app.patch('/api/messages/read', authenticateToken, async (req, res) => {
  try {
    const { bottle_id } = req.body;
    const user_id = req.user.id;

    if (!bottle_id) {
      return res.status(400).json({ error: 'bottle_id is required' });
    }

    const updated = await prisma.message.updateMany({
      where: {
        bottle_id: bottle_id,
        receiver_id: user_id,
        is_read: false
      },
      data: {
        is_read: true
      }
    });

    res.json({ message: 'Messages marked as read', count: updated.count });
  } catch (error) {
    console.error('Mark read error:', error);
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

// Upload Endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return relative URL so frontend can prepend server host
    const media_url = `/uploads/${req.file.filename}`;
    res.json({ media_url });
  } catch (error) {
    console.error('Upload error:', error);
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

// --- Socket.io Integration ---
const userSockets = new Map(); // Store userId -> socketId mapping

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // When a user authenticates their socket
  socket.on('register_user', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove the socket mapping on disconnect
    for (let [key, value] of userSockets.entries()) {
      if (value === socket.id) {
        userSockets.delete(key);
        break;
      }
    }
  });
});

// For testing purposes during implementation
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
