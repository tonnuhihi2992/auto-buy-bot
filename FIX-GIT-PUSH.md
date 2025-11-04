# 🔧 FIX LỖI GIT PUSH

## Lỗi: Authentication failed

### Giải pháp: Dùng Personal Access Token (PAT)

#### Bước 1: Tạo Personal Access Token trên GitHub
1. Vào https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. Cấu hình:
   - Note: `Auto Buy Bot Deploy`
   - Expiration: `90 days` (hoặc No expiration)
   - Scopes: Check **repo** (full control of private repositories)
4. Click **Generate token**
5. **COPY TOKEN** (chỉ hiện 1 lần): `ghp_xxxxxxxxxxxxxxxxxxxx`

#### Bước 2: Update Git Remote URL
```powershell
# Xóa remote cũ
git remote remove origin

# Thêm remote mới với token (thay YOUR_TOKEN và YOUR_USERNAME)
git remote add origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/auto-buy-bot.git

# VD:
# git remote add origin https://ghp_abc123xyz@github.com/tonnuhihi2992/auto-buy-bot.git
```

#### Bước 3: Push lại
```powershell
git push -u origin main --force
```

---

## Hoặc: Dùng GitHub Desktop (Dễ hơn)

### Cách 1: GitHub Desktop App
1. Tải GitHub Desktop: https://desktop.github.com/
2. Mở app → Sign in with GitHub
3. **File** → **Add Local Repository**
4. Chọn folder: `C:\Users\Yidoan\Desktop\AUTO BUYY DISCORD\auto-buy-bot`
5. Click **Publish repository**
6. Chọn **Private**
7. Click **Publish**

**XONG!** Code đã lên GitHub.

---

## Hoặc: Dùng VS Code Git

1. Mở VS Code trong folder bot
2. Click icon **Source Control** (bên trái)
3. Click **Publish to GitHub**
4. Chọn **Private**
5. Xong!

---

## Sau khi push thành công:

### 1. Verify code đã lên GitHub
Vào https://github.com/tonnuhihi2992/auto-buy-bot

### 2. Deploy lên Render.com
Làm theo file `DEPLOY-NHANH.md` từ Bước 2

---

## Troubleshooting

### Token không work?
- Check xem đã copy đúng token chưa
- Check scope có check "repo" không
- Token có expired không

### Vẫn không được?
Dùng **GitHub Desktop** - dễ nhất, không cần token!

---

## Commands tóm tắt:

```powershell
# Cấu hình Git
git config --global user.email "tonnuhihi2992@gmail.com"
git config --global user.name "tonnuhihi2992"

# Tạo token trên GitHub, rồi:
git remote remove origin
git remote add origin https://YOUR_TOKEN@github.com/tonnuhihi2992/auto-buy-bot.git
git push -u origin main --force
```

**Hoặc dùng GitHub Desktop - Khuyên dùng!** ⭐
