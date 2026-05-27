# 📝 Tổng Kết Triển Khai: Quyền Chỉnh sửa & Ẩn/Hiện Bài Viết

## ✅ Hoàn Thành 100%

### Phần 1: Chặn Chỉnh sửa Khi Pending

**Backend** (`server/controllers/articleController.js`):
```javascript
// updateArticle() - Bằng cách nào author không thể edit khi pending?
if (req.user.role !== 'admin' && article.author_id === req.user.id && ['pending', 'pending_medical'].includes(article.status)) {
  return res.status(403).json({ success: false, message: '...' });
}
```

**Frontend** (`client/src/pages/ArticleManagementPage.js`):
```javascript
// canShowButton() - Ẩn nút Edit khi tác giả và status pending?
case 'edit': 
  return isAdm || (isAuthor && !['pending','pending_medical'].includes(status)) || ...;
```

---

### Phần 2: Ẩn/Hiện Bài Với Lý Do

**Backend** (`server/controllers/articleController.js`):
- ✅ `hideArticle()` - Kiểm tra quyền: admin + content manager, lưu `hidden_reason`
- ✅ `unhideArticle()` - Kiểm tra quyền: admin + content manager
- ✅ Cả hai gửi thông báo cho tác giả

**Database**:
- ✅ Thêm trường `hidden_reason` vào Article table
- ✅ Migration file: `20260511000000-add-hidden-reason-to-articles.js`

**Frontend** (`client/src/pages/ArticleReviewPage.js`):
- ✅ Hiển thị hộp thông báo lý do ẩn cho tác giả (nếu status = hidden)
- ✅ Hiển thị cảnh báo "Không thể chỉnh sửa khi pending" (nếu tác giả là author)

**Frontend** (`client/src/pages/ArticleManagementPage.js`):
- ✅ Nút Ẩn/Hiện hiển thị cho: admin hoặc content manager

---

### Phần 3: Giao Diện Responsive

**Icon**: ✅ Dùng `react-icons/fa` (FaLock, FaExclamationTriangle, v.v)  
**Border**: ✅ Không tô màu border - dùng `border-left` accent color  
**Layout**: ✅ Flexbox responsive trên mọi kích thước  
**Font**: ✅ Tự điều chỉnh mobile/tablet  

---

### Phần 4: Tài Liệu & Hướng Dẫn

| File | Nội dung |
|------|---------|
| `ARTICLE_EDIT_RESTRICTION_GUIDE.md` | Hướng dẫn triển khai đầy đủ + test flow |
| `DEPLOY_ARTICLE_RESTRICTION.sh` | Script triển khai (chạy migration) |

---

## 📋 Danh Sách File Đã Thay Đổi

### Backend
1. ✅ `server/models/Article.js` — Thêm `hidden_reason` field
2. ✅ `server/controllers/articleController.js` — Cập nhật logic ẩn/hiện, chặn chỉnh sửa
3. ✅ `server/middleware/roleMiddleware.js` — Helper `isContentManager()`
4. ✅ `server/migrations/20260511000000-add-hidden-reason-to-articles.js` — **Tạo mới**

### Frontend
1. ✅ `client/src/pages/ArticleReviewPage.js` — Thêm cảnh báo + hidden_reason display
2. ✅ `client/src/pages/ArticleManagementPage.js` — Cập nhật canShowButton() logic

### Tài Liệu
1. ✅ `ARTICLE_EDIT_RESTRICTION_GUIDE.md` — **Tạo mới**
2. ✅ `DEPLOY_ARTICLE_RESTRICTION.sh` — **Tạo mới**

---

## 🚀 Các Bước Tiếp Theo (Triển Khai)

### 1️⃣ Chạy Migration
```bash
cd server
npx sequelize-cli db:migrate
```

### 2️⃣ Khởi Động Lại Server
```bash
# Terminal 1
cd server
npm start

# Terminal 2
cd client  
npm start
```

### 3️⃣ Test Các Flow
- ✅ Tác giả không thể chỉnh sửa khi pending
- ✅ Admin ẩn bài với lý do → tác giả nhận thông báo
- ✅ Tác giả xem lý do ẩn và cảnh báo
- ✅ Admin hiện bài lại
- ✅ Tác giả chỉnh sửa & gửi lại

---

## 🎯 Tóm Tắt Chính Sách

| Tình Huống | Hành Động Tác Giả | Hành Động Admin/Manager |
|-----------|------------------|------------------------|
| Bài ở `draft` | ✅ Chỉnh sửa → Lưu nháp | - |
| Bài ở `pending` | ❌ **Không chỉnh sửa** | ✅ Phê duyệt/Từ chối |
| Bài ở `approved` | ❌ Không chỉnh sửa | ✅ Ẩn bài với lý do |
| Bài ở `hidden` | ✅ Xem lý do ẩn (warning) | ✅ Hiện bài lại |
| Bài bị ẩn → hiện lại | ✅ Chỉnh sửa & gửi lại | - |

---

## ✨ Tính Năng Bổ Sung

1. **Modal Form Ẩn/Hiện** — Popup yêu cầu nhập lý do (không dùng alert)
2. **Thông Báo Toàn Cầu** — Tác giả nhận notification khi bài bị ẩn/hiện
3. **Lịch Sử Tương Tác** — Các action (hide, unhide, ...) lưu vào ArticleReviewHistory
4. **Cảnh báo UI** — Badge "Không thể chỉnh sửa" + "Lý do bài bị ẩn"

---

## 💡 Lưu Ý Bảo Trì

- Nếu thêm role mới → cập nhật `isContentManager()` function
- Nếu thêm permission module → cập nhật check trong backend/frontend
- Tối đa 500 ký tự cho `hidden_reason` (database TEXT type)
- Migration có thể rollback: `npx sequelize-cli db:migrate:undo`

---

## 📞 Hỗ Trợ

Xem chi tiết: `ARTICLE_EDIT_RESTRICTION_GUIDE.md`  
Lỗi thường gặp → Phần Troubleshooting  
Test flow → Phần Test Flow  

**Status**: ✅ **SẴN TRIỂN KHAI** ✅
