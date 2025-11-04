# 🎯 HƯỚNG DẪN DEPLOY BOT MIỄN PHÍ - TÓM TẮT NHANH

## ⭐ Lựa chọn tốt nhất: Render.com + UptimeRobot

### Tại sao?
- ✅ 100% miễn phí
- ✅ Không cần thẻ tín dụng
- ✅ Chạy 24/7 (với UptimeRobot ping)
- ✅ Deploy tự động từ GitHub
- ✅ Dễ setup (10 phút)

---

## 🚀 5 BƯỚC DEPLOY (10 phút)

### Bước 1: Push code lên GitHub (3 phút)
```powershell
# Mở PowerShell trong thư mục bot
cd "C:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot"

# Khởi tạo git
git init
git add .
git commit -m "Deploy to Render"

# Tạo repo trên GitHub.com (Private!)
# Rồi chạy (thay YOUR_USERNAME):
git remote add origin https://github.com/YOUR_USERNAME/auto-buy-bot.git
git branch -M main
git push -u origin main
```

### Bước 2: Đăng ký Render.com (1 phút)
1. Vào https://render.com
2. **Sign up with GitHub**
3. Authorize Render

### Bước 3: Tạo Web Service (3 phút)
1. Dashboard → **New +** → **Web Service**
2. Connect repo: `auto-buy-bot`
3. Cấu hình:
   - Name: `auto-buy-bot`
   - Environment: `Node`
   - Build: `npm install`
   - Start: `node index.js`
   - Plan: **Free**

### Bước 4: Add Environment Variables (2 phút)
Click **Advanced** → Add các biến sau:

```
DISCORD_TOKEN = YOUR_DISCORD_BOT_TOKEN
CLIENT_ID = YOUR_CLIENT_ID
GUILD_ID = YOUR_GUILD_ID
PORT = 3000
SHOP_TITLE = auto buy
ADMIN_USER_ID = YOUR_ADMIN_USER_ID
ACCOUNT_NO = YOUR_BANK_ACCOUNT_NUMBER
ACCOUNT_NAME = YOUR_BANK_ACCOUNT_NAME
BANK_BIN = 970407
USE_IMG_VIETQR = true
WEBHOOK_SECRET = auto_buy_secret_2024_abc123xyz
SHOP_CHANNEL_ID = 1435159170557935697
BASE_URL = https://auto-buy-bot.onrender.com
CASSO_API_KEY = (để trống nếu chưa có)
```

Click **Create Web Service**

### Bước 5: Giữ bot luôn chạy (1 phút)
1. Vào https://uptimerobot.com
2. Sign up
3. **Add New Monitor**:
   - Type: HTTP(s)
   - URL: `https://auto-buy-bot.onrender.com/`
   - Interval: 5 minutes
4. **Create Monitor**

**XONG!** Bot chạy 24/7 miễn phí 🎉

---

## 📱 Sau khi deploy

### Đăng ký commands:
Vào Render Dashboard → **Shell** tab:
```bash
node register-commands.js
```

### Check logs:
Render Dashboard → **Logs** tab

### Update code:
```powershell
# Trên máy Windows
cd "C:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot"
git add .
git commit -m "Update"
git push

# Render sẽ tự động deploy lại
```

---

## ⚡ Troubleshooting

### Bot bị sleep?
→ Kiểm tra UptimeRobot có đang ping không

### Bot không nhận command?
→ Chạy `node register-commands.js` trong Shell

### Deploy fail?
→ Check Logs tab, thường là thiếu env variable

### Database mất?
→ Render không persistent storage, cần setup external DB
→ Hoặc backup database định kỳ

---

## 💰 Chi phí

| Item | Giá |
|------|-----|
| Render.com Free Tier | **0đ** |
| UptimeRobot | **0đ** |
| GitHub Private Repo | **0đ** |
| **TỔNG** | **0đ/tháng** |

---

## 🎁 Bonus: Backup Plan

Deploy lên nhiều nền tảng để có backup:

1. **Primary:** Render.com (free, ổn định)
2. **Backup:** Railway.app ($5 credit/tháng)
3. **Emergency:** Replit (free, nhưng sleep nhiều)

---

## 📚 Xem thêm

- `FREE-HOSTING-GUIDE.md` - Hướng dẫn chi tiết deploy
- `AUTO-START-GUIDE.md` - Các cách khác để chạy bot
- `CASSO-SETUP.md` - Setup auto check thanh toán

---

## 🎯 TÓM TẮT

1. ✅ Push code lên GitHub
2. ✅ Deploy lên Render.com
3. ✅ Add environment variables
4. ✅ Setup UptimeRobot ping
5. ✅ Bot chạy 24/7 miễn phí!

**Thời gian:** 10 phút
**Chi phí:** 0đ
**Kết quả:** Bot chạy 24/7 không cần mở máy 🚀
