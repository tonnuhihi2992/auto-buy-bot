# ✏️ Hướng Dẫn Xem, Sửa & Thay Thế Keys

## 🎯 Tính năng mới

1. **Xem keys chi tiết** - Hiển thị tất cả keys của sản phẩm
2. **Sửa key inline** - Click và sửa trực tiếp trong danh sách
3. **Thay thế key** - Tìm key cũ và thay bằng key mới
4. **Xóa key riêng lẻ** - Xóa từng key cụ thể

---

## 🌐 Cách 1: Web Admin Panel (KHUYÊN DÙNG)

### Truy cập
```
http://localhost:3000/admin
→ Tab "Quản lý & Xóa"
```

### 1️⃣ Xem Keys
1. Scroll xuống phần **"📋 Xem, Sửa & Xóa Keys"**
2. Chọn sản phẩm từ dropdown
3. Danh sách keys hiển thị:
   - ✅ **Keys chưa bán** (màu trắng, có thể sửa)
   - ❌ **Keys đã bán** (màu xám, chỉ xem)

### 2️⃣ Sửa Key Inline (Dễ nhất!)
1. Tìm key cần sửa trong danh sách
2. Click nút **✏️ Sửa**
3. Input field mở ra → Sửa key
4. Click **💾 Lưu** để xác nhận
5. Hoặc click **❌ Hủy** để không thay đổi
6. ✅ Key được cập nhật ngay lập tức!

**Tính năng:**
- ✅ Sửa trực tiếp trên danh sách
- ✅ Xem trước khi lưu
- ✅ Hủy nếu nhầm
- ✅ Tự động focus vào input

### 3️⃣ Thay Thế Key (Tìm và Thay)
1. Scroll xuống phần **"🔄 Thay thế Key"** (màu vàng)
2. Chọn sản phẩm
3. Nhập **Key cũ** (cần thay thế)
4. Nhập **Key mới**
5. Click **🔄 Thay thế Key**
6. ✅ Key cũ → Key mới

**Use case:**
- Thay key bị lỗi/nhầm
- Replace key đã gửi cho khách nhưng không hoạt động
- Update key sau khi restock

**Lưu ý:**
- ⚠️ Chỉ thay thế được **keys chưa bán**
- ❌ Keys đã bán → Không thể thay thế

### 4️⃣ Xóa Key Riêng Lẻ
1. Trong danh sách keys
2. Click nút **🗑️ Xóa** bên cạnh key cần xóa
3. Confirm popup
4. ✅ Key bị xóa

---

## 💬 Cách 2: Discord Commands

### Đăng ký commands mới
```powershell
npm run register
```

### 1️⃣ Sửa Key (theo ID)
```
/admin_edit_key
```
→ Modal popup:
- **ID của key**: 123 (tìm trong database hoặc web panel)
- **Key mới**: KEY-NEW-XXXX-XXXX

→ ✅ Key ID 123 được cập nhật

**Cách tìm Key ID:**
- Dùng Web Panel → Tab "Quản lý & Xóa" → Xem keys
- Key ID hiển thị trong list (cần inspect element để xem)

### 2️⃣ Thay Thế Key (theo Key Value)
```
/admin_replace_key
```
→ Modal popup:
- **ID sản phẩm**: 1
- **Key cũ**: KEY-OLD-XXXX-XXXX
- **Key mới**: KEY-NEW-YYYY-YYYY

→ ✅ Tìm key cũ trong sản phẩm → Thay bằng key mới

**Ưu điểm:**
- Không cần biết Key ID
- Tìm theo giá trị key trực tiếp

---

## 📋 So Sánh Phương Pháp

| Tính năng | Web Panel | Discord |
|-----------|-----------|---------|
| Xem keys | ✅ List đầy đủ | ❌ |
| Sửa key inline | ✅ Click & Edit | ❌ |
| Sửa key theo ID | ✅ | ✅ Modal |
| Thay thế key | ✅ Form riêng | ✅ Modal |
| Preview trước khi sửa | ✅ | ❌ |
| Undo/Cancel | ✅ | ❌ |
| Dễ sử dụng | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 Use Cases Thực Tế

### 1. Khách báo key không hoạt động
**Giải pháp: Thay thế key**

**Web Panel:**
```
Tab "Quản lý & Xóa" 
→ "Thay thế Key"
→ Nhập key lỗi + key mới
→ Thay thế
```

**Discord:**
```
/admin_replace_key
→ Nhập ID sản phẩm, key lỗi, key mới
→ Submit
```

### 2. Nhập nhầm 1 ký tự trong key
**Giải pháp: Sửa key inline**

**Web Panel:**
```
Tab "Quản lý & Xóa"
→ Chọn sản phẩm
→ Tìm key nhầm
→ Click ✏️ Sửa
→ Sửa ký tự
→ 💾 Lưu
```

### 3. Dọn dẹp keys trùng lặp
**Giải pháp: Xem và xóa**

```
Tab "Quản lý & Xóa"
→ Chọn sản phẩm
→ Xem danh sách keys
→ Tìm keys trùng
→ 🗑️ Xóa từng key trùng
```

