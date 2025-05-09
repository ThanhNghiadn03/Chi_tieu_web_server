require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Expense = require('./models/expense');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
  dbName: 'dailyExpense',
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

app.use((req, res, next) => {
  console.log(`🔥 Route called: ${req.method} ${req.originalUrl}`);
  next();
});


// All API
app.post('/api/expenses', verifyToken, async (req, res) => {
  const { date, item_name, unit_price, quantity } = req.body;

  if (!date || !item_name || unit_price == null || quantity == null) {
    return res.status(400).json({ error: 'Thiếu thông tin chi tiêu' });
  }

  try {
    const expense = new Expense({
      user_id: req.user.id,
      date,
      item_name,
      unit_price,
      quantity,
    });

    await expense.save();

    res.json({ success: true, expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Thêm chi tiêu thất bại' });
  }
});


app.get('/api/expenses/:date', verifyToken, async (req, res) => {
  const { date } = req.params;
  try {
    const expenses = await Expense.find({
      user_id: req.user.id,
      date,
    });
    res.json({ success: true, expenses });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Không thể lấy chi tiêu' });
  }
});

app.put('/api/expenses/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { item_name, unit_price, quantity } = req.body;

  if (!item_name || unit_price == null || quantity == null) {
    return res.status(400).json({ error: 'Thiếu thông tin cập nhật' });
  }

  try {
    const updated = await Expense.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      { item_name, unit_price, quantity },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Không tìm thấy chi tiêu' });
    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật' });
  }
});

app.delete('/api/expenses/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Expense.findOneAndDelete({
      _id: id,
      user_id: req.user.id,
    });

    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy chi tiêu' });
    res.json({ success: true, message: 'Đã xoá chi tiêu' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá' });
  }
});

app.get('/api/expenses-calendar/get-all-dates',verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId);
    const result = await Expense.find({ user_id: userId }).select('date');
    const dates = result.map(e => e.date);
    res.json({ dates: [...new Set(dates)] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách ngày chi tiêu' });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  try {
    const newUser = new User({ username, password });
    await newUser.save();
    res.json({ success: true, message: 'User registered' });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});