# 🚀 Hướng dẫn Auto-Start Bot 24/7

## 📋 Các cách chạy bot tự động

### ⭐ Cách 1: VPS/Cloud Server (Khuyên dùng - Chạy 24/7)

**Ưu điểm:**
- ✅ Chạy 24/7 không cần mở máy
- ✅ Tốc độ nhanh, ổn định
- ✅ IP tĩnh, không lo mất kết nối
- ✅ Dễ quản lý, backup

**Nhà cung cấp VPS giá rẻ:**

1. **Hostinger VPS** (80k-150k/tháng)
   - Link: https://hostinger.vn
   - RAM: 1-2GB
   - Hỗ trợ tiếng Việt

2. **Vultr** ($5-10/tháng = 120k-240k)
   - Link: https://vultr.com
   - RAM: 1-2GB
   - Nhiều data center Châu Á

3. **DigitalOcean** ($6/tháng = 145k)
   - Link: https://digitalocean.com
   - RAM: 1GB
   - Giao diện đẹp, dễ dùng

4. **Contabo** (€4/tháng = 100k)
   - Link: https://contabo.com
   - RAM: 8GB (rẻ nhất)
   - Server Đức/Singapore

---

## 🖥️ Hướng dẫn Deploy lên VPS (Ubuntu)

### Bước 1: Thuê VPS và SSH vào
```bash
# Từ máy Windows, dùng PowerShell hoặc PuTTY
ssh root@your_vps_ip
```

### Bước 2: Cài Node.js
```bash
# Cài Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Check version
node -v
npm -v
```

### Bước 3: Cài Git
```bash
sudo apt update
sudo apt install git -y
```

### Bước 4: Upload bot lên VPS

**Cách 4.1: Dùng Git (Khuyên dùng)**
```bash
# Trên máy Windows, tạo GitHub repo private
# Đẩy code lên GitHub
cd "C:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/auto-buy-bot.git
git push -u origin main

# Trên VPS, clone về
cd /root
git clone https://github.com/your-username/auto-buy-bot.git
cd auto-buy-bot
```

**Cách 4.2: Dùng FileZilla (Dễ hơn)**
1. Tải FileZilla: https://filezilla-project.org/
2. Kết nối SFTP:
   - Host: `sftp://your_vps_ip`
   - Username: `root`
   - Password: mật khẩu VPS
   - Port: 22
3. Upload toàn bộ thư mục bot lên `/root/auto-buy-bot`

### Bước 5: Cài dependencies
```bash
cd /root/auto-buy-bot
npm install
```

### Bước 6: Chỉnh sửa .env
```bash
nano .env
# Sửa BASE_URL thành IP/domain của VPS
# BASE_URL=http://your_vps_ip:3000
# Ctrl+X, Y, Enter để lưu
```

### Bước 7: Cài PM2 (Process Manager)
```bash
npm install -g pm2

# Start bot với PM2
pm2 start index.js --name "auto-buy-bot"

# Xem logs
pm2 logs auto-buy-bot

# Xem status
pm2 status

# Auto-start khi VPS khởi động lại
pm2 startup
pm2 save
```

### Bước 8: Đăng ký commands
```bash
node register-commands.js
```

### Bước 9: Mở port 3000 (nếu dùng webhook)
```bash
sudo ufw allow 3000
sudo ufw enable
```

**Xong!** Bot sẽ chạy 24/7 trên VPS.

---

## 💻 Cách 2: Chạy trên Windows (Khi mở máy)

### Cách 2.1: Task Scheduler (Windows)

1. Tạo file `start-bot.bat`:
```batch
@echo off
cd /d "C:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot"
node index.js
pause
```

2. Mở **Task Scheduler** (Gõ `taskschd.msc` trong Run)
3. **Create Basic Task**
   - Name: Auto Buy Bot
   - Trigger: **When I log on**
   - Action: **Start a program**
   - Program: `C:\Path\To\start-bot.bat`
