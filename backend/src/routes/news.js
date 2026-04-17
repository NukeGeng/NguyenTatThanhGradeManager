const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const News = require("../models/News");

const router = express.Router();

// ── Image upload setup ───────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "news");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(
      null,
      `news_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`,
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)"));
    }
  },
});

// ── GET /api/news — public, filter by category, paginated ───────────────────
router.get("/", async (req, res, next) => {
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };
    if (category && category !== "all") {
      filter.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      News.find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-content")
        .lean(),
      News.countDocuments(filter),
    ]);

    return res.json({ success: true, data: items, total });
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/news/:id — public, full content ────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const item = await News.findById(req.params.id).lean();
    if (!item || !item.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tin tức" });
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    return next(err);
  }
});

// ── POST /api/news — admin only, with optional image ────────────────────────
router.post(
  "/",
  auth,
  adminOnly,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { title, summary, content, category, publishedAt } = req.body;
      if (!title || !title.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Tiêu đề là bắt buộc" });
      }

      const imageUrl = req.file ? `/uploads/news/${req.file.filename}` : "";

      const item = await News.create({
        title: title.trim(),
        summary: (summary || "").trim(),
        content: content || "",
        imageUrl,
        category: category || "khac",
        authorId: req.user._id,
        authorName: req.user.name || "",
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      });

      return res.status(201).json({ success: true, data: item });
    } catch (err) {
      return next(err);
    }
  },
);

// ── PUT /api/news/:id — admin only, with optional new image ─────────────────
router.put(
  "/:id",
  auth,
  adminOnly,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const item = await News.findById(req.params.id);
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy tin tức" });
      }

      const { title, summary, content, category, publishedAt, isActive } =
        req.body;
      if (title !== undefined) item.title = title.trim();
      if (summary !== undefined) item.summary = summary.trim();
      if (content !== undefined) item.content = content;
      if (category !== undefined) item.category = category;
      if (publishedAt !== undefined) item.publishedAt = new Date(publishedAt);
      if (isActive !== undefined)
        item.isActive = isActive === "true" || isActive === true;

      if (req.file) {
        // Remove old image file
        if (item.imageUrl) {
          const oldPath = path.join(
            __dirname,
            "..",
            "..",
            item.imageUrl.replace(/^\//, ""),
          );
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        item.imageUrl = `/uploads/news/${req.file.filename}`;
      }

      await item.save();
      return res.json({ success: true, data: item });
    } catch (err) {
      return next(err);
    }
  },
);

// ── DELETE /api/news/:id — admin only ───────────────────────────────────────
router.delete("/:id", auth, adminOnly, async (req, res, next) => {
  try {
    const item = await News.findById(req.params.id);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tin tức" });
    }

    if (item.imageUrl) {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        item.imageUrl.replace(/^\//, ""),
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await item.deleteOne();
    return res.json({ success: true, message: "Đã xóa tin tức" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
