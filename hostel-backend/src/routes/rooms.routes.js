const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const { listRoomsForHostel, createRoom, updateRoom, deleteRoom } = require("../controllers/rooms.controller");

const router = express.Router();

router.get("/hostel/:hostelId", listRoomsForHostel);
router.post("/", verifyToken, requireRole("landlord", "admin"), createRoom);
router.put("/:id", verifyToken, requireRole("landlord", "admin"), updateRoom);
router.delete("/:id", verifyToken, requireRole("landlord", "admin"), deleteRoom);

module.exports = router;
