# 🏦 Hướng dẫn Setup Casso.vn - Tự động xác nhận thanh toán

## 📖 Tổng quan
Casso.vn là dịch vụ giúp bạn nhận thông báo real-time khi có tiền vào tài khoản ngân hàng. Bot sẽ tự động check giao dịch mỗi 30 giây và xác nhận thanh toán.

**Ưu điểm:**
- ✅ Tự động 100%, không cần thao tác thủ công
- ✅ Real-time (delay ~10-30 giây)
- ✅ Hỗ trợ hầu hết ngân hàng VN (bao gồm Techcombank)
- ✅ Ổn định, không bị block
- ✅ Có API key, dễ tích hợp

**Chi phí:**
- Gói Basic: 100,000đ/tháng (1 tài khoản)
- Gói Pro: 200,000đ/tháng (3 tài khoản)
- Gói Enterprise: 300,000đ/tháng (không giới hạn)

---

## 🚀 Các bước setup

### Bước 1: Đăng ký tài khoản Casso
1. Truy cập: https://casso.vn
2. Click **Đăng ký** (góc phải trên)
3. Điền thông tin:
   - Email
   - Mật khẩu
   - Số điện thoại
4. Xác nhận email

### Bước 2: Kết nối tài khoản ngân hàng
1. Đăng nhập vào Casso
2. Click **Kết nối ngân hàng**
3. Chọn **Techcombank**
4. Nhập thông tin đăng nhập Internet Banking:
   - Tên đăng nhập
   - Mật khẩu
   - OTP (nếu có)
5. Click **Kết nối**

**Lưu ý:** Casso sẽ lưu thông tin đăng nhập để tự động check giao dịch. Bạn có thể thay đổi mật khẩu sau khi kết nối.

### Bước 3: Lấy API Key
1. Vào menu **Cài đặt** → **API Key**
2. Click **Tạo API Key mới**
3. Copy API Key (dạng: `AKxxxxxxxxxxxxxxxx`)
4. Lưu lại để dùng ở bước tiếp theo

### Bước 4: Cấu hình Bot
1. Mở file `.env` trong thư mục bot
2. Tìm dòng `CASSO_API_KEY=`
3. Paste API Key vào:
```env
CASSO_API_KEY=AKxxxxxxxxxxxxxxxx
```
4. Lưu file

