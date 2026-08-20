const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// Shape the frontend's setSession(token, user) expects: user.fullName, user.email, user.role, user.id
function toPublicUser(row) {
  return { id: row.id, fullName: row.full_name, email: row.email, phone: row.phone, role: row.role };
}

const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, role } = req.body;

  if (!fullName || !email || !password) {
    throw new ApiError(400, "Full name, email, and password are required");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }
  // Only student/landlord may self-register — admin accounts are seeded/promoted manually.
  const safeRole = role === "landlord" ? "landlord" : "student";

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
  if (existing.rows.length) {
    throw new ApiError(409, "An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, email, phone, role`,
    [fullName.trim(), email.toLowerCase().trim(), phone || null, passwordHash, safeRole]
  );

  const user = toPublicUser(rows[0]);
  res.status(201).json({ token: signToken(user), user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
  if (!rows.length) {
    throw new ApiError(401, "Incorrect email or password");
  }

  const match = await bcrypt.compare(password, rows[0].password_hash);
  if (!match) {
    throw new ApiError(401, "Incorrect email or password");
  }

  const user = toPublicUser(rows[0]);
  res.json({ token: signToken(user), user });
});

const me = asyncHandler(async (req, res) => {
  const { rows } = await pool.query("SELECT id, full_name, email, phone, role FROM users WHERE id = $1", [req.user.id]);
  if (!rows.length) throw new ApiError(404, "User not found");
  res.json(toPublicUser(rows[0]));
});

module.exports = { register, login, me };
