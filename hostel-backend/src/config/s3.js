const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");

// On EC2, credentials come from the attached IAM Role automatically —
// do not set AWS_ACCESS_KEY_ID/SECRET here. This client works both ways.
const s3 = new S3Client({ region: process.env.S3_REGION });

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safeName = `hostel-${req.params.id}-${Date.now()}${ext}`;
      cb(null, `hostel-covers/${safeName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

// multer-s3 exposes the uploaded object's public URL at file.location.
module.exports = { s3, upload };
