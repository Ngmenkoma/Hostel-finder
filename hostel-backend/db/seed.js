// Seeds demo data so the frontend has something to show immediately.
// Usage: npm run seed
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function upsertUser(fullName, email, phone, password, role) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    [fullName, email, phone, hash, role]
  );
  return rows[0].id;
}

async function seed() {
  try {
    console.log("Seeding admin / landlord / student accounts...");
    const adminId = await upsertUser("GCTU Admin", process.env.SEED_ADMIN_EMAIL || "admin@gctuhostels.com", "0240000000", process.env.SEED_ADMIN_PASSWORD || "changeme123", "admin");
    const landlordId = await upsertUser("Kojo Mensah", process.env.SEED_LANDLORD_EMAIL || "landlord@example.com", "0241111111", process.env.SEED_LANDLORD_PASSWORD || "changeme123", "landlord");
    const studentId = await upsertUser("Ama Boateng", process.env.SEED_STUDENT_EMAIL || "student@example.com", "0242222222", process.env.SEED_STUDENT_PASSWORD || "changeme123", "student");

    console.log("Seeding hostels...");
    const hostelRows = [
      { name: "Sunrise Hostel", location: "Tesano, near GCTU", km: 0.8, amenities: "WiFi, Water, Security, Study Room", description: "A quiet hostel five minutes from the GCTU main gate, popular with second and third years." },
      { name: "Palm Court Lodge", location: "Kotobabi, near GCTU", km: 1.4, amenities: "WiFi, Kitchen, Laundry", description: "Budget-friendly rooms with a shared kitchen residents rely on during exam season." },
      { name: "The Heights Residence", location: "Achimota, near GCTU", km: 2.1, amenities: "WiFi, Gym, CCTV, Backup Power", description: "Higher-tier residence with backup power and fewer roommates per room." },
    ];

    const hostelIds = [];
    for (const h of hostelRows) {
      const { rows } = await pool.query(
        `INSERT INTO hostels (landlord_id, name, location, distance_from_campus_km, amenities, description)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [landlordId, h.name, h.location, h.km, h.amenities, h.description]
      );
      hostelIds.push(rows[0].id);
    }

    console.log("Seeding rooms...");
    const roomPlan = [
      { hostel: 0, type: "shared_4", price: 1500, slots: 10 },
      { hostel: 0, type: "single", price: 2800, slots: 4 },
      { hostel: 1, type: "shared_6", price: 1100, slots: 12 },
      { hostel: 1, type: "shared_2", price: 1900, slots: 6 },
      { hostel: 2, type: "single", price: 3200, slots: 3 },
      { hostel: 2, type: "shared_2", price: 2400, slots: 5 },
    ];

    const roomIds = [];
    for (const r of roomPlan) {
      const { rows } = await pool.query(
        `INSERT INTO rooms (hostel_id, room_type, price_per_semester, total_slots, available_slots)
         VALUES ($1,$2,$3,$4,$4) RETURNING id`,
        [hostelIds[r.hostel], r.type, r.price, r.slots]
      );
      roomIds.push(rows[0].id);
    }

    console.log("Seeding a sample booking...");
    await pool.query(
      `INSERT INTO bookings (student_id, room_id, academic_year, semester, amount_due, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [studentId, roomIds[0], "2026/2027", "full_year", 1500, "pending"]
    );
    await pool.query(`UPDATE rooms SET available_slots = available_slots - 1 WHERE id = $1`, [roomIds[0]]);

    console.log("✔ Seed complete.");
    console.log(`  Admin login:    ${process.env.SEED_ADMIN_EMAIL || "admin@gctuhostels.com"}`);
    console.log(`  Landlord login: ${process.env.SEED_LANDLORD_EMAIL || "landlord@example.com"}`);
    console.log(`  Student login:  ${process.env.SEED_STUDENT_EMAIL || "student@example.com"}`);
  } catch (err) {
    console.error("✘ Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
