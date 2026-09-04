import Lead from "../model/Lead.js";
import catchAsync from "../utils/catchAsync.js";

const LEADSQUARED_BASE =
  process.env.UNEXT_LEADSQUARED_BASE_URL ||
  "https://lapps-in21.leadsquared.com/executebylapptoken";
const LEADSQUARED_NAME =
  process.env.UNEXT_LEADSQUARED_NAME || "da_54036_e738136c";
const LEADSQUARED_STAGE = process.env.UNEXT_LEADSQUARED_STAGE || "Live";
const LEADSQUARED_API_KEY = process.env.UNEXT_LEADSQUARED_API_KEY;

const DEFAULT_SOURCE_MEDIUM = process.env.UNEXT_SOURCE_MEDIUM || "FVEL";
const DEFAULT_LANDING_NUMBER =
  process.env.UNEXT_LANDING_NUMBER || "+91-9810585808";
const DEFAULT_UNIVERSITY = process.env.UNEXT_UNIVERSITY || "MUJ";
const SOURCE = "Agents";

const DEFAULT_MUJ_COURSES = [
  "BBA",
  "MBA",
  "B.Com",
  "M.Com",
  "BCA",
  "MCA",
  "MA.JMC",
  "MA in Economics",
  "MSc in Mathematics",
];

const DEFAULT_SMU_COURSES = [
  "BA",
  "MA in English",
  "MA in Sociology",
  "MA in Political Science",
  "B.Com",
  "M.Com",
  "MCA",
  "MBA",
  "BBA",
];

const COURSE_NAME_MAP = {
  // Undergraduate
  bba: "BBA",
  "bachelor of business administration": "BBA",
  "business administration": "BBA",
  bca: "BCA",
  "bachelor of computer applications": "BCA",
  "computer applications": "BCA",
  "b.com": "B.Com",
  bcom: "B.Com",
  "bachelor of commerce": "B.Com",
  commerce: "B.Com",
  ba: "BBA",
  "bachelor of arts": "BBA",
  arts: "BBA",
  // Postgraduate
  mba: "MBA",
  "master of business administration": "MBA",
  mca: "MCA",
  "master of computer applications": "MCA",
  "m.com": "M.Com",
  mcom: "M.Com",
  "master of commerce": "M.Com",
  "ma.jmc": "MA.JMC",
  "ma jmc": "MA.JMC",
  "journalism mass communication": "MA.JMC",
  "mass communication": "MA.JMC",
  "ma in economics": "MA in Economics",
  "ma economics": "MA in Economics",
  economics: "MA in Economics",
  "ma in english": "MA in English",
  "ma english": "MA in English",
  english: "MA in English",
  "ma in sociology": "MA in Sociology",
  "ma sociology": "MA in Sociology",
  sociology: "MA in Sociology",
  "ma in political science": "MA in Political Science",
  "ma political science": "MA in Political Science",
  "political science": "MA in Political Science",
  // Extra from PDF
  "m.sc in mathematics": "MSc in Mathematics",
  "msc in mathematics": "MSc in Mathematics",
  "msc mathematics": "MSc in Mathematics",
  "m.sc mathematics": "MSc in Mathematics",
  mathematics: "MSc in Mathematics",
};

const mapCourseName = (raw) => {
  const clean = String(raw).toLowerCase().trim();
  if (!clean) return null;
  if (COURSE_NAME_MAP[clean]) return COURSE_NAME_MAP[clean];
  for (const [key, value] of Object.entries(COURSE_NAME_MAP)) {
    if (clean.includes(key) || key.includes(clean)) return value;
  }
  return null;
};

const getAllowedCourses = (university) => {
  const key = String(university).toUpperCase();
  const envKey = key === "SMU" ? "UNEXT_SMU_COURSES" : "UNEXT_MUJ_COURSES";
  if (process.env[envKey]) {
    return process.env[envKey].split(",").map((c) => c.trim());
  }
  return key === "SMU" ? DEFAULT_SMU_COURSES : DEFAULT_MUJ_COURSES;
};