### 4. Update toàn bộ keys cũ
**Giải pháp: Xóa và nhập lại**

```
1. Xóa keys cũ:
   Tab "Quản lý & Xóa" → Xóa keys → "Chỉ keys chưa bán"

2. Nhập keys mới:
   Tab "Nhập Keys" hoặc "Nhập hàng loạt"
```

---

## ⚙️ API Endpoints Mới

### Xem keys của sản phẩm
```http
GET /admin/keys/:productId
Response: [
  { id: 1, key: "KEY-XXX", is_sold: 0 },
  { id: 2, key: "KEY-YYY", is_sold: 1 }
]
```

### Sửa key theo ID
```http
PUT /admin/key/:keyId
Body: { newKey: "KEY-NEW-XXXX" }
Response: { ok: true, oldKey: "KEY-OLD", newKey: "KEY-NEW" }
```

### Thay thế key
```http
POST /admin/key/replace
Body: { 
  productId: 1, 
  oldKey: "KEY-OLD-XXXX", 
  newKey: "KEY-NEW-YYYY" 
}
Response: { ok: true, keyId: 123 }
```

---

## 🛡️ Bảo Mật & Validation

### Web Panel
- ✅ Readonly input mặc định → Click "Sửa" mới edit được
- ✅ Confirm popup trước khi xóa
- ✅ Validate key không empty
- ✅ Border màu xanh khi đang edit

### Discord Commands
- ✅ Kiểm tra `ADMIN_USER_ID`
- ✅ Validate key ID/product ID
- ❌ **Không thể thay thế keys đã bán**
- ✅ Hiển thị key cũ → key mới sau khi sửa

### Database
- ✅ Transaction-safe updates
- ✅ Kiểm tra key tồn tại trước khi update
- ✅ Prevent update sold keys (trong replace)

---

## 💡 Tips & Tricks

### 1. Export keys trước khi sửa
```sql
-- Nếu cần backup
sqlite3 shop.db "SELECT * FROM keys WHERE product_id=1" > keys_backup.txt
```

### 2. Bulk replace bằng SQL
```sql
-- Nếu cần thay thế nhiều keys cùng pattern
UPDATE keys 
SET key = REPLACE(key, 'OLD-PREFIX', 'NEW-PREFIX') 
WHERE product_id = 1 AND is_sold = 0;
```

### 3. Tìm keys trùng lặp
**Web Panel:**
- Chọn sản phẩm → Xem keys → Ctrl+F để search

**SQL:**
```sql
SELECT key, COUNT(*) as count 
FROM keys 
GROUP BY key 
HAVING count > 1;
```

### 4. Đổi tên key có pattern
Ví dụ: `KEY-ABC-001` → `KEY-XYZ-001`

**Web Panel:**
- Sửa từng key inline (nếu ít)

**SQL (nếu nhiều):**
```powershell
# Backup trước
copy shop.db shop.db.backup

# Mở SQL
sqlite3 shop.db

# Run query
UPDATE keys SET key = REPLACE(key, 'ABC', 'XYZ') WHERE product_id = 1;
```

---

## 🚨 Lưu Ý Quan Trọng

### ⚠️ KHÔNG thể sửa keys đã bán
- Keys `is_sold = 1` → Đã gửi cho khách
- Sửa sẽ gây confusion
- Web Panel: Keys đã bán chỉ hiển thị readonly
- Discord: Thay thế key sẽ reject nếu is_sold = 1

### ⚠️ Backup trước khi bulk edit
```powershell
copy shop.db shop.db.backup
```

### ⚠️ Double check key trước khi lưu
- Key phải đúng format
- Không có khoảng trắng thừa
- Case-sensitive (nếu key phân biệt hoa thường)

### ⚠️ Không sửa key đang trong đơn PENDING
- Nếu có đơn đang chờ thanh toán
- Key có thể đang được reserve (chưa implement lock)

---

## 🎓 Best Practices

1. ✅ **Dùng Web Panel** để sửa key → Trực quan, dễ dàng
2. ✅ **Discord commands** → Khi cần nhanh hoặc không có browser
3. ✅ **Sửa inline** → Cho sửa nhỏ (1-2 ký tự)
4. ✅ **Thay thế key** → Cho swap hoàn toàn
5. ✅ **Backup** → Trước khi sửa hàng loạt
6. ⚠️ **Không sửa keys đã bán** → Gây confusion với khách

---

## 📊 Workflow Khuyên Dùng

### Sửa 1 key nhỏ (typo)
```
Web Panel → Xem keys → ✏️ Sửa → 💾 Lưu
```

### Thay key lỗi
```
Web Panel → Thay thế Key → Nhập cũ/mới → Thay thế
```

### Audit keys
```
Web Panel → Xem keys → Review từng key → Xóa/Sửa nếu cần
```

### Mass update
```
1. Export keys: /stock hoặc Web Panel
2. Sửa trong Excel/Notepad
3. Xóa keys cũ: Tab "Quản lý & Xóa"
4. Nhập keys mới: Tab "Nhập hàng loạt"
```

---

Chúc bạn quản lý keys hiệu quả! 🚀
