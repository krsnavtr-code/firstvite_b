import express from "express";
import { getSecretContactData } from "../controller/secretContactController.js";
import { verifySecretKey } from "../middleware/secretKeyMiddleware.js";

const router = express.Router();

// Supported routes:
// GET /api/contact-data (with header x-secret-key / Authorization or query ?secret_key=...)
// GET /api/contact-data/:secretKey
router.get("/", verifySecretKey, getSecretContactData);
router.get("/:secretKey", verifySecretKey, getSecretContactData);

export default router;
