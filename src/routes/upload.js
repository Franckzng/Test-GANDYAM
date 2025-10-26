import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// ✅ S'assurer que le dossier uploads existe
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// ✅ Configuration de multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "-" + safeName);
  }
});

// ✅ Types de fichiers autorisés
const allowed = new Set([
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/ogg",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"
]);

const fileFilter = (_req, file, cb) => {
  if (allowed.has(file.mimetype)) cb(null, true);
  else cb(new Error("Type de fichier non autorisé"), false);
};

// ✅ Limite de taille (20 Mo)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Helper pour construire l’URL publique
function publicUrl(filename) {
  const baseUrl = process.env.BASE_URL?.replace(/\/$/, "") || "";
  return `${baseUrl}/uploads/${filename}`;
}

// ✅ Upload d’un seul fichier
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

  res.json({
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: publicUrl(req.file.filename)
  });
});

// ✅ Upload multiple fichiers
router.post("/multi", upload.array("files", 5), (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }
  const items = req.files.map((f) => ({
    filename: f.filename,
    mimetype: f.mimetype,
    size: f.size,
    url: publicUrl(f.filename)
  }));
  res.json({ files: items });
});

export default router;
