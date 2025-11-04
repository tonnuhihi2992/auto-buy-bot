# 🤖 Auto Buy Discord Bot

Bot Discord tự động bán key/sản phẩm với thanh toán VietQR và gửi key tự động qua DM.

## ✨ Tính năng

- 🛍️ **Shop tự động** trong Discord với menu select
- 💳 **Thanh toán VietQR** tự động (webhook hoặc thủ công)
- 🔑 **Gửi key tự động** qua DM sau khi thanh toán
- 🎨 **Web Admin Panel** để quản lý sản phẩm/key dễ dàng
- 📦 **Nhập key hàng loạt** từ file TXT/CSV
- 📊 **Database SQLite** lưu trữ đơn hàng & key
- 🔐 **Admin authentication** bảo mật

## 🚀 Cài đặt nhanh

### 1. Clone và cài dependencies

```powershell
cd "c:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot"
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ template:

```powershell
copy .env.example .env
```

Chỉnh sửa `.env` với thông tin của bạn:

```env
DISCORD_TOKEN=MTQzMz...  # Token từ Discord Developer Portal
CLIENT_ID=1433357983...   # Application ID
ADMIN_USER_ID=1093131...  # Discord User ID của bạn (admin)
SHOP_CHANNEL_ID=14333...  # Kênh hiển thị shop
ACCOUNT_NO=3938668386     # Số tài khoản ngân hàng
ACCOUNT_NAME=NGUYEN DUY DOAN
BANK_BIN=970407           # Mã ngân hàng
```

### 3. Đăng ký commands

```powershell
npm run register
```

### 4. Chạy bot

```powershell
npm start
```

Bot sẽ chạy ở `http://localhost:3000`

## 🎯 Cách sử dụng

### Phương pháp 1: Web Admin Panel (KHUYÊN DÙNG)

1. Mở trình duyệt: `http://localhost:3000/admin`
2. **Thêm danh mục**: Tab "Danh mục" → Nhập tên → Tạo
3. **Thêm sản phẩm**: Tab "Sản phẩm" → Điền form → Tạo
4. **Nhập keys**:
   - **Cách 1**: Tab "Nhập Keys" → Chọn sản phẩm → Paste nhiều key → Nhập
   - **Cách 2**: Tab "Nhập hàng loạt" → Upload file .txt/.csv → Upload

**Ưu điểm Web Panel:**
- ✅ Giao diện đẹp, dễ dùng
- ✅ Copy-paste nhiều key cùng lúc
- ✅ Upload file hàng loạt
- ✅ Xem thống kê real-time
- ✅ Không giới hạn độ dài input

### Phương pháp 2: Discord Commands

#### Admin Commands (cần ADMIN_USER_ID)

```
/admin_add_category
→ Modal popup để nhập tên danh mục

/admin_add_product
→ Modal popup để nhập sản phẩm (tên, giá, danh mục)

/admin_load_keys
→ Modal popup để nhập keys (hỗ trợ nhiều dòng)

/xacnhan order_id:ORD_xxx
→ Xác nhận đơn thủ công nếu webhook lỗi
```

#### User Commands

```
/buy
→ Mua sản phẩm (chọn danh mục → sản phẩm → số lượng → QR)

/stock
→ Xem tồn kho keys còn lại
```

### Phương pháp 3: Nhập keys từ file

Tạo file `keys.txt`:
```
KEY-XXXX-XXXX-XXXX-0001
KEY-XXXX-XXXX-XXXX-0002
KEY-XXXX-XXXX-XXXX-0003
```

Upload qua Web Panel (Tab "Nhập hàng loạt") hoặc copy-paste vào modal Discord.

## 📁 Cấu trúc Database

```sql
categories      → Danh mục sản phẩm
products        → Sản phẩm (giá, tên, danh mục)
keys            → Keys (product_id, key, is_sold)
orders          → Đơn hàng (user_id, amount, status)
```

Database: `shop.db` (SQLite)

## 🔧 API Endpoints

### Admin APIs
- `GET /admin` - Web admin panel
- `GET /admin/stats` - Thống kê (products, keys)
- `GET /admin/categories` - Danh sách danh mục
- `GET /admin/products` - Danh sách sản phẩm
- `POST /admin/category` - Tạo danh mục
- `POST /admin/product` - Tạo sản phẩm
- `POST /admin/keys` - Nhập keys

### Webhook APIs
- `POST /webhook/payment` - Webhook chuẩn (orderId, amount, paid)
- `POST /webhook/txn` - Webhook ngân hàng (description chứa orderId)

**Header bắt buộc**: `x-webhook-secret: <WEBHOOK_SECRET>`

## 🔐 Bảo mật

- ✅ `.env` đã được thêm vào `.gitignore`
- ✅ Admin commands kiểm tra `ADMIN_USER_ID`
- ✅ Webhook yêu cầu `WEBHOOK_SECRET`
- ⚠️ **KHÔNG COMMIT FILE `.env` LÊN GIT!**

## 🛠️ Troubleshooting

### Bot không online?
- Kiểm tra `DISCORD_TOKEN` trong `.env`
- Chạy `npm run register` để đăng ký commands

### Commands không hiện?
- Đợi 1-2 phút (global commands)
- Hoặc set `GUILD_ID` để test nhanh (guild commands)

### Web panel không mở được?
- Kiểm tra bot đã chạy (`npm start`)
- Truy cập đúng port: `http://localhost:3000/admin`

### Keys không gửi sau thanh toán?
- Kiểm tra webhook có gửi đúng `orderId`
- Test thủ công bằng `/xacnhan order_id:ORD_xxx`

## 📝 License

MIT License - Tự do sử dụng và chỉnh sửa.

## 💡 Tips

1. **Backup database**: Copy file `shop.db` thường xuyên
2. **Monitor logs**: Xem terminal để debug lỗi
3. **Test trước**: Dùng `GUILD_ID` để test commands nhanh
4. **Đổi WEBHOOK_SECRET**: Sinh secret mạnh trước khi deploy
5. **Rate limit**: Thêm giới hạn số đơn/user nếu cần

---

Made with ❤️ for easy key selling
