// Kiểm tra đã đăng nhập chưa
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
  res.redirect('/auth/login');
};

// Kiểm tra role admin
exports.isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  req.flash('error', 'Bạn không có quyền thực hiện thao tác này');
  res.redirect('/tasks');
};
