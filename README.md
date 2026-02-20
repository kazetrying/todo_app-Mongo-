# 📝 TodoApp - Full Stack Node.js + MongoDB + EJS

Ứng dụng Todo List đầy đủ với 3 level tính năng.

## 🚀 Cài đặt & Chạy

### 1. Yêu cầu
- Node.js >= 16
- MongoDB đang chạy (local hoặc MongoDB Atlas)

### 2. Cài đặt dependencies
```bash
cd todo-app
npm install
```

### 3. Cấu hình `.env`
```env
MONGO_URI=mongodb://localhost:27017/todoapp
SESSION_SECRET=your_super_secret_key_here
PORT=3000
```
> Nếu dùng MongoDB Atlas: `MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/todoapp`

### 4. Chạy ứng dụng
```bash
npm start
# hoặc dev mode:
npm run dev
```
Truy cập: **http://localhost:3000**

---

## 📁 Cấu trúc thư mục

```
todo-app/
├── app.js                  # Entry point
├── .env                    # Cấu hình môi trường
├── package.json
├── models/
│   ├── User.js             # Model User (bcrypt, role)
│   └── Task.js             # Model Task (multi-assignee)
├── routes/
│   ├── auth.js             # Đăng ký / Đăng nhập / Đăng xuất
│   └── tasks.js            # CRUD + API tasks
├── middleware/
│   └── auth.js             # isAuthenticated, isAdmin
└── views/
    ├── partials/
    │   ├── header.ejs
    │   ├── navbar.ejs
    │   └── footer.ejs
    ├── auth/
    │   ├── login.ejs
    │   └── register.ejs
    └── tasks/
        └── index.ejs       # Trang chính quản lý task
```

---

## 🗄️ MongoDB Schema

### Collection: `users`
```js
{
  username: String (unique),
  password: String (bcrypt hashed),
  fullName: String,
  lastName: String (tự động tách từ fullName),
  role: 'admin' | 'normal',
  createdAt: Date
}
```

### Collection: `tasks`
```js
{
  title: String,
  description: String,
  createdBy: ObjectId (ref: User),
  assignees: [
    {
      user: ObjectId (ref: User),
      isDone: Boolean,
      doneAt: Date
    }
  ],
  isCompleted: Boolean,  // true khi TẤT CẢ assignees đều done
  completedAt: Date,
  createdAt: Date
}
```

---

## 🔌 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/tasks/api/getAllTasks` | Lấy tất cả task |
| GET | `/tasks/api/getByUsername/:username` | Task theo username |
| GET | `/tasks/api/getTodayTasks` | Task trong ngày hôm nay |
| GET | `/tasks/api/getPendingTasks` | Task chưa hoàn thành |
| GET | `/tasks/api/getTasksByLastName/:lastName` | Task của user có họ tương ứng |

### Web Routes
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/tasks` | Trang chính (có filter) |
| POST | `/tasks` | Tạo task mới |
| POST | `/tasks/:id/toggle` | Toggle trạng thái done |
| POST | `/tasks/:id/delete` | Xóa task |
| POST | `/tasks/:id/assign` | Admin phân công user vào task |
| GET | `/auth/register` | Trang đăng ký |
| POST | `/auth/register` | Xử lý đăng ký |
| GET | `/auth/login` | Trang đăng nhập |
| POST | `/auth/login` | Xử lý đăng nhập |
| GET | `/auth/logout` | Đăng xuất |

---

## 🎯 Tính năng theo Level

### Level 1 - API
- ✅ Mã hóa password bằng **bcryptjs**
- ✅ Username unique
- ✅ 1 user nhiều task, 1 task thuộc 1 creator
- ✅ `getAllTasks` - lấy tất cả task
- ✅ `getByUsername` - lấy task theo username
- ✅ `getTodayTasks` - task trong ngày
- ✅ `getPendingTasks` - task chưa hoàn thành
- ✅ `getTasksByLastName` - task của user có họ Nguyễn (hoặc họ khác)

### Level 2 - Giao diện EJS
- ✅ Trang chính với input, nút thêm, danh sách (ul)
- ✅ Thêm công việc vào danh sách
- ✅ Nút Xóa cho từng task
- ✅ **Progress Bar Bootstrap** hiển thị tiến độ hoàn thành
- ✅ Thống kê (tổng/hoàn thành/chưa xong/hôm nay)
- ✅ Filter (Tất cả / Chưa xong / Hoàn thành / Hôm nay)
- ✅ UI đẹp với Bootstrap 5

### Level 3 - Phân quyền & Multi-assignee
- ✅ 2 role: **admin** và **normal**
- ✅ Admin có thể phân task cho nhiều user
- ✅ 1 task có nhiều người cùng thực hiện
- ✅ Task chỉ **hoàn thành khi TẤT CẢ** người được assign đều done
- ✅ Mỗi người toggle done riêng
- ✅ Progress bar hiển thị % người đã done
- ✅ Admin có nút "Phân công thêm" cho từng task

---

## 🔐 Phân quyền

| Hành động | Normal | Admin |
|-----------|--------|-------|
| Tạo task (chỉ cho bản thân) | ✅ | ✅ |
| Tạo task & assign nhiều người | ❌ | ✅ |
| Toggle done task của mình | ✅ | ✅ |
| Phân công thêm vào task | ❌ | ✅ |
| Xóa task của mình | ✅ | ✅ |
| Xóa task của người khác | ❌ | ✅ |
| Xem tất cả task | ❌ | ✅ |

---

## 💡 Lưu ý

- Khi đăng ký, **họ** (`lastName`) được tự động tách từ ký tự đầu tiên của `fullName`
  - VD: fullName = "Nguyễn Văn A" → lastName = "Nguyễn"
- API endpoint `/tasks/api/getTasksByLastName/nguyễn` không phân biệt hoa/thường
- Tất cả API đều yêu cầu đăng nhập (session-based authentication)
