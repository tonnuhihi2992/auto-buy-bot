import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import express from 'express';
import Database from 'better-sqlite3';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { startAutoChecker } from './auto-payment-checker.js';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============== Discord Client ==============
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
});

// ============== Express (Webhook) ==============
const app = express();
app.use(express.json());

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin-panel.html'));
});

// ============== Database ==============
const db = new Database('./shop.db');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  category_id INTEGER
);
CREATE TABLE IF NOT EXISTS keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  is_sold INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_ref TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount_percent INTEGER NOT NULL,
  max_uses INTEGER DEFAULT -1,
  used_count INTEGER DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT
);
`);

// Track active QR messages per user
const activeQRMessages = new Map(); // userId -> { reply, orderId }

const qCategories = {
  allActive: () => db.prepare(`SELECT id, name FROM categories WHERE active=1 ORDER BY id`).all(),
  add: (name, active) => db.prepare(`INSERT INTO categories(name,active) VALUES(?,?)`).run(name, active ? 1 : 0),
};

const qProducts = {
  byCategory: (categoryId) =>
    db.prepare(`SELECT id, name, price, discount_percent, category_id FROM products WHERE active=1 AND category_id=? ORDER BY id`).all(categoryId),
  allActive: () =>
    db.prepare(`SELECT id, name, price, discount_percent, category_id FROM products WHERE active=1 ORDER BY id`).all(),
  add: (name, price, discount, active, categoryId) =>
    db.prepare(`INSERT INTO products(name,price,discount_percent,active,category_id) VALUES(?,?,?,?,?)`).run(name, price, discount || 0, active ? 1 : 0, categoryId ?? null),
};

const qKeys = {
  take: db.prepare('SELECT id, key FROM keys WHERE product_id=? AND is_sold=0 LIMIT ?'),
};

const qOrders = {
  insert: db.prepare(
    'INSERT INTO orders(id,user_id,channel_id,product_id,qty,amount,status,payment_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?)'
  ),
  get: db.prepare('SELECT * FROM orders WHERE id=?'),
  updatePaid: db.prepare("UPDATE orders SET status='PAID', payment_ref=? WHERE id=? AND status='PENDING'"),
};

// ===== Helpers =====
const THEME = Number(process.env.THEME_COLOR || 0x5865f2);
const SHOP_NAME = process.env.SHOP_TITLE || 'Shop Key';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'changeme';

function newOrderId() {
  return 'ORD_' + Date.now() + '_' + Math.floor(Math.random() * 1e5);
}

function remainKeys(productId) {
  const row = db.prepare('SELECT COUNT(1) AS c FROM keys WHERE product_id=? AND is_sold=0').get(productId);
  return Number(row?.c || 0);
}

function calcFinalPrice(product) {
  const discount = product.discount_percent || 0;
  if (discount <= 0) return product.price;
  return Math.floor(product.price * (100 - discount) / 100);
}

function formatPrice(product) {
  const discount = product.discount_percent || 0;
  if (discount <= 0) return `${product.price.toLocaleString()}đ`;
  const finalPrice = calcFinalPrice(product);
  return `~~${product.price.toLocaleString()}đ~~ **${finalPrice.toLocaleString()}đ** (-${discount}%)`;
}

function validateCoupon(code) {
  if (!code || !code.trim()) return null;
  
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(code.trim().toUpperCase());
  if (!coupon) return { valid: false, error: 'Mã không tồn tại hoặc đã bị vô hiệu hóa' };
  
  // Check expiry
  if (coupon.expires_at) {
    const expiryDate = new Date(coupon.expires_at);
    if (expiryDate < new Date()) {
      return { valid: false, error: 'Mã đã hết hạn' };
    }
  }
  
  // Check max uses
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'Mã đã hết lượt sử dụng' };
  }
  
  return { valid: true, coupon };
}

function applyCoupon(amount, couponCode) {
  const validation = validateCoupon(couponCode);
  if (!validation || !validation.valid) return { amount, discount: 0, error: validation?.error };
  
  const coupon = validation.coupon;
  const discount = Math.floor(amount * coupon.discount_percent / 100);
  const finalAmount = amount - discount;
  
  return { amount: finalAmount, discount, couponCode: coupon.code, discountPercent: coupon.discount_percent };
}

async function buildPaymentQR({ orderId, amount }) {
  if (process.env.USE_IMG_VIETQR === 'true') {
    const url = `https://img.vietqr.io/image/${process.env.BANK_BIN}-${process.env.ACCOUNT_NO}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(
      orderId
    )}&accountName=${encodeURIComponent(process.env.ACCOUNT_NAME || '')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không lấy được ảnh QR từ img.vietqr.io');
    return Buffer.from(await res.arrayBuffer());
  }
  const payload = { orderId, amount, bank: process.env.BANK_BIN, account: process.env.ACCOUNT_NO, name: process.env.ACCOUNT_NAME };
  return await QRCode.toBuffer(JSON.stringify(payload), { width: 512, errorCorrectionLevel: 'M' });
}

async function dmKeys({ userId, productId, qty, orderId }) {
  const rows = qKeys.take.all(productId, qty);
  if (rows.length < qty) throw new Error('Không đủ key tồn.');

  const ids = rows.map(r => r.id);
  db.prepare(`UPDATE keys SET is_sold=1 WHERE id IN (${ids.map(()=>'?').join(',')})`).run(...ids);

  const keysTxt = rows.map(r => r.key).join('\n');
  const user = await client.users.fetch(userId);

  const embed = new EmbedBuilder()
    .setTitle(`🔑 Key đơn ${orderId}`)
    .setDescription(`**Số lượng:** ${qty}\n**Sản phẩm ID:** ${productId}`)
    .setColor(0x00b894);

  await user.send({
    content: `Cảm ơn bạn đã mua hàng tại **${SHOP_NAME}**.\nDưới đây là key của bạn:\n\`\`\`\n${keysTxt}\n\`\`\``,
    embeds: [embed],
  });
}

