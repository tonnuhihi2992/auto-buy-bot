# 🆓 Hướng dẫn Deploy Bot MIỄN PHÍ lên Render.com

## ⭐ Tại sao chọn Render.com?
- ✅ **Hoàn toàn miễn phí**
- ✅ Chạy 24/7 (có sleep sau 15 phút không hoạt động, nhưng tự wake up)
- ✅ Không cần thẻ tín dụng
- ✅ Deploy tự động từ GitHub
- ✅ Logs, monitoring miễn phí
- ✅ Database PostgreSQL miễn phí (nếu cần)

---

## 📋 Bước 1: Chuẩn bị code

### 1.1. Tạo file `.gitignore`
```
node_modules/
.env
shop.db
*.log
```

### 1.2. Tạo file `render.yaml` (optional)
```yaml
services:
  - type: web
    name: auto-buy-bot
    env: node
    buildCommand: npm install
    startCommand: node index.js
    healthCheckPath: /
    envVars:
      - key: DISCORD_TOKEN
        sync: false
      - key: CLIENT_ID
        sync: false
      - key: GUILD_ID
        sync: false
```

### 1.3. Update package.json
Thêm script start:
```json
{
  "scripts": {
    "start": "node index.js",
    "register": "node register-commands.js"
  }
}
```

---

## 📋 Bước 2: Tạo GitHub Repository

### 2.1. Tạo repo mới trên GitHub
1. Vào https://github.com/new
2. Tên repo: `auto-buy-bot-private`
3. Chọn **Private** (quan trọng!)
4. Click **Create repository**

### 2.2. Push code lên GitHub
```powershell
# Mở PowerShell trong thư mục bot
cd "C:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot"

# Initialize git (nếu chưa có)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Thêm remote (thay YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/auto-buy-bot-private.git

# Push lên GitHub
git branch -M main
git push -u origin main
```

---

## 📋 Bước 3: Deploy lên Render.com

### 3.1. Đăng ký Render.com
1. Vào https://render.com
2. Click **Get Started** → **Sign up with GitHub**
3. Authorize Render truy cập GitHub

### 3.2. Tạo Web Service
1. Dashboard → Click **New +** → **Web Service**
2. Connect GitHub repository: `auto-buy-bot-private`
3. Cấu hình:
   - **Name:** `auto-buy-bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Plan:** **Free**

### 3.3. Thêm Environment Variables
Click **Advanced** → **Add Environment Variable**

Thêm các biến sau:
```
DISCORD_TOKEN = MTQzMzM1Nzk4MzU0MjE1MzI3Ng.GNi1ws...
CLIENT_ID = 1433357983542153276
GUILD_ID = 1415710471813730358
PORT = 3000
BASE_URL = https://auto-buy-bot.onrender.com
SHOP_TITLE = auto buy
ADMIN_USER_ID = 1093131101024825344
ACCOUNT_NO = 3938668386
ACCOUNT_NAME = NGUYEN DUY DOAN
BANK_BIN = 970407
USE_IMG_VIETQR = true
WEBHOOK_SECRET = auto_buy_secret_2024_abc123xyz
SHOP_CHANNEL_ID = 1435159170557935697
CASSO_API_KEY = (nếu có)
```

### 3.4. Deploy
1. Click **Create Web Service**
2. Render sẽ tự động build và deploy
3. Đợi 2-3 phút

### 3.5. Đăng ký Discord Commands
1. Vào **Shell** tab trong Render dashboard
2. Chạy: `node register-commands.js`
3. Hoặc commit file và trigger deploy

---

## 📋 Bước 4: Giữ bot luôn chạy (quan trọng!)

**Vấn đề:** Free tier Render sẽ sleep sau 15 phút không có request.

**Giải pháp:** Dùng UptimeRobot để ping bot mỗi 5 phút

### 4.1. Đăng ký UptimeRobot
1. Vào https://uptimerobot.com
2. Sign up miễn phí

### 4.2. Tạo Monitor
1. Dashboard → **Add New Monitor**
2. Cấu hình:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Auto Buy Bot
   - **URL:** `https://auto-buy-bot.onrender.com/` (URL của bot)
   - **Monitoring Interval:** 5 minutes
3. Click **Create Monitor**

**Xong!** UptimeRobot sẽ ping bot mỗi 5 phút để giữ bot luôn chạy.

---

## 🔧 Cách 2: Railway.app (Free $5/tháng credit)

### Railway.app Setup
1. Vào https://railway.app
2. Sign up with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Chọn repo `auto-buy-bot-private`
5. Add Environment Variables (giống Render)
6. Deploy

