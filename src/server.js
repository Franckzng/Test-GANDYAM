import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import conversationRoutes from "./routes/conversations.js";
import messageRoutes from "./routes/messages.js";
import usersRouter from "./routes/users.js";
import uploadRouter from "./routes/upload.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ✅ Domaine frontend autorisé
const FRONTEND_URL = process.env.FRONTEND_URL || "https://ligdi-chat-frontend.vercel.app";

// --- Config globale ---
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(requestLogger);

// ✅ Servir les fichiers uploadés
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      // Définir Content-Type correct
      if (filePath.endsWith(".png")) res.setHeader("Content-Type", "image/png");
      if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) res.setHeader("Content-Type", "image/jpeg");
      if (filePath.endsWith(".webp")) res.setHeader("Content-Type", "image/webp");
      if (filePath.endsWith(".gif")) res.setHeader("Content-Type", "image/gif");
      if (filePath.endsWith(".mp4")) res.setHeader("Content-Type", "video/mp4");
      if (filePath.endsWith(".webm")) res.setHeader("Content-Type", "video/webm");
      if (filePath.endsWith(".mp3")) res.setHeader("Content-Type", "audio/mpeg");
      if (filePath.endsWith(".wav")) res.setHeader("Content-Type", "audio/wav");

      // Autoriser l’accès cross-origin
      res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
    },
  })
);

// --- Route d’accueil (évite le 404 sur Render) ---
app.get("/", (req, res) => {
  res.send("✅ Backend Ligdi Chat est en ligne et fonctionne correctement !");
});

// --- Socket.IO avec CORS configuré ---
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// --- Gestion des utilisateurs connectés ---
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("✅ Nouveau client connecté :", socket.id);

  socket.on("user_connected", (user) => {
    onlineUsers.set(user.id, socket.id);
    io.emit("user_status", { userId: user.id, status: "online" });
    console.log(`🔵 ${user.email} est en ligne`);
  });

  socket.on("join_conversation", (conversationId) => {
    socket.join(`conv:${conversationId}`);
    console.log(`➡️ Socket ${socket.id} a rejoint conv:${conversationId}`);
  });

  socket.on("leave_conversation", (conversationId) => {
    socket.leave(`conv:${conversationId}`);
    console.log(`⬅️ Socket ${socket.id} a quitté conv:${conversationId}`);
  });

  socket.on("typing", ({ conversationId, user }) => {
    socket.to(`conv:${conversationId}`).emit("typing", { user });
  });

  socket.on("stop_typing", ({ conversationId, user }) => {
    socket.to(`conv:${conversationId}`).emit("stop_typing", { user });
  });

  socket.on("disconnect", () => {
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        io.emit("user_status", { userId, status: "offline" });
        console.log(`⚪ Utilisateur ${userId} est hors ligne`);
        break;
      }
    }
    console.log("❌ Client déconnecté :", socket.id);
  });
});

app.set("io", io);

// --- Routes API ---
app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", usersRouter);
app.use("/api/upload", uploadRouter); // ✅ ajout de la route upload

// --- Middleware global d'erreurs ---
app.use(errorHandler);

// --- Lancement du serveur ---
const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${BASE_URL}`);
});
