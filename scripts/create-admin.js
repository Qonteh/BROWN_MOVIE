const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');

    const email = 'browntz@gmail.com';
    const password = 'Qontetina051@';
    const fullName = 'Brown Admin';

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = $2, role = $4, updated_at = NOW()
       RETURNING id, email, role;`,
      [email, passwordHash, fullName, 'admin']
    );

    const admin = result.rows[0];
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Role:', admin.role);
    console.log('');
    console.log('You can now login at http://localhost:3000/auth?mode=login');
    console.log('Email: browntz@gmail.com');
    console.log('Password: Qontetina051@');
    console.log('');
    console.log('🎯 Admin panel: http://localhost:3000/admin');

    await pool.end();
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();
