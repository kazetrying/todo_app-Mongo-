const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ===================== WEB ROUTES =====================

// GET /tasks - Hiển thị tất cả task của user hiện tại
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const filter = req.query.filter || 'all';
    const allUsers = await User.find({}, 'username fullName role');

    let query = {
      'assignees.user': userId
    };

    if (filter === 'pending') {
      query['isCompleted'] = false;
    } else if (filter === 'completed') {
      query['isCompleted'] = true;
    } else if (filter === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query['createdAt'] = { $gte: start, $lte: end };
    }

    // Admin xem tất cả
    if (req.session.role === 'admin') {
      delete query['assignees.user'];
    }

    const tasks = await Task.find(query)
      .populate('createdBy', 'username fullName')
      .populate('assignees.user', 'username fullName')
      .sort({ createdAt: -1 });

    // Tính progress cho từng task
    const tasksWithProgress = tasks.map(task => {
      const total = task.assignees.length;
      const done = task.assignees.filter(a => a.isDone).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      // Kiểm tra user hiện tại đã done chưa
      const myAssignee = task.assignees.find(a => a.user && a.user._id.toString() === userId.toString());
      return {
        ...task.toObject(),
        progress,
        myDone: myAssignee ? myAssignee.isDone : false,
        myAssigneeId: myAssignee ? myAssignee._id : null
      };
    });

    res.render('tasks/index', {
      title: 'Danh sách công việc',
      tasks: tasksWithProgress,
      allUsers,
      filter,
      currentUser: { id: userId, role: req.session.role, fullName: req.session.fullName }
    });
  } catch (err) {
    req.flash('error', 'Lỗi: ' + err.message);
    res.redirect('/');
  }
});

// POST /tasks - Tạo task mới
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { title, description, assigneeIds } = req.body;
    const userId = req.session.userId;

    let assignees = [];

    if (req.session.role === 'admin' && assigneeIds) {
      // Admin có thể assign cho nhiều người
      const ids = Array.isArray(assigneeIds) ? assigneeIds : [assigneeIds];
      assignees = ids.map(id => ({ user: id, isDone: false }));
    } else {
      // Normal user chỉ assign cho bản thân
      assignees = [{ user: userId, isDone: false }];
    }

    // Đảm bảo creator luôn có trong assignees nếu chưa có
    const creatorInList = assignees.some(a => a.user.toString() === userId.toString());
    if (!creatorInList) {
      assignees.unshift({ user: userId, isDone: false });
    }

    const task = new Task({
      title,
      description,
      createdBy: userId,
      assignees
    });

    await task.save();
    req.flash('success', 'Thêm công việc thành công!');
    res.redirect('/tasks');
  } catch (err) {
    req.flash('error', 'Lỗi: ' + err.message);
    res.redirect('/tasks');
  }
});

// POST /tasks/:id/toggle - Toggle done cho assignee hiện tại
router.post('/:id/toggle', isAuthenticated, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      req.flash('error', 'Không tìm thấy task');
      return res.redirect('/tasks');
    }

    const userId = req.session.userId;
    const assignee = task.assignees.find(a => a.user.toString() === userId.toString());

    if (!assignee) {
      req.flash('error', 'Bạn không có quyền cập nhật task này');
      return res.redirect('/tasks');
    }

    assignee.isDone = !assignee.isDone;
    assignee.doneAt = assignee.isDone ? new Date() : null;

    task.checkCompletion();
    await task.save();

    res.redirect('/tasks');
  } catch (err) {
    req.flash('error', 'Lỗi: ' + err.message);
    res.redirect('/tasks');
  }
});

// POST /tasks/:id/delete - Xóa task
router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      req.flash('error', 'Không tìm thấy task');
      return res.redirect('/tasks');
    }

    const userId = req.session.userId;
    // Chỉ người tạo hoặc admin mới được xóa
    if (task.createdBy.toString() !== userId.toString() && req.session.role !== 'admin') {
      req.flash('error', 'Bạn không có quyền xóa task này');
      return res.redirect('/tasks');
    }

    await Task.findByIdAndDelete(req.params.id);
    req.flash('success', 'Đã xóa công việc!');
    res.redirect('/tasks');
  } catch (err) {
    req.flash('error', 'Lỗi: ' + err.message);
    res.redirect('/tasks');
  }
});

// POST /tasks/:id/assign - Admin phân quyền thêm user vào task
router.post('/:id/assign', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { assigneeId } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      req.flash('error', 'Không tìm thấy task');
      return res.redirect('/tasks');
    }

    const alreadyAssigned = task.assignees.some(a => a.user.toString() === assigneeId);
    if (alreadyAssigned) {
      req.flash('error', 'User đã được phân công task này rồi');
      return res.redirect('/tasks');
    }

    task.assignees.push({ user: assigneeId, isDone: false });
    task.isCompleted = false;
    task.completedAt = null;
    await task.save();

    req.flash('success', 'Phân công task thành công!');
    res.redirect('/tasks');
  } catch (err) {
    req.flash('error', 'Lỗi: ' + err.message);
    res.redirect('/tasks');
  }
});

// ===================== API ROUTES =====================

// API: Lấy tất cả task
router.get('/api/getAllTasks', isAuthenticated, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('createdBy', 'username fullName')
      .populate('assignees.user', 'username fullName');
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API: Lấy task theo username
router.get('/api/getByUsername/:username', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });

    const tasks = await Task.find({ 'assignees.user': user._id })
      .populate('createdBy', 'username fullName')
      .populate('assignees.user', 'username fullName');

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API: Lấy task trong ngày hiện tại
router.get('/api/getTodayTasks', isAuthenticated, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const tasks = await Task.find({ createdAt: { $gte: start, $lte: end } })
      .populate('createdBy', 'username fullName')
      .populate('assignees.user', 'username fullName');

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API: Lấy task chưa hoàn thành
router.get('/api/getPendingTasks', isAuthenticated, async (req, res) => {
  try {
    const tasks = await Task.find({ isCompleted: false })
      .populate('createdBy', 'username fullName')
      .populate('assignees.user', 'username fullName');

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API: Lấy task của các user có họ 'Nguyễn'
router.get('/api/getTasksByLastName/:lastName', isAuthenticated, async (req, res) => {
  try {
    const lastName = req.params.lastName || 'Nguyễn';
    const users = await User.find({ lastName: new RegExp(lastName, 'i') });
    const userIds = users.map(u => u._id);

    const tasks = await Task.find({ 'assignees.user': { $in: userIds } })
      .populate('createdBy', 'username fullName')
      .populate('assignees.user', 'username fullName');

    res.json({ success: true, count: tasks.length, users: users.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
