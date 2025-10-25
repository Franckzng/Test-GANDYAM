import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { prisma } from "../prismaClient.js";

const router = Router();

// --- Lister les conversations de l'utilisateur connecté ---
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId }
        ]
      },
      include: {
        userA: true,
        userB: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1 // dernier message
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(conversations);
  } catch (err) {
    console.error("Erreur lors de la récupération des conversations:", err);
    res.status(500).json({ error: "Impossible de récupérer les conversations" });
  }
});

// --- Créer une nouvelle conversation ---
router.post("/", auth, async (req, res) => {
  const userId = req.user.id;
  const { participantEmail } = req.body;

  try {
    const other = await prisma.user.findUnique({ where: { email: participantEmail } });
    if (!other) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // Vérifier si une conversation existe déjà entre ces deux utilisateurs
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: other.id },
          { userAId: other.id, userBId: userId }
        ]
      },
      include: { userA: true, userB: true }
    });

    // Si elle n'existe pas, on la crée
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userAId: userId,
          userBId: other.id
        },
        include: { userA: true, userB: true }
      });
    }

    res.status(201).json(conversation);
  } catch (err) {
    console.error("Erreur lors de la création de la conversation:", err);
    res.status(500).json({ error: "Impossible de créer la conversation" });
  }
});

export default router;
