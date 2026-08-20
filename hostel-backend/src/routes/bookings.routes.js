const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const { myBookings, landlordBookings, createBooking, updateBookingStatus } = require("../controllers/bookings.controller");

const router = express.Router();

router.get("/mine", verifyToken, requireRole("student", "admin"), myBookings);
router.get("/landlord", verifyToken, requireRole("landlord", "admin"), landlordBookings);
router.post("/", verifyToken, requireRole("student", "admin"), createBooking);
router.put("/:id/status", verifyToken, requireRole("landlord", "admin"), updateBookingStatus);

module.exports = router;
