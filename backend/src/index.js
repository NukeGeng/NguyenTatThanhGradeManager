const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const http = require("http");

const connectDatabase = require("./config/database");
const authRoutes = require("./routes/auth");
const departmentRoutes = require("./routes/departments");
const userRoutes = require("./routes/users");
const schoolYearRoutes = require("./routes/schoolYears");
const subjectRoutes = require("./routes/subjects");
const classRoutes = require("./routes/classes");
const gradeRoutes = require("./routes/grades");
const studentRoutes = require("./routes/students");
const predictionRoutes = require("./routes/predictions");
const majorRoutes = require("./routes/majors");
const curriculumRoutes = require("./routes/curricula");
const studentCurriculumRoutes = require("./routes/studentCurricula");
const messageRoutes = require("./routes/messages");
const newsRoutes = require("./routes/news");
const setupSocket = require("./socket");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

setupSocket(httpServer);

app.use(cors());
app.use(express.json());
app.use(
  "/uploads",
  express.static(require("path").join(__dirname, "..", "uploads")),
);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/school-years", schoolYearRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/majors", majorRoutes);
app.use("/api/curricula", curriculumRoutes);
app.use("/api/student-curricula", studentCurriculumRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/news", newsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

const startServer = async () => {
  await connectDatabase();

  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
