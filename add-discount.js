import Database from 'better-sqlite3';

const db = new Database('./shop.db');

try {
  db.exec('ALTER TABLE products ADD COLUMN discount_percent INTEGER DEFAULT 0');
  console.log('✅ Added discount_percent column to products table');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('ℹ️  Column discount_percent already exists');
  } else {
    console.error('❌ Error:', e.message);
  }
}

db.close();
