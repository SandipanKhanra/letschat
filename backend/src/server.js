import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import path from "path";
import { connectDB } from "./lib/db.js";

dotenv.config();
const app = express();
// If running behind a proxy (load balancer) enable trust proxy so secure cookies work
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();
// Middleware
// Get access to req.body
app.use(express.json());
app.use(cookieParser());
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
