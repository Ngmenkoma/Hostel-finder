const pool = require("../config/db");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

async function assertOwnsHostel(hostelId, user) {
  const { rows } = await pool.query("SELECT landlord_id FROM hostels WHERE id = $1", [hostelId]);
  if (!rows.length) throw new ApiError(404, "Hostel not found");
  if (user.role !== "admin" && rows[0].landlord_id !== user.id) {
    throw new ApiError(403, "You can only manage your own hostel listings");
  }
}

// GET /api/hostels — list view (home.js fetches rooms separately per hostel)
const listHostels = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, landlord_id, name, location, distance_from_campus_km, amenities, description, cover_image_url
     FROM hostels ORDER BY created_at DESC`
  );
  res.json(rows);
});

// GET /api/hostels/:id — detail view, rooms embedded (hostel.js reads hostel.rooms directly)
const getHostel = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, landlord_id, name, location, distance_from_campus_km, amenities, description, cover_image_url
     FROM hostels WHERE id = $1`,
    [req.params.id]
  );
  if (!rows.length) throw new ApiError(404, "Hostel not found");

  const { rows: rooms } = await pool.query(
    `SELECT id, hostel_id, room_type, price_per_semester, total_slots, available_slots
     FROM rooms WHERE hostel_id = $1 ORDER BY price_per_semester ASC`,
    [req.params.id]
  );

  res.json({ ...rows[0], rooms });
});

// POST /api/hostels — landlord only
const createHostel = asyncHandler(async (req, res) => {
  const { name, location, distanceFromCampusKm, amenities, description } = req.body;
  if (!name || !location) throw new ApiError(400, "Hostel name and location are required");

  const { rows } = await pool.query(
    `INSERT INTO hostels (landlord_id, name, location, distance_from_campus_km, amenities, description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, name.trim(), location.trim(), distanceFromCampusKm || null, amenities || null, description || null]
  );
  res.status(201).json(rows[0]);
});

// PUT /api/hostels/:id — owner landlord or admin
const updateHostel = asyncHandler(async (req, res) => {
  await assertOwnsHostel(req.params.id, req.user);
  const { name, location, distanceFromCampusKm, amenities, description } = req.body;

  const { rows } = await pool.query(
    `UPDATE hostels SET
       name = COALESCE($1, name),
       location = COALESCE($2, location),
       distance_from_campus_km = COALESCE($3, distance_from_campus_km),
       amenities = COALESCE($4, amenities),
       description = COALESCE($5, description)
     WHERE id = $6 RETURNING *`,
    [name, location, distanceFromCampusKm, amenities, description, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/hostels/:id — owner landlord or admin
const deleteHostel = asyncHandler(async (req, res) => {
  await assertOwnsHostel(req.params.id, req.user);
  await pool.query("DELETE FROM hostels WHERE id = $1", [req.params.id]);
  res.status(204).send();
});

// POST /api/hostels/:id/image — multipart upload, stored in S3, URL saved to cover_image_url
const uploadCoverImage = asyncHandler(async (req, res) => {
  await assertOwnsHostel(req.params.id, req.user);
  if (!req.file) throw new ApiError(400, "No image file received");

  const { rows } = await pool.query(
    "UPDATE hostels SET cover_image_url = $1 WHERE id = $2 RETURNING id, cover_image_url",
    [req.file.location, req.params.id]
  );
  res.json(rows[0]);
});

module.exports = { listHostels, getHostel, createHostel, updateHostel, deleteHostel, uploadCoverImage, assertOwnsHostel };
