# Brown Movies - Full Stack Setup Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Next.js Frontend + React Components             │   │
│  │  (Registration, Login, Checkout, Movie Cards)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────┬────────────────────────────────────────────────────┘
               │ HTTP/HTTPS (API Calls)
               │
┌──────────────▼────────────────────────────────────────────────────┐
│              NEXT.JS SERVER (npm run dev)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Frontend Routes & Components                             │   │
│  │ - /                (Homepage)                            │   │
│  │ - /auth            (Login/Signup)                        │   │
│  │ - /checkout        (Payment)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Backend API Routes                                       │   │
│  │ - POST /api/auth/signup   → Hash password → Save to DB  │   │
│  │ - POST /api/auth/login    → Verify cred → Return token  │   │
│  │ - POST /api/auth/logout   → Log activity                │   │
│  │ - GET  /api/auth/me       → Get user info               │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────┬────────────────────────────────────────────────────┘
               │ PostgreSQL Queries (TCP Port 5432)
               │
┌──────────────▼────────────────────────────────────────────────────┐
│           POSTGRESQL DATABASE (pgAdmin)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Core Tables                 │ Auth Tables                │   │
│  │ - users                     │ - auth_sessions            │   │
│  │ - categories                │ - password_reset_tokens    │   │
│  │ - movies                    │ - email_verification_tokens│   │
│  │ - purchases                 │ - login_attempts           │   │
│  │ - reviews                   │ - auth_audit_logs          │   │
│  │ - watchlist                 │                            │   │
│  │ - hero_slides               │                            │   │
│  │ - sessions                  │                            │   │
│  │ - settings                  │                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Node.js & npm** (v18+) - [Download](https://nodejs.org/)
2. **PostgreSQL** (v12+) - [Download](https://www.postgresql.org/download/)
3. **pgAdmin 4** - [Download](https://www.pgadmin.org/download/)

## Step 1: Database Setup

### 1.1 Create Database in pgAdmin

```bash
# Open pgAdmin GUI (usually localhost:5050)
# Or use command line:

psql -U postgres -c "CREATE DATABASE brown_movies;"
```

### 1.2 Run Database Schema

1. Open **pgAdmin** → Right-click `brown_movies` → **Query Tool**
2. Copy and paste the contents of `scripts/database-schema.sql`
3. Hit **Execute** (F5)
4. Then copy and paste `scripts/auth-schema.sql`
5. Hit **Execute** again

Expected output: Tables created with data populated (categories, admin user, etc.)

### 1.3 Verify Setup

In pgAdmin Query Tool, run:

```sql
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as movie_count FROM movies;
SELECT COUNT(*) as category_count FROM categories;
```

Should return: 1 user, X movies, 14 categories

## Step 2: Backend Environment Setup

### 2.1 Configure `.env.local`

The file already exists at `c:\BROWN\.env.local`. Update these values:

```env
# Database (change password to your Postgres password)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/brown_movies

# JWT Secret (generate a random string)
JWT_SECRET=your_random_secret_key_minimum_32_characters_long_change_me

# Node Environment
NODE_ENV=development

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# S3 Upload (required for movie uploads)
AWS_REGION=your-aws-region
AWS_S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

The movie upload form uses these AWS values to request a presigned upload URL and then save the returned S3 file URL in PostgreSQL.

### 2.2 Verify PostgreSQL Connection

Create a test connection in `c:\BROWN\test-db.js`:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected! Current time from DB:', result.rows[0]);
  }
  pool.end();
});
```

Run:
```bash
node test-db.js
```

Should output: ✅ Database connected! Current time from DB: ...

## Step 3: Start Full-Stack Development

```bash
cd c:\BROWN

# Install dependencies (if not done before)
npm install

# Start frontend + backend together
npm run dev
```

Output should show:
```
▲ Next.js 16.2.0
✓ Compiled successfully in Xs

➜ Local:        http://localhost:3000
➜ API:          http://localhost:3000/api

Starting to watch file changes...
```

## Step 4: Test Registration Flow

### 4.1 Open Browser

Navigate to: **http://localhost:3000**

### 4.2 Click Register

1. Click **"Jisajili"** (Sign Up) button in header
2. Fill in:
   - **Full Name**: "Juma Mwangi"
   - **Email**: "juma@brownmovies.com"
   - **Password**: "Password123"
   - **Confirm Password**: "Password123"
3. Click **"Create account"**

### 4.3 Watch the Magic

Expected flow:
1. Frontend sends POST to `/api/auth/signup` with encrypted password
2. Backend receives request → hashes password with bcrypt → creates user in PostgreSQL
3. Backend returns JWT token
4. Frontend stores token in localStorage
5. Frontend redirects to `/checkout` with pending movie
6. Checkout page displays movie details + payment methods

### 4.4 Verify in Database

In pgAdmin Query Tool:

```sql
SELECT id, email, full_name, created_at FROM users WHERE email = 'juma@brownmovies.com';
```

Should see your newly created user!

## Step 5: Test Login Flow

### 5.1 Clear Browser Data (Optional)

- Open DevTools (F12) → Application → Clear localStorage

### 5.2 Click Login

1. Click **"Ingia"** (Log In) button in header
2. Enter credentials:
   - **Email**: "juma@brownmovies.com"
   - **Password**: "Password123"
3. Click **"Continue to checkout"**

### 5.3 Check Audit Logs

```sql
SELECT * FROM auth_audit_logs WHERE action IN ('signup', 'login') ORDER BY created_at DESC LIMIT 5;
SELECT * FROM login_attempts ORDER BY attempted_at DESC LIMIT 5;
```

Shows audit trail of all auth actions!

## Complete Data Flow

### Registration Example

```
User Browser                      Next.js Server                       PostgreSQL
     ↓                                  ↓                                   ↓
[Signup Form]                          
  ↓ POST /api/auth/signup     [API Route Handler]
    ├─ fullName: "Juma"          ├─ Validate email                        
    ├─ email: "juma@..."         ├─ Check if exists           SELECT * FROM users 
    ├─ password: "Pass123"        ├─ Hash with bcrypt         WHERE email = '...'
                                  ├─ Generate UUID            
                                  └─→ INSERT INTO users       INSERT INTO users
                                     └─ Generate JWT token
  ←─────────────────────────────────────────
    ├─ user: { id, email, name }
    └─ token: "eyJ..."
    
[Store in localStorage]
[Redirect to /checkout]
[Display pending movie]
```

### Login Example

```
User Browser                      Next.js Server                       PostgreSQL
     ↓                                  ↓                                   ↓
[Login Form]                           
  ↓ POST /api/auth/login      [API Route Handler]
    ├─ email: "juma@..."          ├─ Validate input           SELECT * FROM users
    ├─ password: "Pass123"         ├─ Find user by email       WHERE email = '...'
                                  ├─ Compare passwords
                                  ├─ Check if locked
                                  ├─ Update last_login_at     UPDATE users
  ←─────────────────────────────────────────
    ├─ user: { id, email, name }
    └─ token: "eyJ..."
    
[Store in localStorage]
[Redirect to /checkout]
```

## API Endpoints Reference

### POST /api/auth/signup
Register a new user

**Request:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "john@example.com",
    "fullName": "John Doe"
  },
  "token": "eyJ0eXA..."
}
```

### POST /api/auth/login
Login existing user

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": { ... },
  "token": "eyJ0eXA..."
}
```

### POST /api/auth/logout
Logout user (requires auth)

**Headers:**
```
Authorization: Bearer eyJ0eXA...
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
Get current user (requires auth)

**Headers:**
```
Authorization: Bearer eyJ0eXA...
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "fullName": "John Doe",
    "emailVerified": false,
    "role": "user",
    "createdAt": "2026-04-10T..."
  }
}
```

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Fix:**
1. Check PostgreSQL is running: `pg_isready -h localhost`
2. Verify DATABASE_URL in `.env.local`
3. Start PostgreSQL service: `net start PostgreSQL14` (Windows)

### "Email already registered" Error

Email already exists in database. Use different email or delete from DB:

```sql
DELETE FROM users WHERE email = 'john@example.com';
```

### Token Invalid / Expired

Token expires after 7 days. Clear localStorage and login again:

```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Password Hash Mismatch on Login

