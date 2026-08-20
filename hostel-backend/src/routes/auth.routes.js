const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, me } = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// Slows down brute-force attempts against login/register without
// affecting normal browsing traffic elsewhere in the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", verifyToken, me);

module.exports = router;
