const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const Message = require("./models/Message");
const User = require("./models/User");
const Department = require("./models/Department");

const getDepartmentIds = (user) =>
  (user.departmentIds || []).map((item) => String(item?._id || item));

const normalizeDirectRoomId = (roomId, userId) => {
  const value = String(roomId || "");
  if (!value.startsWith("direct_")) {
    return null;
  }

  const ids = value
    .replace("direct_", "")
    .split("_")
    .map((item) => item.trim())
    .filter(Boolean);

  if (ids.length !== 2 || !ids.includes(userId)) {
    return null;
  }

  const sorted = [...ids].sort();
  return `direct_${sorted[0]}_${sorted[1]}`;
};

module.exports = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:4200", "http://localhost:3000"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id)
        .select("_id name email role departmentIds")
        .populate("departmentIds", "_id code");

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = user;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    const userId = String(user._id);

    const joinDepartmentRooms = async () => {
      let departmentIds = getDepartmentIds(user);

      if (user.role === "admin") {
        const departments = await Department.find({ isActive: { $ne: false } })
          .select("_id")
          .lean();
        departmentIds = departments.map((department) => String(department._id));
      }

      const departmentRooms = departmentIds.map((id) => `dept_${id}`);
      departmentRooms.forEach((roomId) => socket.join(roomId));
    };

    joinDepartmentRooms().catch(() => {
      // ignore auto join error
    });

    socket.on("join_room", (payload = {}) => {
      const { roomId } = payload;
      if (!roomId) {
        return;
      }

      let targetRoomId = roomId;

      if (String(roomId).startsWith("dept_")) {
        const departmentId = String(roomId).replace("dept_", "");
        if (
          !getDepartmentIds(user).includes(departmentId) &&
          user.role !== "admin"
        ) {
          return;
        }
      }

      const normalizedDirect = normalizeDirectRoomId(roomId, userId);
      if (
        String(roomId).startsWith("direct_") &&
        !normalizedDirect &&
        user.role !== "admin"
      ) {
        return;
      }

      if (normalizedDirect) {
        targetRoomId = normalizedDirect;
      }

      socket.join(targetRoomId);
    });

    socket.on("leave_room", (payload = {}) => {
      const { roomId } = payload;
      if (!roomId) {
        return;
      }

      socket.leave(roomId);
    });

    socket.on("send_message", async (payload = {}) => {
      try {
        const roomId = String(payload.roomId || "").trim();
        const roomType =
          payload.roomType === "direct" ? "direct" : "department";
        const messageType = ["text", "image", "form"].includes(
          payload.messageType,
        )
          ? payload.messageType
          : "text";
        const content = String(payload.content || "").trim();
        const imageUrl = String(payload.imageUrl || "").trim();
        const formTitle = String(payload.formTitle || "")
          .trim()
          .slice(0, 200);

        if (!roomId) {
          return;
        }

        // Validation per message type
        if (messageType === "text" && !content) return;
        if (messageType === "image" && !imageUrl) return;
        if (messageType === "form" && !formTitle && !content && !imageUrl)
          return;

        if (content.length > 2000) {
          return;
        }

        const normalizedDirect = normalizeDirectRoomId(roomId, userId);
        const targetRoomId = normalizedDirect || roomId;
        if (
          roomType === "direct" &&
          !normalizedDirect &&
          user.role !== "admin"
        ) {
          return;
        }

        if (roomType === "department") {
          const departmentId = roomId.replace("dept_", "");
          if (
            !getDepartmentIds(user).includes(departmentId) &&
            user.role !== "admin"
          ) {
            return;
          }
        }

        const message = await Message.create({
          roomId: targetRoomId,
          roomType,
          senderId: user._id,
          senderName: user.name,
          content,
          messageType,
          imageUrl,
          formTitle,
          isRead: false,
          readBy: [user._id],
        });

        const populatedMessage = await Message.findById(message._id).populate(
          "senderId",
          "_id name email avatar",
        );

        io.to(targetRoomId).emit("new_message", populatedMessage);
      } catch (error) {
        // ignore socket message error
      }
    });

    socket.on("mark_read", async (payload = {}) => {
      try {
        const roomId = String(payload.roomId || "").trim();
        if (!roomId) {
          return;
        }

        await Message.updateMany(
          {
            roomId,
            senderId: { $ne: user._id },
            readBy: { $nin: [user._id] },
          },
          {
            $addToSet: { readBy: user._id },
            $set: { isRead: true },
          },
        );

        io.to(roomId).emit("room_read", { roomId, userId });
      } catch (error) {
        // ignore mark read error
      }
    });

    socket.on("typing", (payload = {}) => {
      const roomId = String(payload.roomId || "").trim();
      if (!roomId) {
        return;
      }

      socket.to(roomId).emit("user_typing", {
        roomId,
        userId,
        userName: user.name,
      });
    });
  });

  return io;
};
