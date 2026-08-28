/**
 * Middleware to verify secret key for protected external contact API
 */
export const verifySecretKey = (req, res, next) => {
  const allowedKeys = [
    process.env.CONTACT_SECRET_KEY,
    process.env.SECRET_KEY,
    process.env.CONTACT_API_KEY,
    "eklabya_contact_secret_key_2026",
    "firstvite_data_importing_in_origanation_id_1_FV",
  ].filter(Boolean);

  const authHeader = req.headers["authorization"] || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader;

  const providedKey =
    req.headers["x-secret-key"] ||
    req.headers["x-api-key"] ||
    req.headers["secret-key"] ||
    bearerToken ||
    req.query.secret_key ||
    req.query.secretKey ||
    req.query.apiKey ||
    req.query.key ||
    req.query.token ||
    req.params.secretKey ||
    req.params.token;

  if (!providedKey || !allowedKeys.includes(String(providedKey).trim())) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing secret key",
    });
  }

  next();
};
