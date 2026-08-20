const pool = require("../config/db");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");
const { assertOwnsHostel } = require("./hostels.controller");

const ROOM_TYPES = ["single", "shared_2", "shared_4", "shared_6"];

// GET /api/rooms/hostel/:hostelId — used by both home.js (list view) and hostel.js
const listRoomsForHostel = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, hostel_id, room_type, price_per_semester, total_slots, available_slots
     FROM rooms WHERE hostel_id = $1 ORDER BY price_per_semester ASC`,
    [req.params.hostelId]
  );
  res.json(rows);
});

// POST /api/rooms — landlord only, must own hostelId
const createRoom = asyncHandler(async (req, res) => {
  const { hostelId, roomType, pricePerSemester, totalSlots } = req.body;

  if (!hostelId || !roomType || !pricePerSemester || !totalSlots) {
    throw new ApiError(400, "hostelId, roomType, pricePerSemester, and totalSlots are required");
  }
  if (!ROOM_TYPES.includes(roomType)) {
    throw new ApiError(400, `roomType must be one of: ${ROOM_TYPES.join(", ")}`);
  }
  if (Number(pricePerSemester) <= 0 || Number(totalSlots) <= 0) {
    throw new ApiError(400, "pricePerSemester and totalSlots must be greater than 0");
  }

  await assertOwnsHostel(hostelId, req.user);

  const { rows } = await pool.query(
    `INSERT INTO rooms (hostel_id, room_type, price_per_semester, total_slots, available_slots)
     VALUES ($1,$2,$3,$4,$4) RETURNING *`,
    [hostelId, roomType, pricePerSemester, totalSlots]
  );
  res.status(201).json(rows[0]);
});

async function assertOwnsRoom(roomId, user) {
  const { rows } = await pool.query(
    `SELECT h.landlord_id FROM rooms r JOIN hostels h ON r.hostel_id = h.id WHERE r.id = $1`,
    [roomId]
  );
  if (!rows.length) throw new ApiError(404, "Room not found");
  if (user.role !== "admin" && rows[0].landlord_id !== user.id) {
    throw new ApiError(403, "You can only manage rooms in your own hostels");
  }
}

// PUT /api/rooms/:id — landlord only, must own the parent hostel
const updateRoom = asyncHandler(async (req, res) => {
  await assertOwnsRoom(req.params.id, req.user);
  const { roomType, pricePerSemester, totalSlots } = req.body;

  if (roomType && !ROOM_TYPES.includes(roomType)) {
    throw new ApiError(400, `roomType must be one of: ${ROOM_TYPES.join(", ")}`);
  }

  // If totalSlots changes, keep available_slots consistent rather than
  // letting it exceed the new total (schema also enforces this via CHECK).
  const { rows: current } = await pool.query("SELECT total_slots, available_slots FROM rooms WHERE id = $1", [req.params.id]);
  let newAvailable = current[0].available_slots;
  if (totalSlots != null) {
    const bookedCount = current[0].total_slots - current[0].available_slots;
    newAvailable = Math.max(0, Number(totalSlots) - bookedCount);
  }

  const { rows } = await pool.query(
    `UPDATE rooms SET
       room_type = COALESCE($1, room_type),
       price_per_semester = COALESCE($2, price_per_semester),
       total_slots = COALESCE($3, total_slots),
       available_slots = $4
     WHERE id = $5 RETURNING *`,
    [roomType, pricePerSemester, totalSlots, newAvailable, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/rooms/:id
const deleteRoom = asyncHandler(async (req, res) => {
  await assertOwnsRoom(req.params.id, req.user);
  await pool.query("DELETE FROM rooms WHERE id = $1", [req.params.id]);
  res.status(204).send();
});

module.exports = { listRoomsForHostel, createRoom, updateRoom, deleteRoom, assertOwnsRoom };
