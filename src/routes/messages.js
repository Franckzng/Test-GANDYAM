// routes/messages.js
import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { auth } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// --- Multer config pour upload de fichiers ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage });

// --- Récupérer les messages d'une conversation ---
router.get("/:conversationId", auth, async (req, res) => {
  const { conversationId } = req.params;
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: Number(conversationId) },
      orderBy: { createdAt: "asc" },
    });
    res.json(messages);
  } catch (err) {
    console.error("Erreur récupération messages:", err);
    res.status(500).json({ error: "Impossible de récupérer les messages" });
  }
});

// --- Envoyer un message texte ---
router.post("/:conversationId", auth, async (req, res) => {
  const io = req.app.get("io");
  const { conversationId } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Contenu du message requis" });
  }

  try {
    const msg = await prisma.message.create({
      data: {
        conversationId: Number(conversationId),
        senderId: req.user.id,
        type: "TEXT",
        content,
      },
    });

    io.to(`conv:${conversationId}`).emit("new_message", msg);
    res.status(201).json(msg);
  } catch (err) {
    console.error("Erreur envoi message:", err);
    res.status(500).json({ error: "Impossible d'envoyer le message" });
  }
});

// --- Envoyer un fichier (image/audio/video) ---
router.post("/:conversationId/upload", auth, upload.single("file"), async (req, res) => {
  const io = req.app.get("io");
  const { conversationId } = req.params;
  const { type } = req.body;

  if (!req.file || !type) {
    return res.status(400).json({ error: "Fichier ou type manquant" });
  }

  try {
    // Construire une URL absolue
    const baseUrl = process.env.BASE_URL || "http://localhost:4000";
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    const msg = await prisma.message.create({
      data: {
        conversationId: Number(conversationId),
        senderId: req.user.id,
        type,
        content: fileUrl,
      },
    });

    io.to(`conv:${conversationId}`).emit("new_message", msg);
    res.status(201).json(msg);
  } catch (err) {
    console.error("Erreur upload message:", err);
    res.status(500).json({ error: "Impossible d'envoyer le fichier" });
  }
});

export default router;
