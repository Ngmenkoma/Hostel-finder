-- ============================================================
-- GCTU Hostel Finder — PostgreSQL schema
-- Run against your Amazon RDS PostgreSQL instance.
-- Field names match what the frontend JS reads directly
-- (e.g. hostel.distance_from_campus_km, room.available_slots).
-- ============================================================

CREATE TYPE user_role AS ENUM ('student', 'landlord', 'admin');
CREATE TYPE room_type_enum AS ENUM ('single', 'shared_2', 'shared_4', 'shared_6');
CREATE TYPE semester_enum AS ENUM ('first', 'second', 'full_year');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  phone         VARCHAR(30),
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'student',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hostels (
  id                        SERIAL PRIMARY KEY,
  landlord_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                      VARCHAR(150) NOT NULL,
  location                  VARCHAR(180) NOT NULL,
  distance_from_campus_km   NUMERIC(5,2),
  amenities                 TEXT,           -- comma-separated, matches frontend .split(",")
  description               TEXT,
  cover_image_url           TEXT,           -- points at an S3 object, never local disk
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id                  SERIAL PRIMARY KEY,
  hostel_id           INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_type           room_type_enum NOT NULL,
  price_per_semester  NUMERIC(10,2) NOT NULL CHECK (price_per_semester > 0),
  total_slots         INTEGER NOT NULL CHECK (total_slots > 0),
  available_slots     INTEGER NOT NULL CHECK (available_slots >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT available_not_over_total CHECK (available_slots <= total_slots)
);

CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  student_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id        INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  academic_year  VARCHAR(20) NOT NULL,
  semester       semester_enum NOT NULL,
  amount_due     NUMERIC(10,2) NOT NULL,
  status         booking_status NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hostels_landlord ON hostels (landlord_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hostel ON rooms (hostel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings (student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings (room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hostels_updated_at ON hostels;
CREATE TRIGGER trg_hostels_updated_at BEFORE UPDATE ON hostels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
