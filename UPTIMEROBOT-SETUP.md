# ⏰ SETUP UPTIMEROBOT - GIỮ BOT LUÔN CHẠY

## Vấn đề: 
Render.com free tier sẽ **tự động tắt bot** sau 15 phút không có request.

## Giải pháp:
Dùng **UptimeRobot** ping bot mỗi 5 phút để giữ bot luôn hoạt động.

---

## Bước 1: Lấy URL của bot trên Render.com

Sau khi deploy xong trên Render.com, bạn sẽ có URL dạng:
```
https://auto-buy-bot-xxxx.onrender.com
```

**Copy URL này!**

---

## Bước 2: Đăng ký UptimeRobot (FREE)

1. Vào: https://uptimerobot.com/
2. Click **Sign Up** (hoặc Sign Up Free)
3. Đăng ký bằng email (hoặc Google)
4. Verify email

---

## Bước 3: Tạo Monitor

1. Click **+ Add New Monitor**
2. Điền thông tin:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Auto Buy Bot`
   - **URL (or IP):** `https://auto-buy-bot-xxxx.onrender.com` (URL Render của bạn)
   - **Monitoring Interval:** `5 minutes` (hoặc 1 minute nếu muốn)
3. Click **Create Monitor**

**XONG!** 🎉

---

## Kiểm tra

### 1. Check Dashboard UptimeRobot
- Monitor sẽ hiển thị **Up** (màu xanh)
- Uptime: 100%

### 2. Check Logs trên Render.com
- Vào **Logs** tab
- Sẽ thấy request từ UptimeRobot mỗi 5 phút:
```
GET / 200
```

### 3. Check Discord Bot
- Bot sẽ luôn **online** 24/7
- Không bị offline sau 15 phút

---

## Lưu ý quan trọng

### Free Plan Limits:
- **50 monitors** (đủ cho 50 bots)
- **5-minute intervals** (ping mỗi 5 phút)
- Hoàn toàn **FREE**, không cần thẻ tín dụng

### Render.com Free Tier Limits:
- **750 giờ/tháng** (khoảng 31 ngày)
- Với UptimeRobot ping, bot sẽ chạy **24/7 cả tháng**
- Tháng sau tự động reset

---

## Troubleshooting

### Monitor hiển thị Down?
- Check URL Render có đúng không
- Check bot có deploy thành công không (vào Render.com → Logs)
- Đợi 1-2 phút để bot khởi động

### Bot vẫn bị offline?
- Check environment variables trên Render.com
- Check DISCORD_TOKEN có đúng không
- Xem logs lỗi trên Render.com

---

## Tóm tắt flow hoàn chỉnh:

```
Code → GitHub → Render.com → UptimeRobot
                    ↑              ↓
                    └── ping every 5min ──┘
```

**Kết quả:** Bot chạy 24/7 FREE, không cần mở máy! 🚀