**Credit:** Railway cho $5 credit/tháng (đủ chạy bot nhỏ 24/7)

---

## 🔧 Cách 3: Replit (Free nhưng có giới hạn)

### Replit Setup
1. Vào https://replit.com
2. Sign up
3. **Create Repl** → **Import from GitHub**
4. Paste GitHub repo URL
5. Click **Import**
6. Thêm **Secrets** (giống .env)
7. Click **Run**

**Để giữ Replit luôn chạy:**
1. Cài UptimeRobot ping đến Replit URL
2. Hoặc nâng cấp Replit Hacker ($7/tháng) để Always On

---

## 🔧 Cách 4: Fly.io (Free tier)

### Fly.io Setup
```powershell
# Cài Fly CLI
iwr https://fly.io/install.ps1 -useb | iex

# Login
fly auth login

# Launch app
fly launch

# Deploy
fly deploy
```

**Free tier:** 3 VMs shared-cpu, 3GB RAM total

---

## 🔧 Cách 5: Koyeb (Free tier)

1. Vào https://koyeb.com
2. Sign up
3. **Create App** → **GitHub**
4. Chọn repo
5. Add environment variables
6. Deploy

**Free tier:** 1 service, sleep sau 15 phút

---

## 🔧 Cách 6: Glitch.com (Free)

1. Vào https://glitch.com
2. **New Project** → **Import from GitHub**
3. Paste repo URL
4. Thêm `.env` file với variables
5. Bot tự động chạy

**Lưu ý:** Glitch sleep nhanh hơn, cần ping thường xuyên

---

## 📊 So sánh các nền tảng FREE

| Platform | Free Tier | Sleep? | Cần Credit Card? | Khó deploy? |
|----------|-----------|--------|------------------|-------------|
| **Render.com** ⭐ | ✅ 750h/tháng | ✅ (15 phút) | ❌ Không | ⭐ Dễ |
| **Railway.app** | ✅ $5 credit | ❌ Không | ❌ Không | ⭐ Dễ |
| **Replit** | ✅ Limited | ✅ (1 giờ) | ❌ Không | ⭐⭐ TB |
| **Fly.io** | ✅ 3 VMs | ❌ Không | ✅ Cần | ⭐⭐⭐ Khó |
| **Koyeb** | ✅ 1 service | ✅ (15 phút) | ❌ Không | ⭐ Dễ |
| **Glitch** | ✅ Unlimited | ✅ (5 phút) | ❌ Không | ⭐ Dễ |

---

## 🎯 Khuyến nghị

### Nếu bot ít tương tác:
→ **Render.com + UptimeRobot** (100% free, ổn định)

### Nếu bot nhiều tương tác:
→ **Railway.app** ($5 credit/tháng, không sleep)

### Backup plan:
→ Deploy lên cả Render + Railway để có backup

---

## 💡 Mẹo tối ưu

### 1. Giảm thiểu sleep
Thêm endpoint health check vào `index.js`:
```javascript
app.get('/', (req, res) => {
  res.send('Bot is running! ✅');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    timestamp: Date.now() 
  });
});
```

### 2. Deploy multiple replicas
- Deploy lên cả Render + Railway
- Nếu 1 cái down thì còn backup

### 3. Optimize memory
```javascript
// Thêm vào đầu index.js
process.env.NODE_OPTIONS = '--max-old-space-size=512';
```

---

## 🚨 Troubleshooting

### Bot bị sleep liên tục
→ Setup UptimeRobot ping mỗi 5 phút

### Deploy fail
→ Check logs trong Render dashboard
→ Verify tất cả env variables đã add

### Bot không nhận commands
→ Chạy `node register-commands.js` trên Shell

### Database bị mất
→ Render filesystem không persistent, cần dùng external DB
→ Dùng Render PostgreSQL (free) hoặc upload db lên GitHub

---

## 🔐 Bảo mật

**QUAN TRỌNG:** 
- ❌ **KHÔNG** commit file `.env` lên GitHub
- ✅ Dùng Environment Variables trong Render
- ✅ Repo phải để **Private**
- ✅ Enable 2FA cho GitHub account

---

## 📞 Support

Nếu gặp khó khăn khi deploy, liên hệ admin bot.

---

**Tóm tắt bước nhanh:**
1. ✅ Push code lên GitHub (private repo)
2. ✅ Đăng ký Render.com
3. ✅ Deploy từ GitHub
4. ✅ Add Environment Variables
5. ✅ Setup UptimeRobot ping
6. ✅ Xong! Bot chạy 24/7 miễn phí 🚀