// ===== UI / Embeds =====
function shopEmbed() {
  const e = new EmbedBuilder()
    .setTitle(`🛍️ ${SHOP_NAME}`)
    .setDescription(
      `Hãy **chọn danh mục** bên dưới để xem sản phẩm.\n\n` +
      `🧾 **Điều khoản nhanh**\n` +
      `• Key **không hoàn trả**.\n` +
      `• Có thể bán lại.\n` +
      `• Dùng sai **không hỗ trợ**.\n` +
      `• Sau thanh toán, key sẽ **gửi qua DM**.`
    )
    .setColor(THEME);
  if (process.env.SHOP_LOGO_URL) e.setThumbnail(process.env.SHOP_LOGO_URL);
  if (process.env.SHOP_BANNER_URL) e.setImage(process.env.SHOP_BANNER_URL);
  return e;
}
function paymentEmbed(orderId, amount) {
  return new EmbedBuilder()
    .setTitle('💳 Thanh toán VietQR')
    .setDescription(
      `**Mã đơn:** \`${orderId}\`\n` +
      `**Số tiền:** ${amount.toLocaleString()}đ\n` +
      `**Ngân hàng:** ${process.env.BANK_BIN} • **STK:** ${process.env.ACCOUNT_NO}\n` +
      `**Tên TK:** ${process.env.ACCOUNT_NAME}\n\n` +
      `> Ghi **đúng MÃ ĐƠN** trong nội dung chuyển khoản để hệ thống tự xác nhận.`
    )
    .setColor(0x3498db);
}
function buildCategoryRow() {
  const cats = qCategories.allActive();
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('sel_category')
      .setPlaceholder('Chọn danh mục…')
      .addOptions(cats.map(c => ({ label: c.name, value: String(c.id) })))
  );
}

// ===== Auto gửi 1 tin Shop (xoá cũ + pin) =====
async function sendShop() {
  const channelId = process.env.SHOP_CHANNEL_ID;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const msgs = await channel.messages.fetch({ limit: 50 });
  const mine = msgs.filter(m => m.author.id === client.user.id);
  if (mine.size) { try { await channel.bulkDelete(mine, true); } catch {} }

  if (!qCategories.allActive().length) {
    const m = await channel.send('⚠️ Chưa có danh mục nào. Thêm bằng `/admin_add_category`.');
    try { await m.pin(); } catch {}
    return;
  }

  const msg = await channel.send({ embeds: [shopEmbed()], components: [buildCategoryRow()] });
  try { await msg.pin(); } catch {}
  console.log(`✅ Shop UI đã gửi & pin ở kênh ${channelId}`);
}

