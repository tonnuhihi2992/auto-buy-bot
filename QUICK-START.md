# 🚀 HƯỚNG DẪN NHANH: Nhập Key & Sản Phẩm

## ✨ 3 Cách nhập key/sản phẩm (từ dễ → khó)

---

## 🥇 CÁCH 1: WEB ADMIN PANEL (Dễ NHẤT - KHUYÊN DÙNG)

### Bước 1: Mở Web Panel
```powershell
# Đảm bảo bot đang chạy
npm start

# Mở trình duyệt:
http://localhost:3000/admin
```

### Bước 2: Thêm Danh Mục
1. Click tab **"Danh mục"**
2. Nhập tên (VD: "Cheats", "Premium Accounts")
3. Check ✅ "Kích hoạt ngay"
4. Click **"Tạo danh mục"**
5. ✅ Ghi nhớ ID danh mục được tạo

### Bước 3: Thêm Sản Phẩm
1. Click tab **"Sản phẩm"**
2. Nhập:
   - Tên: "Valorant Cheat 1 tháng"
   - Giá: 70000
   - Danh mục: Chọn từ dropdown
3. Check ✅ "Kích hoạt ngay"
4. Click **"Tạo sản phẩm"**
5. ✅ Ghi nhớ ID sản phẩm

### Bước 4A: Nhập Keys (Copy-Paste)
1. Click tab **"Nhập Keys"**
2. Chọn sản phẩm từ dropdown
3. Paste nhiều key (mỗi dòng 1 key):
   ```
   KEY-XXXX-XXXX-XXXX-0001
   KEY-XXXX-XXXX-XXXX-0002
   KEY-XXXX-XXXX-XXXX-0003
   ```
4. Click **"Nhập keys"**
5. ✅ Done!

### Bước 4B: Nhập Keys (Upload File)
1. Tạo file `keys.txt` trên Desktop:
   ```
   KEY-XXXX-XXXX-XXXX-0001
   KEY-XXXX-XXXX-XXXX-0002
   KEY-XXXX-XXXX-XXXX-0003
   KEY-XXXX-XXXX-XXXX-0004
   ...
   ```
2. Click tab **"Nhập hàng loạt"**
3. Chọn sản phẩm từ dropdown
4. Kéo thả hoặc click để chọn file `keys.txt`
5. Click **"Upload Keys"**
6. ✅ Done!

**Ưu điểm:**
- ✅ Giao diện đẹp, trực quan
- ✅ Copy-paste nhiều key không giới hạn
- ✅ Upload file hàng trăm key cùng lúc
- ✅ Xem thống kê real-time
- ✅ Không lo giới hạn ký tự Discord

---

## 🥈 CÁCH 2: DISCORD MODAL (Dễ, trong Discord)

### Bước 1: Thêm Danh Mục
1. Trong Discord, gõ: `/admin_add_category`
2. Modal popup → Nhập:
   - Tên danh mục: "Cheats"
   - Kích hoạt: "yes"
3. Submit → ✅ Nhận ID danh mục

### Bước 2: Thêm Sản Phẩm
1. Gõ: `/admin_add_product`
2. Modal popup → Nhập:
   - Tên: "Valorant Cheat 1 tháng"
   - Giá: 70000
   - ID danh mục: 1 (hoặc để trống)
   - Kích hoạt: "yes"
3. Submit → ✅ Nhận ID sản phẩm

### Bước 3: Nhập Keys
1. Gõ: `/admin_load_keys`
2. Modal popup → Nhập:
   - ID sản phẩm: 1
   - Danh sách keys: (paste nhiều dòng)
     ```
     KEY-XXXX-XXXX-XXXX-0001
     KEY-XXXX-XXXX-XXXX-0002
     KEY-XXXX-XXXX-XXXX-0003
     ```
3. Submit → ✅ Done!

**Ưu điểm:**
- ✅ Không cần mở trình duyệt
- ✅ Làm trực tiếp trong Discord
- ✅ Modal hỗ trợ nhiều dòng (multiline)

**Hạn chế:**
- ⚠️ Giới hạn ~2000 ký tự/modal (khoảng 50-100 keys)
- ⚠️ Không upload file được

---

## 🥉 CÁCH 3: SLASH COMMANDS CŨ (Khó, không khuyên dùng)

### Thêm Danh Mục
```
/admin_add_category name:"Cheats" active:True
```

### Thêm Sản Phẩm
```
/admin_add_product name:"Valorant Cheat" price:70000 active:True category_id:1
```

### Nhập Keys
```
/admin_load_keys product_id:1 keys_text:"KEY-XXX\nKEY-YYY\nKEY-ZZZ"
```

**Hạn chế:**
- ❌ Giới hạn 1024 ký tự/option
- ❌ Không thân thiện với nhiều key
- ❌ Phải escape newline (\n)

---

## 🎯 So Sánh Nhanh

| Tính năng | Web Panel | Discord Modal | Slash Command |
|-----------|-----------|---------------|---------------|
| Dễ sử dụng | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Số lượng key | ♾️ Không giới hạn | ~100 keys | ~30 keys |
| Upload file | ✅ Có | ❌ Không | ❌ Không |
| Giao diện | 🎨 Đẹp | 📱 OK | 💬 Text |
| Thống kê | ✅ Real-time | ❌ Không | ❌ Không |

---

## 💡 Tips & Tricks

### Chuẩn bị file keys hàng loạt
```powershell
# Tạo file với 100 keys mẫu
1..100 | ForEach-Object { "KEY-XXXX-XXXX-XXXX-$('{0:D4}' -f $_)" } > keys.txt
```

### Check tồn kho
```
/stock
→ Xem keys còn lại của từng sản phẩm
```

### Xem trong Web Panel
```
http://localhost:3000/admin
→ Dashboard hiển thị:
  - Tổng sản phẩm
  - Tổng keys
  - Keys còn lại
```

### Backup database
```powershell
copy shop.db shop.db.backup
```

---

## 🚨 Lưu Ý Quan Trọng

1. **Admin Commands** chỉ cho user có `ADMIN_USER_ID` trong `.env`
2. **Keys không trùng**: Mỗi key chỉ nên nhập 1 lần
3. **Product ID**: Phải tồn tại trước khi nhập key
4. **Format keys**: Mỗi dòng 1 key, không có ký tự thừa

---

## ❓ Troubleshooting

### "❌ Chỉ admin mới dùng được lệnh này"
→ Kiểm tra `ADMIN_USER_ID` trong `.env` có đúng Discord User ID của bạn không

### Web panel không mở được
→ Đảm bảo bot đang chạy (`npm start`) và truy cập `http://localhost:3000/admin`

### Modal không hiện
→ Chạy `npm run register` để đăng ký commands mới

### Keys bị duplicate
→ Kiểm tra database: 
```sql
SELECT key, COUNT(*) FROM keys GROUP BY key HAVING COUNT(*) > 1;
```

---

## 🎉 Workflow Khuyên Dùng

1. **Mở Web Panel**: `http://localhost:3000/admin`
2. **Tạo danh mục** (nếu chưa có)
3. **Tạo sản phẩm** với giá
4. **Nhập keys**:
   - Ít key (< 50): Copy-paste trực tiếp
   - Nhiều key (> 50): Upload file .txt
5. **Verify**: Tab thống kê để check số lượng
6. **Test**: Dùng `/buy` trong Discord để thử mua

---

Chúc bạn quản lý shop hiệu quả! 🚀
