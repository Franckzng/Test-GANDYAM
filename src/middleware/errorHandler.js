// Middleware global de gestion des erreurs
export function errorHandler(err, req, res, next) {
  console.error("❌ Erreur capturée :", err);

  // Prisma errors
  if (err.code && err.code.startsWith("P")) {
    return res.status(400).json({
      error: "Erreur base de données",
      details: err.message,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Token invalide" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expiré" });
  }

  // Erreurs de validation ou autres
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Fallback générique
  res.status(500).json({
    error: "Erreur interne du serveur",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
}