// ===== Webhooks tự động xác nhận thanh toán =====
// Admin API endpoints
app.get('/admin/stats', (req, res) => {
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE active=1').get().c;
    const totalKeys = db.prepare('SELECT COUNT(*) as c FROM keys').get().c;
    const availableKeys = db.prepare('SELECT COUNT(*) as c FROM keys WHERE is_sold=0').get().c;
    res.json({ totalProducts, totalKeys, availableKeys });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT id, name, active FROM categories ORDER BY id').all();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/products', (req, res) => {
  try {
    const products = db.prepare('SELECT id, name, price, active, category_id FROM products ORDER BY id').all();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/allkeys', (req, res) => {
  try {
    const keys = db.prepare(`
      SELECT 
        k.id, 
        k.key, 
        k.is_sold, 
        k.product_id,
        p.name as product_name,
        p.price as product_price
      FROM keys k
      LEFT JOIN products p ON k.product_id = p.id
      ORDER BY k.is_sold, p.name, k.id
    `).all();
    res.json(keys);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/category', (req, res) => {
  try {
    const { name, active } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    const result = qCategories.add(name, active !== false);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/admin/product', (req, res) => {
  try {
    const { name, price, discount, active, categoryId } = req.body;
    if (!name || price == null) return res.status(400).json({ ok: false, error: 'name and price required' });
    const result = qProducts.add(name, Number(price), Number(discount || 0), active !== false, categoryId || null);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Coupon endpoints
app.get('/admin/coupons', (req, res) => {
  try {
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY active DESC, code').all();
    res.json(coupons);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/coupon', (req, res) => {
  try {
    const { code, discount, maxUses, expiry, active } = req.body;
    if (!code || !discount) return res.status(400).json({ ok: false, error: 'code and discount required' });
    
    const upperCode = code.trim().toUpperCase();
    const expiryDate = expiry ? new Date(expiry).toISOString() : null;
    
    db.prepare('INSERT INTO coupons(code, discount_percent, max_uses, used_count, active, expires_at) VALUES(?, ?, ?, 0, ?, ?)').run(
      upperCode, Number(discount), Number(maxUses || -1), active !== false ? 1 : 0, expiryDate
    );
    
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ ok: false, error: 'Mã đã tồn tại' });
    } else {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
});

app.put('/admin/coupon/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { active } = req.body;
    db.prepare('UPDATE coupons SET active = ? WHERE code = ?').run(active ? 1 : 0, code);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/admin/coupon/:code', (req, res) => {
  try {
    const { code } = req.params;
    db.prepare('DELETE FROM coupons WHERE code = ?').run(code);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/admin/keys', (req, res) => {
  try {
    const { productId, keys } = req.body;
    if (!productId || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ ok: false, error: 'productId and keys array required' });
    }
    
    // Check if product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ ok: false, error: 'Sản phẩm không tồn tại. Vui lòng tạo sản phẩm trước!' });
    }
    
    const insert = db.prepare('INSERT INTO keys(product_id, key, is_sold) VALUES(?, ?, 0)');
    const insertMany = db.transaction((keysArray) => {
      for (const key of keysArray) {
        if (key.trim()) insert.run(productId, key.trim());
      }
    });
    
    insertMany(keys);
    res.json({ ok: true, count: keys.filter(k => k.trim()).length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/admin/product/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ ok: false, error: 'Invalid product ID' });
    }
    
    // Check if product exists
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }
    
    // Delete associated keys first
    const keysDeleted = db.prepare('DELETE FROM keys WHERE product_id = ?').run(productId);
    
    // Delete product
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    
    res.json({ ok: true, keysDeleted: keysDeleted.changes });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/admin/category/:id', (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ ok: false, error: 'Invalid category ID' });
    }
    
    // Check if category exists
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    if (!category) {
      return res.status(404).json({ ok: false, error: 'Category not found' });
    }
    
    // Set products in this category to NULL category
    db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(categoryId);
    
    // Delete category
    db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/admin/keys/:productId', (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { onlySold } = req.query; // ?onlySold=true để xóa chỉ keys đã bán
    
    if (isNaN(productId)) {
      return res.status(400).json({ ok: false, error: 'Invalid product ID' });
    }
    
    let query = 'DELETE FROM keys WHERE product_id = ?';
    let params = [productId];
    
    if (onlySold === 'true') {
      query += ' AND is_sold = 1';
    } else if (onlySold === 'false') {
      query += ' AND is_sold = 0';
    }
    
    const result = db.prepare(query).run(...params);
    
    res.json({ ok: true, deleted: result.changes });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/admin/key/:keyId', (req, res) => {
  try {
    const keyId = parseInt(req.params.keyId);
    if (isNaN(keyId)) {
      return res.status(400).json({ ok: false, error: 'Invalid key ID' });
    }
    
    const result = db.prepare('DELETE FROM keys WHERE id = ?').run(keyId);
    
    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: 'Key not found' });
    }
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/admin/keys/:productId', (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ ok: false, error: 'Invalid product ID' });
    }
    
    const keys = db.prepare('SELECT id, key, is_sold FROM keys WHERE product_id = ? ORDER BY is_sold, id').all(productId);
    res.json(keys);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.put('/admin/key/:keyId', (req, res) => {
  try {
    const keyId = parseInt(req.params.keyId);
    const { newKey } = req.body;
    
    if (isNaN(keyId)) {
      return res.status(400).json({ ok: false, error: 'Invalid key ID' });
    }
    
    if (!newKey || !newKey.trim()) {
      return res.status(400).json({ ok: false, error: 'New key value required' });
    }
    
    const existing = db.prepare('SELECT * FROM keys WHERE id = ?').get(keyId);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Key not found' });
    }
    
    db.prepare('UPDATE keys SET key = ? WHERE id = ?').run(newKey.trim(), keyId);
    
    res.json({ ok: true, oldKey: existing.key, newKey: newKey.trim() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/admin/key/replace', (req, res) => {
  try {
    const { productId, oldKey, newKey } = req.body;
    
    if (!productId || !oldKey || !newKey) {
      return res.status(400).json({ ok: false, error: 'productId, oldKey, and newKey required' });
    }
    
    const existing = db.prepare('SELECT * FROM keys WHERE product_id = ? AND key = ?').get(productId, oldKey.trim());
    
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Old key not found in this product' });
    }
    
    if (existing.is_sold === 1) {
      return res.status(400).json({ ok: false, error: 'Cannot replace a sold key' });
    }
    
    db.prepare('UPDATE keys SET key = ? WHERE id = ?').run(newKey.trim(), existing.id);
    
    res.json({ ok: true, keyId: existing.id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== Backup & Restore Database =====
app.get('/admin/backup', (req, res) => {
  try {
    const backup = {
      categories: db.prepare('SELECT * FROM categories').all(),
      products: db.prepare('SELECT * FROM products').all(),
      keys: db.prepare('SELECT * FROM keys WHERE is_sold = 0').all(),
      coupons: db.prepare('SELECT * FROM coupons').all(),
      timestamp: Date.now()
    };
    res.json(backup);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/restore', (req, res) => {
  try {
    const { categories, products, keys, coupons } = req.body;
    
    // Clear existing data
    db.exec('DELETE FROM keys');
    db.exec('DELETE FROM products');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM coupons');
    
    // Restore categories
    if (categories && categories.length > 0) {
      const insertCat = db.prepare('INSERT INTO categories (id, name, active) VALUES (?, ?, ?)');
      for (const cat of categories) {
        insertCat.run(cat.id, cat.name, cat.active);
      }
    }
    
    // Restore products
    if (products && products.length > 0) {
      const insertProd = db.prepare('INSERT INTO products (id, name, price, discount_percent, active, category_id) VALUES (?, ?, ?, ?, ?, ?)');
      for (const prod of products) {
        insertProd.run(prod.id, prod.name, prod.price, prod.discount_percent, prod.active, prod.category_id);
      }
    }
    
    // Restore keys
    if (keys && keys.length > 0) {
      const insertKey = db.prepare('INSERT INTO keys (id, product_id, key, is_sold) VALUES (?, ?, ?, ?)');
      for (const key of keys) {
        insertKey.run(key.id, key.product_id, key.key, key.is_sold);
      }
    }
    
    // Restore coupons
    if (coupons && coupons.length > 0) {
      const insertCoupon = db.prepare('INSERT INTO coupons (code, discount_percent, max_uses, used_count, active, expires_at) VALUES (?, ?, ?, ?, ?, ?)');
      for (const coupon of coupons) {
        insertCoupon.run(coupon.code, coupon.discount_percent, coupon.max_uses, coupon.used_count, coupon.active, coupon.expires_at);
      }
    }
    
    res.json({ ok: true, message: 'Database restored successfully' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== Webhooks tự động xác nhận thanh toán =====
// 1) Chuẩn chung: POST /webhook/payment  (body đã có orderId, amount, paid=true)
app.post('/webhook/payment', async (req, res) => {
  try {
    const sec = req.headers['x-webhook-secret'] || '';
    if (sec !== WEBHOOK_SECRET) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const { orderId, amount, paid, providerRef } = req.body || {};
    if (!orderId || !amount || !paid) return res.status(400).json({ ok: false, error: 'bad_request' });

    const ord = qOrders.get.get(orderId);
    if (!ord) return res.status(404).json({ ok: false, error: 'order_not_found' });
    if (ord.status !== 'PENDING') return res.json({ ok: true, note: 'already processed' });
    if (Number(amount) !== Number(ord.amount)) return res.status(400).json({ ok: false, error: 'amount_mismatch' });

    qOrders.updatePaid.run(providerRef || 'webhook', orderId);
    try { await dmKeys({ userId: ord.user_id, productId: ord.product_id, qty: ord.qty, orderId }); } catch (e) { console.error(e); }
    return res.json({ ok: true });
  } catch (e) {
    console.error('Webhook /payment error:', e);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
});

// 2) Chuẩn “Bank → Webhook” phổ biến: POST /webhook/txn  (nội dung CK chứa orderId)
// Body ví dụ: { "amount": 70000, "description": "ORD_1690000000_12345", "ref":"MB_abc" }
app.post('/webhook/txn', async (req, res) => {
  try {
    const sec = req.headers['x-webhook-secret'] || '';
    if (sec !== WEBHOOK_SECRET) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const { amount, description, ref } = req.body || {};
    if (!amount || !description) return res.status(400).json({ ok: false, error: 'bad_request' });

    // Tìm orderId trong description
    // VD: "Chuyen tien ORD_169..._12345 thanh toan" → match token ORD_..._
    const match = description.match(/ORD_\d+_\d+/i);
    if (!match) return res.status(200).json({ ok: true, note: 'no_order_id_found' });
    const orderId = match[0];

    const ord = qOrders.get.get(orderId);
    if (!ord) return res.status(200).json({ ok: true, note: 'order_not_found' }); // ko 404 để tránh retry spam từ gateway
    if (ord.status !== 'PENDING') return res.status(200).json({ ok: true, note: 'already_processed' });
    if (Number(amount) !== Number(ord.amount)) return res.status(200).json({ ok: true, note: 'amount_mismatch' });

    qOrders.updatePaid.run(ref || 'txn', orderId);
    
    // Remove QR tracking when paid
    activeQRMessages.delete(ord.user_id);
    
    try { await dmKeys({ userId: ord.user_id, productId: ord.product_id, qty: ord.qty, orderId }); } catch (e) { console.error(e); }
    return res.json({ ok: true, matched: orderId });
  } catch (e) {
    console.error('Webhook /txn error:', e);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
});

// ===== Events =====
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
  sendShop();
  
  // Start auto payment checker (only if API key is configured)
  const CASSO_API_KEY = process.env.CASSO_API_KEY || '';
  if (CASSO_API_KEY && CASSO_API_KEY.trim()) {
    console.log('✅ Starting auto payment checker with Casso.vn...');
    startAutoChecker(async (order, orderId) => {
      try {
        // Xóa QR tracking
        activeQRMessages.delete(order.user_id);
        
        // Gửi key cho user
        await dmKeys({ 
          userId: order.user_id, 
          productId: order.product_id, 
          qty: order.qty, 
          orderId 
        });
        
        console.log(`✅ Auto-sent keys for order ${orderId} to user ${order.user_id}`);
      } catch (e) {
        console.error(`Failed to send keys for ${orderId}:`, e);
      }
    });
  } else {
    console.log('ℹ️  Auto payment checker disabled (no CASSO_API_KEY). Use /admin_confirm for manual confirmation.');
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

    // ===== ADMIN COMMANDS WITH MODALS =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_add_category') {
      // Check admin
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_add_category')
        .setTitle('➕ Thêm danh mục mới');

      const nameInput = new TextInputBuilder()
        .setCustomId('cat_name')
        .setLabel('Tên danh mục')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ví dụ: Cheats, Premium Accounts...')
        .setRequired(true);

      const activeInput = new TextInputBuilder()
        .setCustomId('cat_active')
        .setLabel('Kích hoạt? (yes/no)')
        .setStyle(TextInputStyle.Short)
        .setValue('yes')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(activeInput)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_add_product') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_add_product')
        .setTitle('➕ Thêm sản phẩm mới');

      const nameInput = new TextInputBuilder()
        .setCustomId('prod_name')
        .setLabel('Tên sản phẩm')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ví dụ: Valorant Cheat 1 tháng')
        .setRequired(true);

      const priceInput = new TextInputBuilder()
        .setCustomId('prod_price')
        .setLabel('Giá (VNĐ)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('70000')
        .setRequired(true);

      const categoryInput = new TextInputBuilder()
        .setCustomId('prod_category')
        .setLabel('ID danh mục (để trống nếu không có)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1')
        .setRequired(false);

      const activeInput = new TextInputBuilder()
        .setCustomId('prod_active')
        .setLabel('Kích hoạt? (yes/no)')
        .setStyle(TextInputStyle.Short)
        .setValue('yes')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(categoryInput),
        new ActionRowBuilder().addComponents(activeInput)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_load_keys') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_load_keys')
        .setTitle('🔑 Nhập keys cho sản phẩm');

      const productInput = new TextInputBuilder()
        .setCustomId('key_product_id')
        .setLabel('ID sản phẩm')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1')
        .setRequired(true);

      const keysInput = new TextInputBuilder()
        .setCustomId('key_list')
        .setLabel('Danh sách keys (mỗi dòng 1 key)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('KEY-XXXX-XXXX-XXXX\nKEY-YYYY-YYYY-YYYY\nKEY-ZZZZ-ZZZZ-ZZZZ')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(productInput),
        new ActionRowBuilder().addComponents(keysInput)
      );

      return interaction.showModal(modal);
    }

    // ===== MODAL SUBMISSIONS =====
    if (interaction.isModalSubmit() && interaction.customId === 'modal_add_category') {
      const name = interaction.fields.getTextInputValue('cat_name');
      const activeStr = interaction.fields.getTextInputValue('cat_active').toLowerCase();
      const active = activeStr === 'yes' || activeStr === 'y' || activeStr === '1' || activeStr === 'true';

      try {
        const result = qCategories.add(name, active);
        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã tạo danh mục **${name}** (ID: ${result.lastInsertRowid})${active ? ' - Đã kích hoạt' : ' - Chưa kích hoạt'}`
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_add_product') {
      const name = interaction.fields.getTextInputValue('prod_name');
      const price = parseInt(interaction.fields.getTextInputValue('prod_price'));
      const categoryStr = interaction.fields.getTextInputValue('prod_category');
      const categoryId = categoryStr ? parseInt(categoryStr) : null;
      const activeStr = interaction.fields.getTextInputValue('prod_active').toLowerCase();
      const active = activeStr === 'yes' || activeStr === 'y' || activeStr === '1' || activeStr === 'true';

      if (isNaN(price) || price <= 0) {
        return interaction.reply({ ephemeral: true, content: '❌ Giá phải là số dương!' });
      }

      try {
        const result = qProducts.add(name, price, active, categoryId);
        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã tạo sản phẩm **${name}** (ID: ${result.lastInsertRowid})\n💰 Giá: ${price.toLocaleString()}đ${active ? ' - Đã kích hoạt' : ' - Chưa kích hoạt'}`
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_load_keys') {
      const productId = parseInt(interaction.fields.getTextInputValue('key_product_id'));
      const keysText = interaction.fields.getTextInputValue('key_list');
      const keys = keysText.split('\n').map(k => k.trim()).filter(k => k);

      if (isNaN(productId)) {
        return interaction.reply({ ephemeral: true, content: '❌ ID sản phẩm không hợp lệ!' });
      }

      if (keys.length === 0) {
        return interaction.reply({ ephemeral: true, content: '❌ Vui lòng nhập ít nhất 1 key!' });
      }

      try {
        const insert = db.prepare('INSERT INTO keys(product_id, key, is_sold) VALUES(?, ?, 0)');
        const insertMany = db.transaction((keysArray) => {
          for (const key of keysArray) {
            insert.run(productId, key);
          }
        });
        
        insertMany(keys);

        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã nhập **${keys.length} keys** cho sản phẩm ID **${productId}**\n\n📋 Preview:\n\`\`\`\n${keys.slice(0, 5).join('\n')}${keys.length > 5 ? '\n...' : ''}\n\`\`\``
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    // ===== XACNHAN COMMAND =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'xacnhan') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const orderId = interaction.options.getString('order_id');
      const ord = qOrders.get.get(orderId);
      
      if (!ord) {
        return interaction.reply({ ephemeral: true, content: `❌ Không tìm thấy đơn **${orderId}**` });
      }

      if (ord.status !== 'PENDING') {
        return interaction.reply({ ephemeral: true, content: `❌ Đơn **${orderId}** đã được xử lý (Status: ${ord.status})` });
      }

      try {
        qOrders.updatePaid.run('manual_admin', orderId);
        await dmKeys({ userId: ord.user_id, productId: ord.product_id, qty: ord.qty, orderId });
        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã xác nhận đơn **${orderId}** và gửi ${ord.qty} key cho <@${ord.user_id}>`
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    // ===== DELETE COMMANDS =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_delete_product') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const productId = interaction.options.getInteger('product_id');
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      
      if (!product) {
        return interaction.reply({ ephemeral: true, content: `❌ Không tìm thấy sản phẩm ID **${productId}**` });
      }

      const keysCount = db.prepare('SELECT COUNT(*) as c FROM keys WHERE product_id = ?').get(productId).c;

      try {
        db.prepare('DELETE FROM keys WHERE product_id = ?').run(productId);
        db.prepare('DELETE FROM products WHERE id = ?').run(productId);
        
        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã xóa sản phẩm **${product.name}** (ID: ${productId}) và ${keysCount} keys`
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_delete_category') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const categoryId = interaction.options.getInteger('category_id');
      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
      
      if (!category) {
        return interaction.reply({ ephemeral: true, content: `❌ Không tìm thấy danh mục ID **${categoryId}**` });
      }

      const productsCount = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(categoryId).c;

      try {
        db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(categoryId);
        db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
        
        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã xóa danh mục **${category.name}** (ID: ${categoryId})\n📦 ${productsCount} sản phẩm đã chuyển về "Không danh mục"`
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_delete_keys') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const productId = interaction.options.getInteger('product_id');
      const type = interaction.options.getString('type');
      
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) {
        return interaction.reply({ ephemeral: true, content: `❌ Không tìm thấy sản phẩm ID **${productId}**` });
      }

      let query = 'SELECT COUNT(*) as c FROM keys WHERE product_id = ?';
      let deleteQuery = 'DELETE FROM keys WHERE product_id = ?';
      let typeText = 'tất cả keys';
      
      if (type === 'sold') {
        query += ' AND is_sold = 1';
        deleteQuery += ' AND is_sold = 1';
        typeText = 'keys đã bán';
      } else if (type === 'unsold') {
        query += ' AND is_sold = 0';
        deleteQuery += ' AND is_sold = 0';
        typeText = 'keys chưa bán';
      }

      const keysCount = db.prepare(query).get(productId).c;

      if (keysCount === 0) {
        return interaction.reply({ ephemeral: true, content: `❌ Không có ${typeText} nào cho sản phẩm **${product.name}**` });
      }

      try {
        db.prepare(deleteQuery).run(productId);
        
        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã xóa **${keysCount} ${typeText}** của sản phẩm **${product.name}**`
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    // ===== EDIT & REPLACE KEY COMMANDS =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_edit_key') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_edit_key')
        .setTitle('✏️ Sửa Key');

      const keyIdInput = new TextInputBuilder()
        .setCustomId('edit_key_id')
        .setLabel('ID của key cần sửa')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123')
        .setRequired(true);

      const newKeyInput = new TextInputBuilder()
        .setCustomId('edit_new_key')
        .setLabel('Key mới')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('KEY-XXXX-XXXX-XXXX')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(keyIdInput),
        new ActionRowBuilder().addComponents(newKeyInput)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_replace_key') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới dùng được lệnh này.' });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_replace_key')
        .setTitle('🔄 Thay thế Key');

      const productIdInput = new TextInputBuilder()
        .setCustomId('replace_product_id')
        .setLabel('ID sản phẩm')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1')
        .setRequired(true);

      const oldKeyInput = new TextInputBuilder()
        .setCustomId('replace_old_key')
        .setLabel('Key cũ (cần thay thế)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('KEY-OLD-XXXX-XXXX')
        .setRequired(true);

      const newKeyInput = new TextInputBuilder()
        .setCustomId('replace_new_key')
        .setLabel('Key mới')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('KEY-NEW-YYYY-YYYY')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(productIdInput),
        new ActionRowBuilder().addComponents(oldKeyInput),
        new ActionRowBuilder().addComponents(newKeyInput)
      );

      return interaction.showModal(modal);
    }

    // ===== MODAL SUBMISSIONS FOR EDIT/REPLACE =====
    if (interaction.isModalSubmit() && interaction.customId === 'modal_edit_key') {
      const keyId = parseInt(interaction.fields.getTextInputValue('edit_key_id'));
      const newKey = interaction.fields.getTextInputValue('edit_new_key').trim();

      if (isNaN(keyId)) {
        return interaction.reply({ ephemeral: true, content: '❌ ID key không hợp lệ!' });
      }

      if (!newKey) {
        return interaction.reply({ ephemeral: true, content: '❌ Key mới không được để trống!' });
      }

      try {
        const existing = db.prepare('SELECT * FROM keys WHERE id = ?').get(keyId);
        if (!existing) {
          return interaction.reply({ ephemeral: true, content: `❌ Không tìm thấy key với ID **${keyId}**` });
        }

        db.prepare('UPDATE keys SET key = ? WHERE id = ?').run(newKey, keyId);

        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã cập nhật key ID **${keyId}**\n\n**Cũ:** \`${existing.key}\`\n**Mới:** \`${newKey}\``
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_replace_key') {
      const productId = parseInt(interaction.fields.getTextInputValue('replace_product_id'));
      const oldKey = interaction.fields.getTextInputValue('replace_old_key').trim();
      const newKey = interaction.fields.getTextInputValue('replace_new_key').trim();

      if (isNaN(productId)) {
        return interaction.reply({ ephemeral: true, content: '❌ ID sản phẩm không hợp lệ!' });
      }

      if (!oldKey || !newKey) {
        return interaction.reply({ ephemeral: true, content: '❌ Key cũ và key mới không được để trống!' });
      }

      try {
        const existing = db.prepare('SELECT * FROM keys WHERE product_id = ? AND key = ?').get(productId, oldKey);
        
        if (!existing) {
          return interaction.reply({ 
            ephemeral: true, 
            content: `❌ Không tìm thấy key **${oldKey}** trong sản phẩm ID **${productId}**` 
          });
        }

        if (existing.is_sold === 1) {
          return interaction.reply({ 
            ephemeral: true, 
            content: `❌ Không thể thay thế key đã bán!\n\nKey: \`${oldKey}\`` 
          });
        }

        db.prepare('UPDATE keys SET key = ? WHERE id = ?').run(newKey, existing.id);

        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã thay thế key trong sản phẩm ID **${productId}**\n\n**Cũ:** \`${oldKey}\`\n**Mới:** \`${newKey}\``
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    // Admin set discount
    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_set_discount') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới có quyền!' });
      }

      const productId = interaction.options.getInteger('product_id');
      const discount = interaction.options.getInteger('discount');

      if (discount < 0 || discount > 100) {
        return interaction.reply({ ephemeral: true, content: '❌ % giảm giá phải từ 0-100!' });
      }

      try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!product) {
          return interaction.reply({ ephemeral: true, content: `❌ Không tìm thấy sản phẩm ID **${productId}**` });
        }

        db.prepare('UPDATE products SET discount_percent = ? WHERE id = ?').run(discount, productId);

        const finalPrice = discount > 0 ? Math.floor(product.price * (100 - discount) / 100) : product.price;
        const priceStr = discount > 0 
          ? `${product.price.toLocaleString()}đ → **${finalPrice.toLocaleString()}đ** (-${discount}%)`
          : `${product.price.toLocaleString()}đ (không giảm giá)`;

        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã cập nhật giảm giá cho **${product.name}**\n\n${priceStr}`
        });
      } catch (e) {
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    // Admin create coupon
    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_create_coupon') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới có quyền!' });
      }

      const code = interaction.options.getString('code').trim().toUpperCase();
      const discount = interaction.options.getInteger('discount');
      const maxUses = interaction.options.getInteger('max_uses') ?? -1;

      if (discount < 1 || discount > 100) {
        return interaction.reply({ ephemeral: true, content: '❌ % giảm giá phải từ 1-100!' });
      }

      try {
        db.prepare('INSERT INTO coupons(code, discount_percent, max_uses, used_count, active, expires_at) VALUES(?, ?, ?, 0, 1, NULL)').run(
          code, discount, maxUses
        );

        const usesStr = maxUses === -1 ? 'Không giới hạn' : `${maxUses} lần`;
        return interaction.reply({
          ephemeral: true,
          content: `✅ Đã tạo mã giảm giá **${code}**\n\n💰 Giảm: **${discount}%**\n🔢 Số lần dùng: ${usesStr}\n🟢 Trạng thái: Đã kích hoạt`
        });
      } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
          return interaction.reply({ ephemeral: true, content: `❌ Mã **${code}** đã tồn tại!` });
        }
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    // Admin clear messages
    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_clear') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới có quyền!' });
      }

      const amount = interaction.options.getInteger('amount');
      
      if (amount < 1 || amount > 100) {
        return interaction.reply({ ephemeral: true, content: '❌ Số lượng phải từ 1-100!' });
      }

      try {
        await interaction.deferReply({ ephemeral: true });
        
        const messages = await interaction.channel.messages.fetch({ limit: amount });
        const deletableMessages = messages.filter(m => {
          const age = Date.now() - m.createdTimestamp;
          return age < 14 * 24 * 60 * 60 * 1000; // Discord chỉ cho xóa message < 14 ngày
        });

        await interaction.channel.bulkDelete(deletableMessages, true);
        
        return interaction.editReply({
          content: `✅ Đã xóa **${deletableMessages.size}** tin nhắn!`
        });
      } catch (e) {
        return interaction.editReply({ content: `❌ Lỗi: ${e.message}` });
      }
    }

    // Admin xác nhận thanh toán thủ công
    if (interaction.isChatInputCommand() && interaction.commandName === 'admin_confirm') {
      if (interaction.user.id !== process.env.ADMIN_USER_ID) {
        return interaction.reply({ ephemeral: true, content: '❌ Chỉ admin mới có quyền!' });
      }

      const orderId = interaction.options.getString('order_id').trim();

      try {
        const order = qOrders.get.get(orderId);
        
        if (!order) {
          return interaction.reply({ ephemeral: true, content: `❌ Không tìm thấy đơn hàng: ${orderId}` });
        }

        if (order.status === 'PAID') {
          return interaction.reply({ ephemeral: true, content: `✅ Đơn hàng ${orderId} đã được thanh toán rồi!` });
        }

        if (order.status === 'EXPIRED') {
          return interaction.reply({ ephemeral: true, content: `⏰ Đơn hàng ${orderId} đã hết hạn. Không thể xác nhận.` });
        }

        // Xác nhận thanh toán
        qOrders.updatePaid.run('ADMIN_CONFIRM', orderId);

        // Remove QR tracking
        activeQRMessages.delete(order.user_id);

        // Gửi key cho user
        try {
          await dmKeys({ 
            userId: order.user_id, 
            productId: order.product_id, 
            qty: order.qty, 
            orderId 
          });

          return interaction.reply({ 
            ephemeral: true, 
            content: `✅ Đã xác nhận thanh toán cho đơn **${orderId}**\n💰 Số tiền: ${order.amount.toLocaleString()}đ\n📦 Đã gửi ${order.qty} key qua DM cho <@${order.user_id}>` 
          });
        } catch (e) {
          console.error('Failed to send keys:', e);
          return interaction.reply({ 
            ephemeral: true, 
            content: `⚠️ Đã xác nhận thanh toán nhưng không thể gửi key.\n❌ Lỗi: ${e.message}\n\nVui lòng gửi key thủ công cho user <@${order.user_id}>` 
          });
        }
      } catch (e) {
        console.error('Admin confirm error:', e);
        return interaction.reply({ ephemeral: true, content: `❌ Lỗi: ${e.message}` });
      }
    }

    // ===== USER COMMANDS =====

    if (interaction.isChatInputCommand() && interaction.commandName === 'buy') {
      return interaction.reply({ ephemeral: true, content: 'Chọn **danh mục**:', components: [buildCategoryRow()] });
    }

    // Chọn danh mục → Update message, GIỮ danh mục + thêm sản phẩm
    if (interaction.isStringSelectMenu() && interaction.customId === 'sel_category') {
      // Delete active QR if user reselects category
      const userId = interaction.user.id;
      if (activeQRMessages.has(userId)) {
        const qrData = activeQRMessages.get(userId);
        try {
          // Delete the QR message from channel
          const channel = await client.channels.fetch(interaction.channelId);
          const qrMessage = await channel.messages.fetch(qrData.messageId);
          await qrMessage.delete();
          
          // Also expire the order
          db.prepare("UPDATE orders SET status='EXPIRED' WHERE id=?").run(qrData.orderId);
        } catch (e) {
          console.error('Failed to delete QR message:', e);
        }
        activeQRMessages.delete(userId);
      }
      
      const catId = Number(interaction.values[0]);
      const products = qProducts.byCategory(catId);

      if (!products.length) {
        return interaction.update({
          content: 'Danh mục này chưa có sản phẩm. Vui lòng chọn danh mục khác.',
          components: [buildCategoryRow()]
        });
      }

      const opts = products.map(p => {
        const rem = remainKeys(p.id);
        const priceStr = formatPrice(p).replace(/~~/g, '').replace(/\*/g, ''); // Remove markdown
        const label = `${p.name} — ${priceStr} (còn ${rem})` + (rem <= 0 ? ' — Hết hàng' : '');
        return { label, value: String(p.id) };
      });

      const rowProducts = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`sel_product_${catId}`)
          .setPlaceholder('Chọn sản phẩm…')
          .addOptions(opts)
      );

      // Hiện dropdown danh mục + dropdown sản phẩm
      return interaction.update({
        content: 'Chọn **sản phẩm**:',
        components: [buildCategoryRow(), rowProducts]
      });
    }

    // Chọn sản phẩm → CHỈ hiện dropdown số lượng (XÓA dropdown danh mục)
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('sel_product_')) {
      const productId = Number(interaction.values[0]);
      const product = qProducts.allActive().find(p => p.id === productId);
      
      if (!product) {
        return interaction.update({
          content: 'Sản phẩm không tồn tại.',
          components: [buildCategoryRow()]
        });
      }

      const rem = remainKeys(product.id);
      if (rem <= 0) {
        return interaction.update({
          content: `❌ **${product.name}** hiện **hết hàng**. Vui lòng chọn sản phẩm khác.`,
          components: [buildCategoryRow()]
        });
      }

      const maxQty = Math.min(25, rem);
      const qtyMenu = new StringSelectMenuBuilder()
        .setCustomId(`sel_qty_${product.id}`)
        .setPlaceholder(`Chọn số lượng (tối đa ${maxQty})`)
        .addOptions([...Array(maxQty)].map((_, i) => ({ label: String(i + 1), value: String(i + 1) })));
      const rowQty = new ActionRowBuilder().addComponents(qtyMenu);

      // CHỈ hiện dropdown số lượng (XÓA dropdown danh mục để tránh conflict)
      return interaction.update({
        content: `**${product.name}** — ${formatPrice(product)}\nCòn **${rem} key**. Chọn **số lượng**:`,
        components: [rowQty]
      });
    }

    // Chọn số lượng → Show modal nhập mã giảm giá
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('sel_qty_')) {
      const productId = Number(interaction.customId.split('_')[2]);
      const qty = Number(interaction.values[0]);

      const product = qProducts.allActive().find(p => p.id === productId);
      if (!product) return interaction.reply({ ephemeral: true, content: 'Sản phẩm không tồn tại.' });

      const remNow = remainKeys(productId);
      if (remNow <= 0) return interaction.reply({ ephemeral: true, content: `❌ ${product.name} đã **hết hàng**.` });
      if (qty > remNow) return interaction.reply({ ephemeral: true, content: `❌ Chỉ còn **${remNow} key**. Vui lòng chọn lại số lượng ≤ ${remNow}.` });

      // Show modal for coupon code (store messageId to update later)
      const modal = new ModalBuilder()
        .setCustomId(`modal_coupon_${productId}_${qty}_${interaction.message.id}`)
        .setTitle('🎟️ Mã giảm giá (Tùy chọn)');

      const couponInput = new TextInputBuilder()
        .setCustomId('coupon_code')
        .setLabel('Nhập mã giảm giá (nếu có):')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: SALE20 (để trống nếu không có)')
        .setRequired(false);

      modal.addComponents(new ActionRowBuilder().addComponents(couponInput));
      
      return interaction.showModal(modal);
    }

    // Handle coupon modal → create order
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_coupon_')) {
      console.log('🎫 Modal coupon submitted:', interaction.customId);
      const parts = interaction.customId.split('_');
      const productId = parts[2];
      const qty = parts[3];
      const messageId = parts[4]; // Get the original message ID
      const couponCode = interaction.fields.getTextInputValue('coupon_code').trim();
      
      console.log(`📦 Creating order: Product ${productId}, Qty ${qty}, Coupon: ${couponCode || 'none'}`);

      // Update the original message to show only category dropdown
      try {
        const channel = await client.channels.fetch(interaction.channelId);
        const originalMessage = await channel.messages.fetch(messageId);
        await originalMessage.edit({
          content: 'Chọn **danh mục**:',
          components: [buildCategoryRow()]
        });
      } catch (e) {
        console.error('Failed to update original message:', e);
      }

      const product = qProducts.allActive().find(p => p.id === Number(productId));
      if (!product) {
        console.error('❌ Product not found:', productId);
        return interaction.reply({ ephemeral: true, content: 'Sản phẩm không tồn tại.' });
      }

      // Check if user has existing QR - delete it first
      const userId = interaction.user.id;
      if (activeQRMessages.has(userId)) {
        console.log('🗑️ Deleting old QR for user:', userId);
        const oldQrData = activeQRMessages.get(userId);
        try {
          // Delete old QR message from channel
          const channel = await client.channels.fetch(interaction.channelId);
          const oldMsg = await channel.messages.fetch(oldQrData.messageId);
          await oldMsg.delete();
          
          // Expire old order
          db.prepare("UPDATE orders SET status='EXPIRED' WHERE id=?").run(oldQrData.orderId);
        } catch (e) {
          console.error('Failed to delete old QR:', e);
        }
        activeQRMessages.delete(userId);
      }

      // Reply ephemeral to acknowledge
      await interaction.reply({ ephemeral: true, content: '⏳ Đang tạo mã QR thanh toán...' });
      console.log('✅ Acknowledged, generating QR...');

      const orderId = newOrderId();
      let baseAmount = calcFinalPrice(product) * Number(qty);
      let finalAmount = baseAmount;
      let couponInfo = '';
      let appliedCoupon = null;

      // Apply coupon if provided
      if (couponCode) {
        const result = applyCoupon(baseAmount, couponCode);
        if (result.error) {
          couponInfo = `\n⚠️ Mã giảm giá: ${result.error}`;
        } else {
          finalAmount = result.amount;
          appliedCoupon = result.couponCode;
          couponInfo = `\n🎟️ Mã giảm giá: **${result.couponCode}** (-${result.discountPercent}%)\n💰 Giảm: ${result.discount.toLocaleString()}đ`;
        }
      }

      qOrders.insert.run(orderId, interaction.user.id, interaction.channelId, Number(productId), Number(qty), finalAmount, 'PENDING', null, Math.floor(Date.now() / 1000));
      console.log(`📝 Order created: ${orderId}, Amount: ${finalAmount}`);

      try {
        const qrBuf = await buildPaymentQR({ orderId, amount: finalAmount });
        console.log(`✅ QR generated, size: ${qrBuf.length} bytes`);
        
        const file = new AttachmentBuilder(qrBuf, { name: `${orderId}.png` });
        const embed = paymentEmbed(orderId, finalAmount)
          .setDescription(`Sản phẩm: **${product.name}** x${qty}\nTổng tiền gốc: ${baseAmount.toLocaleString()}đ${couponInfo}\n\n**Tổng thanh toán: ${finalAmount.toLocaleString()}đ**\n\n⏰ QR sẽ hết hạn sau **3 phút**`)
          .setImage(`attachment://${orderId}.png`);
        
        // Send QR to channel (not ephemeral) so we can delete it later
        const channel = await client.channels.fetch(interaction.channelId);
        const qrMessage = await channel.send({ 
          content: `<@${interaction.user.id}>`,
          embeds: [embed], 
          files: [file] 
        });
        
        console.log(`✅ QR message sent: ${qrMessage.id}`);

        // Track QR message for this user
        activeQRMessages.set(interaction.user.id, { messageId: qrMessage.id, orderId });

        // Increment coupon usage if applied
        if (appliedCoupon) {
          db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(appliedCoupon);
        }
      } catch (e) {
        console.error('❌ Error generating/sending QR:', e);
        await interaction.followUp({ ephemeral: true, content: `❌ Lỗi tạo QR: ${e.message}` });
        return;
      }

      // Store messageId and channelId for timeout closure
      const qrMessageId = qrMessage.id;
      const channelId = interaction.channelId;
      const buyerUserId = interaction.user.id;

      // Tự động hủy order sau 3 phút nếu chưa thanh toán
      setTimeout(async () => {
        try {
          const order = qOrders.get.get(orderId);
          if (order && order.status === 'PENDING') {
            // Hủy order
            db.prepare("UPDATE orders SET status='EXPIRED' WHERE id=?").run(orderId);
            
            // Remove QR tracking
            activeQRMessages.delete(buyerUserId);
            
            // Xóa QR message from channel
            try {
              const channel = await client.channels.fetch(channelId);
              const msg = await channel.messages.fetch(qrMessageId);
              await msg.delete();
            } catch (delErr) {
              console.error('Failed to delete expired QR:', delErr);
            }
            
            // Gửi thông báo hết hạn
            try {
              const user = await client.users.fetch(buyerUserId);
              await user.send(`⏰ Đơn hàng **${orderId}** đã hết hạn do không thanh toán trong 3 phút.\n\nVui lòng tạo đơn mới nếu bạn vẫn muốn mua.`);
            } catch {}
          }
        } catch (e) {
          console.error('Auto-expire error:', e);
        }
      }, 3 * 60 * 1000); // 3 phút

      return;
    }

    // ===== Admin tiện dụng (tuỳ chọn) =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'stock') {
      const rows = db.prepare(
        'SELECT p.id, p.name, p.price, p.discount_percent, COUNT(k.id) as remain FROM products p LEFT JOIN keys k ON p.id=k.product_id AND k.is_sold=0 WHERE p.active=1 GROUP BY p.id'
      ).all();
      if (!rows.length) return interaction.reply({ ephemeral: true, content: 'Chưa có sản phẩm.' });
      const lines = rows.map(r => {
        const priceStr = formatPrice(r);
        return `#${r.id} • ${r.name} — ${priceStr} — **${r.remain} key** còn lại`;
      });
      return interaction.reply({ ephemeral: true, content: lines.join('\n') });
    }

  } catch (e) {
    console.error('Interaction error:', e);
    if (interaction.isRepliable()) {
      try { await interaction.reply({ ephemeral: true, content: 'Có lỗi xảy ra, thử lại nhé.' }); } catch {}
    }
  }
});

// ============== Start ==============
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`🌐 Webhook server listening on http://localhost:${port}`));
client.login(process.env.DISCORD_TOKEN);
