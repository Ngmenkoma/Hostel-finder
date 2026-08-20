const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const { upload } = require("../config/s3");
const {
  listHostels, getHostel, createHostel, updateHostel, deleteHostel, uploadCoverImage,
} = require("../controllers/hostels.controller");

const router = express.Router();

router.get("/", listHostels);
router.get("/:id", getHostel);
router.post("/", verifyToken, requireRole("landlord", "admin"), createHostel);
router.put("/:id", verifyToken, requireRole("landlord", "admin"), updateHostel);
router.delete("/:id", verifyToken, requireRole("landlord", "admin"), deleteHostel);
router.post("/:id/image", verifyToken, requireRole("landlord", "admin"), upload.single("image"), uploadCoverImage);

module.exports = router;
