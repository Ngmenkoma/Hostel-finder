# GCTU Hostel Finder — Backend API

Express + PostgreSQL (Amazon RDS) + Amazon S3 backend for the GCTU Hostel Finder frontend. Built to match `js/api.js`, `js/auth.js`, `js/home.js`, `js/hostel.js`, `js/bookings.js`, and `js/dashboard.js` field-for-field.

## Stack

- **Node.js / Express** — REST API, hosted on EC2
- **PostgreSQL on Amazon RDS** — users, hostels, rooms, bookings
- **Amazon S3** — hostel cover images (never written to EC2 local disk)
- **IAM** — EC2 instance role scoped to one S3 bucket
- **CloudWatch** — app logs shipped from EC2 via the CloudWatch agent
- **JWT** — auth tokens, matching `localStorage` usage in `api.js`

## API reference

| Method | Path | Auth | Matches |
|---|---|---|---|
| POST | `/api/auth/register` | — | `auth.js` register |
| POST | `/api/auth/login` | — | `auth.js` login |
| GET | `/api/auth/me` | any | — |
| GET | `/api/hostels` | — | `home.js` |
| GET | `/api/hostels/:id` | — | `hostel.js` (rooms embedded) |
| POST | `/api/hostels` | landlord/admin | `dashboard.js` add hostel |
| PUT | `/api/hostels/:id` | owner/admin | — |
| DELETE | `/api/hostels/:id` | owner/admin | — |
| POST | `/api/hostels/:id/image` | owner/admin | cover photo → S3 (multipart, field `image`) |
| GET | `/api/rooms/hostel/:hostelId` | — | `home.js`, `hostel.js` |
| POST | `/api/rooms` | landlord/admin | `dashboard.js` add room |
| PUT | `/api/rooms/:id` | owner/admin | — |
| DELETE | `/api/rooms/:id` | owner/admin | — |
| GET | `/api/bookings/mine` | student | `bookings.js` |
| GET | `/api/bookings/landlord` | landlord/admin | `dashboard.js` |
| POST | `/api/bookings` | student | `hostel.js` confirm booking |
| PUT | `/api/bookings/:id/status` | landlord/admin | `dashboard.js` confirm/decline |
| GET | `/api/health` | — | EC2/ALB health check |

All error responses are `{ "error": "message" }`, matching `apiRequest()`'s expectation in the frontend.

---

## 1. Local setup (before touching AWS)

```bash
npm install
cp .env.example .env      # fill in local Postgres details for now
npm run migrate           # creates tables
npm run seed               # creates admin/landlord/student demo accounts + sample data
npm run dev                 # starts on http://localhost:5000
```

Point the frontend's `js/config.js` at it:
```js
const API_BASE_URL = "http://localhost:5000/api";
```

Demo accounts created by `npm run seed` are printed to the console (passwords come from `SEED_*_PASSWORD` in `.env` — change them before grading/demo day).

---

## 2. Amazon RDS (PostgreSQL) — Database Integration

1. RDS Console → **Create database** → PostgreSQL → Free tier template.
2. DB instance identifier: `gctu-hostels-db`. Set a master username/password.
3. Public access: **No** if the API runs on an EC2 instance in the same VPC (recommended). Set **Yes** only if connecting from your laptop for setup.
4. Under **VPC security group**, create/select one that allows inbound PostgreSQL (port 5432) **only from your EC2 instance's security group** (see step 4 below) — this is the least-privilege Security Group requirement from the rubric.
5. Once available, copy the **endpoint** into `.env` as `DB_HOST`. Set `DB_SSL=true`.
6. From the EC2 instance (or temporarily from your laptop if public access is on):
   ```bash
   npm run migrate
   npm run seed
   ```

---

## 3. Amazon S3 + IAM — Cloud Storage (least privilege)

1. S3 Console → **Create bucket**, e.g. `gctu-hostel-images`. Block public access can stay ON if you plan to serve images via signed URLs later; for the simplest capstone demo, uncheck "Block all public access" and add a bucket policy allowing `s3:GetObject` publicly so `cover_image_url` links load directly in the frontend.
2. IAM Console → **Roles** → **Create role** → AWS service → EC2.
3. Attach a **custom policy** (not `AmazonS3FullAccess`) scoped to just this bucket:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject"],
       "Resource": "arn:aws:s3:::gctu-hostel-images/*"
     }]
   }
   ```
4. Name the role `gctu-hostel-ec2-role` and attach it to your EC2 instance (Instance settings → Attach/Replace IAM role). This is what lets `src/config/s3.js` upload without any access keys in `.env`.
5. Set `S3_BUCKET_NAME` and `S3_REGION` in `.env`. Leave `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` **unset** on EC2.

---

## 4. Amazon EC2 — Hosting + Security Groups

1. Launch an EC2 instance (t2.micro / t3.micro, Free Tier), Ubuntu 24.04.
2. Security Group inbound rules:
   - **22 (SSH)** — your IP only
   - **80 (HTTP)** — 0.0.0.0/0 (if using Nginx reverse proxy, recommended) *or*
   - **5000** — 0.0.0.0/0 (only if exposing the Node app directly — prefer Nginx on 80 instead)
   - No inbound rule for 5432 — RDS security group handles that separately, scoped to this instance's SG.
3. Attach the `gctu-hostel-ec2-role` IAM role from step 3.
4. SSH in and set up Node:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   git clone <your-repo-url> hostel-backend
   cd hostel-backend
   npm install --production
   cp .env.example .env   # edit with RDS endpoint, JWT secret, S3 bucket
   npm run migrate
   npm run seed
   ```
