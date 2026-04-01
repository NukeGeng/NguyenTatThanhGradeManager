const extractDepartmentId = (req) => {
  if (req.params?.departmentId) return req.params.departmentId;
  if (req.params?.id && req.path?.includes("departments")) return req.params.id;
  if (req.body?.departmentId) return req.body.departmentId;
  if (req.query?.departmentId) return req.query.departmentId;
  return null;
};

const departmentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (req.user.role === "admin") {
    return next();
  }

  const departmentId = extractDepartmentId(req);

  if (!departmentId) {
    return res.status(400).json({
      success: false,
      message: "Thiếu departmentId để kiểm tra quyền truy cập",
    });
  }

  const allowedDepartmentIds = (req.user.departmentIds || []).map((item) =>
    item?._id ? String(item._id) : String(item),
  );

  if (!allowedDepartmentIds.includes(String(departmentId))) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền truy cập khoa này",
    });
  }

  return next();
};

module.exports = departmentAccess;
