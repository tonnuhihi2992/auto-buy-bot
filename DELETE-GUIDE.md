# 🗑️ Hướng Dẫn Xóa Sản Phẩm & Keys

## ⚠️ CẢNH BÁO QUAN TRỌNG
**Tất cả thao tác xóa là VĨNH VIỄN và KHÔNG THỂ HOÀN TÁC!**
Hãy chắc chắn trước khi xóa.

---

## 🌐 Cách 1: Web Admin Panel (Dễ nhất)

### Truy cập
```
http://localhost:3000/admin
→ Tab "Quản lý & Xóa"
```

### 1️⃣ Xóa Danh Mục
1. Chọn danh mục từ dropdown
2. Click **"Xóa danh mục"**
3. Xác nhận
4. ✅ Sản phẩm trong danh mục → chuyển về "Không danh mục"

### 2️⃣ Xóa Sản Phẩm
1. Chọn sản phẩm từ dropdown
2. Click **"Xóa sản phẩm"**
3. Xác nhận
4. ✅ Sản phẩm + TẤT CẢ keys → bị xóa vĩnh viễn

### 3️⃣ Xóa Keys Hàng Loạt
1. Chọn sản phẩm
2. Chọn loại:
   - **Tất cả keys**: Xóa mọi key (đã bán + chưa bán)
   - **Chỉ keys đã bán**: Xóa keys đã được gửi cho khách
   - **Chỉ keys chưa bán**: Xóa keys còn trong kho
3. Click **"Xóa keys"**
4. Xác nhận

### 4️⃣ Xóa Key Riêng Lẻ
1. Chọn sản phẩm từ dropdown "Xem & Xóa key riêng lẻ"
2. Danh sách keys hiển thị (chia: chưa bán / đã bán)
3. Click nút **🗑️ Xóa** bên cạnh key cần xóa
4. Xác nhận
5. ✅ Key đó bị xóa

**Ưu điểm:**
- ✅ Giao diện trực quan
- ✅ Xem preview trước khi xóa
- ✅ Xóa từng key riêng lẻ được
- ✅ Thống kê real-time

---

## 💬 Cách 2: Discord Commands

### Đăng ký commands mới
```powershell
npm run register
```

### 1️⃣ Xóa Danh Mục
```
/admin_delete_category category_id:1
```
→ Bot yêu cầu xác nhận bằng buttons ✅/❌
→ Click ✅ để xóa

### 2️⃣ Xóa Sản Phẩm
```
/admin_delete_product product_id:5
```
→ Bot hiển thị số lượng keys sẽ bị xóa
→ Click ✅ để xóa

### 3️⃣ Xóa Keys
```
/admin_delete_keys product_id:3 type:Tất cả keys
/admin_delete_keys product_id:3 type:Chỉ keys đã bán
/admin_delete_keys product_id:3 type:Chỉ keys chưa bán
```
→ Bot yêu cầu xác nhận
→ Click ✅ để xóa

**Lưu ý:**
- ⏱️ Có 30 giây để xác nhận, quá thời gian → hủy tự động
- ❌ Click "Hủy" để không xóa

---

## 🔍 Kiểm Tra Trước Khi Xóa

### Xem ID sản phẩm/danh mục
```
/stock
→ Hiển thị danh sách sản phẩm với ID và tồn kho
```

### Hoặc Web Panel
```
http://localhost:3000/admin
→ Dashboard hiển thị tất cả IDs
```

---

## 📋 So Sánh Phương Pháp

| Tính năng | Web Panel | Discord |
|-----------|-----------|---------|
| Xóa danh mục | ✅ | ✅ |
| Xóa sản phẩm | ✅ | ✅ |
| Xóa keys hàng loạt | ✅ | ✅ |
| Xóa key riêng lẻ | ✅ | ❌ |
| Xem preview keys | ✅ | ❌ |
| Xác nhận | JavaScript confirm | Button Discord |
| Thời gian xác nhận | Không giới hạn | 30 giây |

---

## 🎯 Use Cases Phổ Biến

### 1. Sản phẩm hết hàng vĩnh viễn
```
Web Panel → Quản lý & Xóa → Xóa sản phẩm
```
Hoặc:
```
/admin_delete_product product_id:X
```

### 2. Dọn dẹp keys đã bán (tiết kiệm database)
```
Web Panel → Xóa keys → "Chỉ keys đã bán"
```
Hoặc:
```
/admin_delete_keys product_id:X type:Chỉ keys đã bán
```

### 3. Xóa key bị lỗi/nhầm
```
Web Panel → Xem & Xóa key riêng lẻ → Chọn SP → 🗑️
```

### 4. Reset toàn bộ keys của sản phẩm
```
/admin_delete_keys product_id:X type:Tất cả keys
→ Sau đó nhập lại keys mới
```

### 5. Tái cấu trúc danh mục
```
/admin_delete_category category_id:X
→ Sản phẩm chuyển về "Không danh mục"
→ Tạo danh mục mới
→ Gán lại sản phẩm (cần implement update)
```

---

## ⚙️ API Endpoints (Cho Developer)

### Xóa danh mục
```http
DELETE /admin/category/:id
Response: { ok: true }
```

### Xóa sản phẩm
```http
DELETE /admin/product/:id
Response: { ok: true, keysDeleted: 150 }
```

### Xóa keys hàng loạt
```http
DELETE /admin/keys/:productId
Query params: ?onlySold=true|false (optional)
Response: { ok: true, deleted: 50 }
```

### Xóa key riêng lẻ
```http
DELETE /admin/key/:keyId
Response: { ok: true }
```

### Xem keys của sản phẩm
```http
GET /admin/keys/:productId
Response: [{ id: 1, key: "KEY-XXX", is_sold: 0 }, ...]
```

---

## 🛡️ Bảo Mật

- ✅ Tất cả admin endpoints chỉ chạy nội bộ (localhost)
- ✅ Discord commands kiểm tra `ADMIN_USER_ID`
- ⚠️ **Lưu ý**: Web panel không có authentication → Chỉ chạy localhost!
- 💡 **Khuyến nghị**: Nếu deploy public, thêm basic auth cho `/admin`

---

## 📝 Logs & Audit

Bot hiện tại **không log** các thao tác xóa.

**Nếu cần audit trail**, thêm logging:
```javascript
console.log(`[DELETE] User ${userId} deleted product ${productId} at ${new Date()}`);
```

Hoặc tạo bảng `audit_log` trong database:
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  user_id TEXT,
  target_id TEXT,
  timestamp TEXT
);
```

---

## 🚨 Recovery (Khôi Phục)

### Nếu xóa nhầm:
1. **Backup database trước khi xóa**:
   ```powershell
   copy shop.db shop.db.backup
   ```

2. **Khôi phục**:
   ```powershell
   copy shop.db.backup shop.db
   # Restart bot
   ```

### Auto backup (khuyên dùng):
Thêm vào `index.js`:
```javascript
import { copyFile } from 'fs/promises';

setInterval(async () => {
  await copyFile('shop.db', `backups/shop-${Date.now()}.db`);
}, 3600000); // Mỗi giờ
```

---

## 🎓 Best Practices

1. ✅ **Backup trước khi xóa hàng loạt**
2. ✅ **Dùng Web Panel** để preview keys trước khi xóa
3. ✅ **Xóa keys đã bán** định kỳ để database nhẹ
4. ✅ **Không xóa sản phẩm** còn đơn hàng PENDING
5. ⚠️ **Double check** product ID trước khi xóa

---

Chúc bạn quản lý shop hiệu quả! 🚀
