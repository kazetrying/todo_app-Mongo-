const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /auth/register
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Đăng ký' });
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      req.flash('error', 'Username đã tồn tại');
      return res.redirect('/auth/register');
    }

    const user = new User({ username, password, fullName, role: role || 'normal' });
    await user.save();

    req.flash('success', 'Đăng ký thành công! Vui lòng đăng nhập.');
    res.redirect('/auth/login');
  } catch (err) {
    req.flash('error', 'Lỗi: ' + err.message);
    res.redirect('/auth/register');
  }
});

// GET /auth/login
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Đăng nhập' });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Username hoặc password không đúng');
      return res.redirect('/auth/login');
    }

    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.fullName = user.fullName;
    req.session.role = user.role;

    req.flash('success', `Chào mừng ${user.fullName}!`);
    res.redirect('/tasks');
  } catch (err) {
    req.flash('error', 'Lỗi: ' + err.message);
    res.redirect('/auth/login');
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