4. Check **Run whether user is logged on or not**

### Cách 2.2: Startup Folder

1. Nhấn `Win + R`, gõ `shell:startup`
2. Copy file `start-bot.bat` vào thư mục này
3. Bot sẽ tự động chạy khi Windows khởi động

### Cách 2.3: NSSM (Windows Service)

```powershell
# Tải NSSM: https://nssm.cc/download
# Giải nén vào C:\nssm

# Mở PowerShell as Admin
cd C:\nssm\win64

# Cài bot làm Windows Service
.\nssm.exe install AutoBuyBot "C:\Program Files\nodejs\node.exe" "C:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot\index.js"

# Set working directory
.\nssm.exe set AutoBuyBot AppDirectory "C:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot"

# Start service
.\nssm.exe start AutoBuyBot

# Check status
.\nssm.exe status AutoBuyBot
```

---

## ☁️ Cách 3: Heroku (Miễn phí nhưng hạn chế)

**Lưu ý:** Heroku không còn free tier. Bỏ qua cách này.

---

## 🐳 Cách 4: Docker (Advanced)

Nếu bạn quen Docker:

1. Tạo `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
```

2. Tạo `docker-compose.yml`:
```yaml
version: '3'
services:
  bot:
    build: .
    restart: always
    volumes:
      - ./shop.db:/app/shop.db
    ports:
      - "3000:3000"
    env_file:
      - .env
```

3. Chạy:
```bash
docker-compose up -d
```

---

## 📱 Cách 5: Termux (Android Phone)

Nếu có Android phone:

1. Cài Termux: https://f-droid.org/en/packages/com.termux/
2. Trong Termux:
```bash
pkg update
pkg install nodejs git
git clone https://github.com/your-repo/auto-buy-bot.git
cd auto-buy-bot
npm install
node index.js
```

3. Giữ Termux chạy background (cài Termux:Boot)

---

## ⚡ Các lệnh PM2 hữu ích

```bash
# Start bot
pm2 start index.js --name bot

# Stop bot
pm2 stop bot

# Restart bot
pm2 restart bot

# Xem logs real-time
pm2 logs bot

# Xem logs cũ
pm2 logs bot --lines 100

# Monitor CPU/RAM
pm2 monit

# Xóa bot khỏi PM2
pm2 delete bot

# List tất cả processes
pm2 list

# Save để auto-start
pm2 save

# Update code và restart
cd /root/auto-buy-bot
git pull
npm install
pm2 restart bot
```

---

## 🔧 Troubleshooting

### Bot không tự khởi động lại khi crash
```bash
# PM2 sẽ tự động restart, nhưng check:
pm2 startup
pm2 save
```

### VPS hết RAM
```bash
# Check RAM
free -h

# Tạo swap (nếu RAM < 1GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Port 3000 bị chiếm
```bash
# Tìm process đang dùng port 3000
sudo lsof -i :3000
# Kill process
sudo kill -9 <PID>
```

---

## 💰 So sánh chi phí

| Phương án | Chi phí | Ưu điểm | Nhược điểm |
|-----------|---------|---------|------------|
| VPS Hostinger | 80k/tháng | Rẻ, hỗ trợ VN | RAM thấp |
| VPS Vultr | 120k/tháng | Ổn định, nhiều DC | Tiếng Anh |
| Windows 24/7 | 0đ | Miễn phí | Tốn điện, không ổn định |
| Android Termux | 0đ | Miễn phí, di động | Không mạnh, hao pin |

---

## 🎯 Khuyến nghị

**Nếu kinh doanh nghiêm túc:** Dùng VPS (Hostinger/Vultr)
**Nếu test/hobby:** Chạy trên máy Windows với Task Scheduler
**Nếu không có tiền:** Termux trên Android

---

## 📞 Support

Nếu cần hỗ trợ deploy lên VPS, liên hệ admin bot.
