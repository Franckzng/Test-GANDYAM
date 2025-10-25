import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { prisma } from "../prismaClient.js";

const router = Router();

// Lister tous les utilisateurs sauf l'utilisateur connecté
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  const users = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: { id: true, email: true },
  });

  res.json(users);
});

export default router;
