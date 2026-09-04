import express from "express";
import { submitLead, submitBulkLeads } from "../controller/leadController.js";

const router = express.Router();

router.post("/submit", submitLead);
router.post("/bulk", submitBulkLeads);

export default router;
