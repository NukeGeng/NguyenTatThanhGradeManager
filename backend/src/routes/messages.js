const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const auth = require("../middleware/auth");
const Message = require("../models/Message");
const Department = require("../models/Department");

const router = express.Router();

router.use(auth);

// ── Upload ảnh cho tin nhắn ──────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "messages");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(
      null,
      `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`,
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)"));
    }
  },
});

router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Không có file ảnh" });
  }
  const imageUrl = `/uploads/messages/${req.file.filename}`;
  return res.status(200).json({ success: true, data: { imageUrl } });
});

const getDepartmentIds = (user) =>
  (user.departmentIds || []).map((item) => String(item?._id || item));

const getDepartmentRooms = async (user) => {
  if (user.role === "admin") {
    const departments = await Department.find({ isActive: { $ne: false } })
      .select("_id code name")
      .sort({ code: 1 })
      .lean();

    return departments.map((department) => ({
      roomId: `dept_${department._id}`,
      roomType: "department",
      roomName: String(department.name || department.code || "Nhóm khoa"),
      roomCode: String(department.code || ""),
    }));
  }

  const departmentIds = getDepartmentIds(user);
  const departments = await Department.find({ _id: { $in: departmentIds } })
    .select("_id code name")
    .sort({ code: 1 })
    .lean();

  return departments.map((department) => ({
    roomId: `dept_${department._id}`,
    roomType: "department",
    roomName: String(department.name || department.code || "Nhóm khoa"),
    roomCode: String(department.code || ""),
  }));
};

const getDirectRoomIds = async (user) =>
  Message.distinct("roomId", {
    roomType: "direct",
    $or: [{ senderId: user._id }, { readBy: user._id }],
  });

const canAccessRoom = (user, roomId) => {
  if (user.role === "admin") {
    return true;
  }

  if (String(roomId).startsWith("dept_")) {
    const departmentId = String(roomId).replace("dept_", "");
    return getDepartmentIds(user).includes(departmentId);
  }

  if (String(roomId).startsWith("direct_")) {
    const userId = String(user._id);
    return String(roomId).includes(userId);
  }

  return false;
};

const unreadFilter = (user) => ({
  senderId: { $ne: user._id },
  roomId: { $exists: true },
  readBy: { $nin: [user._id] },
});

router.get("/rooms", async (req, res, next) => {
  try {
    const [departmentRooms, directRoomIds] = await Promise.all([
      getDepartmentRooms(req.user),
      getDirectRoomIds(req.user),
    ]);

    const roomMap = new Map();

    departmentRooms.forEach((room) => {
      roomMap.set(room.roomId, room);
    });

    directRoomIds.forEach((roomId) => {
      roomMap.set(roomId, {
        roomId,
        roomType: "direct",
        roomName: "Trao đổi trực tiếp",
        roomCode: "",
      });
    });

    const roomIds = Array.from(roomMap.keys());

    const rooms = [];
    for (const roomId of roomIds) {
      if (!canAccessRoom(req.user, roomId)) {
        continue;
      }

      const [lastMessage, unreadCount] = await Promise.all([
        Message.findOne({ roomId }).sort({ createdAt: -1 }),
        Message.countDocuments({ ...unreadFilter(req.user), roomId }),
      ]);

      const roomMeta = roomMap.get(roomId) || {};

      rooms.push({
        roomId,
        roomType: String(roomId).startsWith("dept_") ? "department" : "direct",
        roomName: roomMeta.roomName || "Phòng chat",
        roomCode: roomMeta.roomCode || "",
        unreadCount,
        lastMessage,
      });
    }

    rooms.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: rooms,
      message: "Get message rooms successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/unread-count", async (req, res, next) => {
  try {
    const [departmentRooms, directRoomIds] = await Promise.all([
      getDepartmentRooms(req.user),
      getDirectRoomIds(req.user),
    ]);

    const allowedRoomIds = Array.from(
      new Set([
        ...departmentRooms.map((room) => room.roomId),
        ...directRoomIds,
      ]),
    );

    const roomFilter =
      allowedRoomIds.length > 0
        ? { roomId: { $in: allowedRoomIds } }
        : { _id: null };

    const count = await Message.countDocuments({
      ...roomFilter,
      ...unreadFilter(req.user),
    });

    return res.status(200).json({
      success: true,
      data: { unreadCount: count },
      message: "Get unread count successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:roomId", async (req, res, next) => {
  try {
    const { roomId } = req.params;
    if (!canAccessRoom(req.user, roomId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập phòng chat này",
      });
    }

    const limit = 50;
    const query = { roomId };

    if (req.query.before && mongoose.Types.ObjectId.isValid(req.query.before)) {
      query._id = { $lt: req.query.before };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate("senderId", "_id name email avatar");

    return res.status(200).json({
      success: true,
      data: messages.reverse(),
      message: "Get room messages successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (String(message.senderId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Chỉ được xóa tin nhắn của chính mình",
      });
    }

    await Message.findByIdAndDelete(message._id);

    return res.status(200).json({
      success: true,
      data: message,
      message: "Delete message successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
