import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import path from "path";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

app.use("/api/auth", authRoutes);

// Make ready for deployment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
