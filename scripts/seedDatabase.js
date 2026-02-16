const { Pool } = require('pg');

// Simple seed script. Uses DATABASE_URL env var or defaults to localhost.
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:defvault_dev_password@localhost:5432/defvault';
const pool = new Pool({ connectionString });

async function seedDatabase() {
  try {
    console.log('Seeding database (simple)...');

    // Minimal tables required for local dev: users and audit_logs
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        event_type VARCHAR(100),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert a demo user if not exists
    const res = await pool.query('SELECT id FROM users WHERE email=$1', ['demo@defvault.com']);
    if (res.rowCount === 0) {
      await pool.query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)',
        ['demo@defvault.com', 'demo', 'demo-password-hash']
      );
      console.log('✓ Demo user created: demo@defvault.com / password placeholder');
    } else {
      console.log('✓ Demo user already exists');
    }

    console.log('Database seed complete.');
    await pool.end();
  } catch (err) {
    console.error('Seeding failed:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) seedDatabase();

module.exports = seedDatabase;
