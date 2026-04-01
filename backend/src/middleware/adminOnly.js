const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Chỉ Admin mới có quyền thực hiện",
    });
  }

  return next();
};

module.exports = adminOnly;
