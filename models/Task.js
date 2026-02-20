const mongoose = require('mongoose');

// Schema cho từng người được assign vào task
const assigneeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDone: {
    type: Boolean,
    default: false
  },
  doneAt: {
    type: Date,
    default: null
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Người tạo task (owner)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Danh sách người được assign (Level 3: nhiều người)
  assignees: [assigneeSchema],
  // Task hoàn thành khi TẤT CẢ assignees đều done
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method kiểm tra và cập nhật trạng thái task
taskSchema.methods.checkCompletion = function() {
  if (this.assignees.length === 0) return;
  const allDone = this.assignees.every(a => a.isDone);
  if (allDone && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  } else if (!allDone) {
    this.isCompleted = false;
    this.completedAt = null;
  }
};

module.exports = mongoose.model('Task', taskSchema);
