const pool = require("../config/db");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const SEMESTERS = ["first", "second", "full_year"];

// GET /api/bookings/mine — student's own bookings (bookings.js)
const myBookings = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.academic_year, b.semester, b.amount_due, b.status, b.created_at,
            r.room_type, h.name AS hostel_name, h.location
     FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     JOIN hostels h ON r.hostel_id = h.id
     WHERE b.student_id = $1
     ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/bookings/landlord — bookings across the landlord's hostels (admin sees all)
const landlordBookings = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const { rows } = await pool.query(
    `SELECT b.id, b.academic_year, b.semester, b.amount_due, b.status, b.created_at,
            r.room_type, h.name AS hostel_name, h.landlord_id,
            u.full_name AS student_name
     FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     JOIN hostels h ON r.hostel_id = h.id
     JOIN users u ON b.student_id = u.id
     WHERE $1 OR h.landlord_id = $2
     ORDER BY b.created_at DESC`,
    [isAdmin, req.user.id]
  );
  res.json(rows);
});

// POST /api/bookings — student books a room for a given academic year/semester.
// Locks the room row to prevent two concurrent bookings from over-selling slots.
const createBooking = asyncHandler(async (req, res) => {
  const { roomId, academicYear, semester } = req.body;
  if (!roomId || !academicYear || !semester) {
    throw new ApiError(400, "roomId, academicYear, and semester are required");
  }
  if (!SEMESTERS.includes(semester)) {
    throw new ApiError(400, `semester must be one of: ${SEMESTERS.join(", ")}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: roomRows } = await client.query(
      "SELECT id, price_per_semester, available_slots FROM rooms WHERE id = $1 FOR UPDATE",
      [roomId]
    );
    if (!roomRows.length) throw new ApiError(404, "Room not found");
    if (roomRows[0].available_slots <= 0) throw new ApiError(409, "This room type is fully booked");

    const amountDue = roomRows[0].price_per_semester;

    const { rows: bookingRows } = await client.query(
      `INSERT INTO bookings (student_id, room_id, academic_year, semester, amount_due, status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id`,
      [req.user.id, roomId, academicYear, semester, amountDue]
    );

    await client.query("UPDATE rooms SET available_slots = available_slots - 1 WHERE id = $1", [roomId]);

    await client.query("COMMIT");
    res.status(201).json({ id: bookingRows[0].id, amountDue: Number(amountDue), status: "pending" });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// PUT /api/bookings/:id/status — landlord confirms/declines, admin can set any status.
// Restores the room slot when a pending/confirmed booking is cancelled.
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "confirmed", "cancelled", "completed"];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `status must be one of: ${allowed.join(", ")}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT b.status, b.room_id, h.landlord_id
       FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN hostels h ON r.hostel_id = h.id
       WHERE b.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!rows.length) throw new ApiError(404, "Booking not found");
    if (req.user.role !== "admin" && rows[0].landlord_id !== req.user.id) {
      throw new ApiError(403, "You can only manage bookings for your own hostels");
    }

    const wasActive = rows[0].status === "pending" || rows[0].status === "confirmed";
    const nowCancelled = status === "cancelled";

    await client.query("UPDATE bookings SET status = $1 WHERE id = $2", [status, req.params.id]);

    if (wasActive && nowCancelled) {
      await client.query("UPDATE rooms SET available_slots = available_slots + 1 WHERE id = $1", [rows[0].room_id]);
    }

    await client.query("COMMIT");
    res.json({ id: Number(req.params.id), status });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { myBookings, landlordBookings, createBooking, updateBookingStatus };