const normalizeCourse = (value, university) => {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("Course is required");
  }

  const allowed = getAllowedCourses(university);

  // Direct mapping of common variations (bcom -> B.Com, etc.)
  const mapped = mapCourseName(raw);
  if (mapped && allowed.includes(mapped)) return mapped;

  // Exact case-insensitive match against allowed list
  const exact = allowed.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  // Fallback to MBA if available, otherwise the first allowed course
  if (allowed.includes("MBA")) return "MBA";
  return allowed[0];
};

const normalizePhone = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Keep digits and the plus sign only.
  let cleaned = raw.replace(/[^\d+]/g, "");

  // If the user wrote the number with a leading 0, drop it.
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("+91") && cleaned.length === 13) {
    return `+91-${cleaned.slice(3)}`;
  }

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+91-${cleaned.slice(2)}`;
  }

  if (cleaned.length === 10) {
    return `+91-${cleaned}`;
  }

  if (cleaned.startsWith("+") && cleaned.length > 3) {
    return cleaned;
  }

  return raw;
};

const validateLead = (data) => {
  const { firstName, email, phone, course, university } = data;
  const missing = [];
  if (!firstName?.trim()) missing.push("firstName");
  if (!email?.trim()) missing.push("email");
  if (!phone?.trim()) missing.push("phone");
  if (!course?.trim()) missing.push("course");

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  const validUniversity = String(
    university || DEFAULT_UNIVERSITY,
  ).toUpperCase();
  if (!["MUJ", "SMU"].includes(validUniversity)) {
    throw new Error(
      `University must be MUJ or SMU. Received: ${validUniversity}`,
    );
  }

  return { validUniversity };
};

const buildPayload = (data) => {
  const university = (data.university || DEFAULT_UNIVERSITY).toUpperCase();
  const course = normalizeCourse(data.course, university);

  return [
    { Attribute: "FirstName", Value: String(data.firstName).trim() },
    {
      Attribute: "EmailAddress",
      Value: String(data.email).trim().toLowerCase(),
    },
    { Attribute: "Phone", Value: normalizePhone(data.phone) },
    { Attribute: "mx_course_applying_for", Value: course },
    { Attribute: "Source", Value: SOURCE },
    {
      Attribute: "SourceMedium",
      Value: data.sourceMedium?.trim() || DEFAULT_SOURCE_MEDIUM,
    },
    {
      Attribute: "mx_Mobile",
      Value: normalizePhone(data.landingNumber || DEFAULT_LANDING_NUMBER),
    },
    { Attribute: "mx_Enquired_University", Value: university },
  ];
};

const pushToLeadSquared = async (data) => {
  if (!LEADSQUARED_API_KEY) {
    throw new Error(
      "UNEXT_LEADSQUARED_API_KEY is not configured. Set it in the server .env file.",
    );
  }

  const { validUniversity } = validateLead(data);
  const payload = buildPayload({ ...data, university: validUniversity });

  const url = `${LEADSQUARED_BASE}?name=${LEADSQUARED_NAME}&stage=${LEADSQUARED_STAGE}&xapikey=${LEADSQUARED_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  let responseData;
  try {
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    throw new Error(
      `LeadSquared API error ${response.status}: ${JSON.stringify(responseData)}`,
    );
  }

  return {
    success: true,
    status: response.status,
    externalResponse: responseData,
  };
};

export const submitLead = catchAsync(async (req, res, next) => {
  const result = await pushToLeadSquared(req.body);

  const lead = await Lead.create({
    ...req.body,
    status: "submitted",
    response: result,
  });

  res.status(200).json({
    success: true,
    message: "Lead submitted successfully",
    data: result,
    lead,
  });
});

export const submitBulkLeads = catchAsync(async (req, res, next) => {
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({
      success: false,
      message: "A non-empty 'leads' array is required",
    });
  }

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const data = { ...lead, source: SOURCE };
      const response = await pushToLeadSquared(data);
      const saved = await Lead.create({
        ...data,
        status: "submitted",
        response,
      });
      results.push({ success: true, lead: data, response, saved });
      passed++;
    } catch (error) {
      const saved = await Lead.create({
        ...lead,
        status: "failed",
        response: { error: error.message },
      });
      results.push({ success: false, lead, error: error.message, saved });
      failed++;
    }
  }

  res.status(200).json({
    success: true,
    total: leads.length,
    passed,
    failed,
    results,
  });
});