Clear and restart:

```bash
ctrl+c  # Stop npm run dev
npm run dev
```

## Security Notes

1. **Change JWT_SECRET** in `.env.local` to a random secure key
2. **Never commit** `.env.local` to git  
3. **Use HTTPS** in production
4. **Rate limit** API endpoints (add middleware)
5. **Validate all inputs** on backend
6. **Hash passwords** with bcrypt (already done)

## What's Running When You Execute `npm run dev`

When you run `npm run dev`, here's what starts:

```
npm run dev
    ↓
Next.js Development Server
    ├─ Watches for file changes (hot reload)
    ├─ Compiles TypeScript → JavaScript
    ├─ Serves frontend pages at http://localhost:3000
    │   ├─ / (Homepage)
    │   ├─ /auth (Login/Signup)
    │   ├─ /checkout (Payment)
    │   └─ /admin/* (Admin pages)
    │
    ├─ Serves API routes at http://localhost:3000/api
    │   ├─ POST /api/auth/signup
    │   ├─ POST /api/auth/login
    │   ├─ POST /api/auth/logout
    │   └─ GET /api/auth/me
    │
    └─ Ready for requests
```

PostgreSQL runs separately - it doesn't start with `npm run dev` (must be running before).

## Next Steps

1. ✅ Database created and populated
2. ✅ Backend API routes running
3. ✅ Frontend connected to backend
4. ✅ JWT authentication working
5. ✅ Password hashing with bcrypt

**Optional Enhancements:**
- Add password reset endpoint (`/api/auth/forgot-password`)
- Add email verification endpoint
- Add refresh token rotation
- Add role-based access control (RBAC)
- Add purchase API endpoints
- Add review/rating API endpoints