### Bước 5: Khởi động Bot
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
node index.js
```

Bot sẽ tự động:
- ✅ Check giao dịch mỗi 30 giây
- ✅ Parse mã đơn từ nội dung chuyển khoản
- ✅ Xác nhận thanh toán
- ✅ Gửi key qua DM cho khách

---

## 🧪 Test thử

### 1. Tạo đơn hàng test
1. Vào Discord, gõ `/buy`
2. Chọn sản phẩm, số lượng
3. Bot sẽ tạo QR với mã đơn: `ORD_1730000000000_12345`

### 2. Chuyển tiền test
1. Mở app Techcombank
2. Chuyển đúng số tiền (VD: 70,000đ)
3. **Quan trọng:** Nội dung chuyển khoản phải có mã đơn:
   ```
   ORD_1730000000000_12345
   ```
   Hoặc:
   ```
   Ma don ORD_1730000000000_12345 thanh toan
   ```

### 3. Chờ bot xác nhận
- Bot check mỗi 30 giây
- Khi phát hiện giao dịch khớp:
  - Console sẽ hiện: `✅ AUTO-CONFIRMED: ORD_xxx`
  - Khách nhận DM với key
  - QR code tự động biến mất

---

## 📊 Monitor

### Xem logs trong console:
```
🔄 Checking transactions...
📊 Fetched 20 transactions from Casso
✅ AUTO-CONFIRMED: ORD_1730000000000_12345 - 70,000đ
✅ Auto-sent keys for order ORD_1730000000000_12345 to user 123456789
```

### Check trong Casso Dashboard:
1. Vào https://casso.vn
2. Menu **Giao dịch**
3. Xem lịch sử giao dịch đã sync

---

## ⚙️ Cấu hình nâng cao

### Thay đổi tần suất check
Mặc định: 30 giây. Để thay đổi, sửa file `auto-payment-checker.js`:

```javascript
// Dòng 128
cron.schedule('*/30 * * * * *', async () => {
  // */30 = 30 giây
  // */10 = 10 giây (nhanh hơn)
  // */60 = 60 giây (chậm hơn, tiết kiệm API calls)
});
```

### Tăng số giao dịch check
```javascript
// Dòng 99
params: {
  pageSize: 20,  // Tăng lên 50 nếu có nhiều giao dịch
  sort: 'DESC'
}
```

---

## ❓ Troubleshooting

### ⚠️ Bot không tự động xác nhận

**Kiểm tra 1:** API Key đúng chưa?
```powershell
# Test API bằng curl
curl -H "Authorization: Apikey AKxxxxxxxx" https://oauth.casso.vn/v2/transactions?pageSize=1
```

**Kiểm tra 2:** Nội dung CK có mã đơn không?
- Mã đơn phải có format: `ORD_[số]_[số]`
- Không phân biệt hoa/thường
- Có thể có text xung quanh: `Ma don ORD_xxx thanh toan`

**Kiểm tra 3:** Số tiền có khớp không?
- Phải chuyển **chính xác** số tiền trong QR
- Sai 1 đồng cũng không được

**Kiểm tra 4:** Order status đúng không?
```sql
-- Check trong database
SELECT * FROM orders WHERE id='ORD_xxx';
-- status phải là 'PENDING'
```

### ⚠️ Casso báo lỗi "Unauthorized"
- API Key sai hoặc đã expire
- Vào Casso → Cài đặt → Xóa key cũ và tạo key mới

### ⚠️ Bot check nhưng không thấy giao dịch
- Check xem Casso có đang kết nối tài khoản không
- Vào Casso Dashboard → Giao dịch → Xem có sync không
- Có thể cần reconnect ngân hàng nếu đổi mật khẩu

---

## 🔒 Bảo mật

- ✅ API Key được lưu trong file `.env` (không commit lên git)
- ✅ Casso sử dụng HTTPS, mã hóa thông tin ngân hàng
- ✅ Bot chỉ READ giao dịch, không có quyền chuyển tiền
- ✅ Processed transactions được track để tránh xử lý 2 lần

**Khuyến nghị:**
- Đổi mật khẩu ngân hàng định kỳ
- Không share API Key với ai
- Backup file `.env` ở nơi an toàn

---

## 💡 Mẹo

### 1. Test mà không mất tiền
- Tạo đơn fake trong database
- Chuyển tiền thật với mã đơn fake
- Check xem bot có detect không

### 2. Nếu không muốn dùng Casso
Dùng lệnh `/admin_confirm <order_id>` để xác nhận thủ công:
```
/admin_confirm ORD_1730000000000_12345
```

### 3. Multi ngân hàng
Nếu bạn nhận tiền từ nhiều ngân hàng:
- Mua gói Pro/Enterprise
- Kết nối tất cả tài khoản
- Bot sẽ check tất cả

---

## 📞 Hỗ trợ

**Casso Support:**
- Email: support@casso.vn
- Hotline: 1900 55 88 03
- Live chat: https://casso.vn

**Bot Support:**
- Check logs trong console
- Xem file `WEBHOOK-GUIDE.md` cho webhook thay thế
- Contact admin bot nếu cần hỗ trợ

---

## 🎯 Tóm tắt

1. ✅ Đăng ký Casso: https://casso.vn
2. ✅ Kết nối Techcombank
3. ✅ Lấy API Key
4. ✅ Điền vào `.env`: `CASSO_API_KEY=xxx`
5. ✅ Start bot: `node index.js`
6. ✅ Test bằng cách chuyển tiền thật

**Xong!** Bot sẽ tự động xác nhận thanh toán mỗi 30 giây. 🚀