5. Run persistently with PM2:
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name gctu-api
   pm2 save
   pm2 startup   # follow the printed command to enable on reboot
   ```
6. (Recommended) Put Nginx in front on port 80, proxying to `localhost:5000`, so the frontend's `API_BASE_URL` is a clean `http://<ec2-ip>/api`:
   ```nginx
   server {
     listen 80;
     location /api/ {
       proxy_pass http://localhost:5000/api/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

Update the frontend's `js/config.js`:
```js
const API_BASE_URL = "http://<your-ec2-public-ip>/api";
```

---

## 5. CloudWatch — Monitoring & Logs

The app writes structured JSON logs to `logs/combined.log` and `logs/error.log` (see `src/utils/logger.js`).

1. On the EC2 instance: `sudo apt-get install -y amazon-cloudwatch-agent`
2. Create `/opt/aws/amazon-cloudwatch-agent/etc/config.json`:
   ```json
   {
     "logs": {
       "logs_collected": {
         "files": {
           "collect_list": [
             {
               "file_path": "/home/ubuntu/hostel-backend/logs/combined.log",
               "log_group_name": "gctu-hostel-api",
               "log_stream_name": "{instance_id}-combined"
             },
             {
               "file_path": "/home/ubuntu/hostel-backend/logs/error.log",
               "log_group_name": "gctu-hostel-api-errors",
               "log_stream_name": "{instance_id}-error"
             }
           ]
         }
       }
     },
     "metrics": {
       "metrics_collected": { "cpu": {}, "mem": {}, "disk": {} }
     }
   }
   ```
3. Start it:
   ```bash
   sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
     -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json -s
   ```
4. Add the `CloudWatchAgentServerPolicy` managed policy to `gctu-hostel-ec2-role` so the agent can publish logs/metrics.
5. `/api/health` doubles as a target for a CloudWatch Alarm on an ALB/Route 53 health check if you add a load balancer.

---

## 6. IAM summary (least privilege, matches rubric)

| Identity | Purpose | Permissions |
|---|---|---|
| `gctu-hostel-ec2-role` | Attached to the EC2 instance | `s3:PutObject`/`s3:GetObject` on one bucket, `CloudWatchAgentServerPolicy` |
| RDS master user | Schema owner, used once for `npm run migrate` | Full on `gctuhostels` DB only |
| `gctu_app` DB user | Runtime app connections | Standard DML on the 4 app tables (created automatically as the RDS DB user you set) |

No static AWS access keys are stored anywhere in this codebase — everything on EC2 authenticates via the instance's IAM role.

---

## Project structure

```
hostel-backend/
├── server.js                  # app entrypoint
├── db/
│   ├── schema.sql               # table definitions
│   ├── migrate.js               # applies schema.sql
│   └── seed.js                   # demo data
├── src/
│   ├── config/
│   │   ├── db.js                 # pg pool
│   │   └── s3.js                  # S3 client + multer-s3 upload
│   ├── middleware/
│   │   ├── auth.js                # JWT verify + role guard
│   │   └── errorHandler.js         # asyncHandler, ApiError, error shape
│   ├── controllers/                # one per resource
│   ├── routes/                      # one per resource
│   └── utils/logger.js               # winston → logs/*.log
├── .env.example
└── package.json
```

## Notes on the data model

- IDs are plain integers (`SERIAL`), matching the frontend's `Number(...)` casts on `hostelId`/`roomId`.
- `amenities` is stored as a comma-separated string, matching `hostel.amenities.split(",")` in `hostel.js`/`ui.js` — no separate amenities table needed for this scope.
- `available_slots` is decremented inside a `SELECT ... FOR UPDATE` transaction on booking creation, and restored on cancellation, so two students can't book the last slot at the same time.
- Only `student` and `landlord` roles can self-register; `admin` accounts are seeded directly (see `db/seed.js`) or promoted manually in the database — there's no public "become an admin" endpoint.
