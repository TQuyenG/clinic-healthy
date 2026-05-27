# Hướng dẫn Triển khai: Quyền Chỉnh sửa & Ẩn/Hiện Bài Viết

## Tóm tắt Thay đổi

Cập nhật quyền truy cập bài viết để:
- ✅ Tác giả **không thể chỉnh sửa** khi bài viết đã gửi phê duyệt (pending/pending_medical)
- ✅ **Admin & Trưởng phòng Nội dung** có thể ẩn/hiện bài viết với lý do
- ✅ **Tác giả** nhìn thấy lý do ẩn bài và cảnh báo không thể chỉnh sửa khi pending
- ✅ Lưu lịch sử mọi hành động (ẩn/hiện) trong ArticleReviewHistory

---

## Chi tiết Thay đổi

### 1. Backend

#### `server/models/Article.js`
- **Thêm trường**: `hidden_reason` (TEXT) — lưu lý do tại sao bài bị ẩn

#### `server/controllers/articleController.js`
- **updateArticle()**:
  - Kiểm tra: Nếu tác giả (non-admin) cố chỉnh sửa bài ở trạng thái `pending` hoặc `pending_medical` → **403 Forbidden**
  - Lưu lịch sử thay đổi status vào ArticleReviewHistory

- **hideArticle()**:
  - Cấp quyền: `admin` HOẶC `isContentManager` (staff với department='content' && rank='manager')
  - Yêu cầu: `reason` bắt buộc (nhập trong modal form)
  - Cập nhật: `article.status = 'hidden'` và `article.hidden_reason = reason`
  - Gửi thông báo tới tác giả với nội dung lý do

- **unhideArticle()**:
  - Cấp quyền: `admin` HOẶC `isContentManager`
  - Cập nhật: `article.status = 'approved'` và `article.hidden_reason = null`
  - Lưu lịch sử 'unhide' action

#### `server/middleware/roleMiddleware.js`
- Helper function `isContentManager(user)` — kiểm tra người dùng có quyền quản lý nội dung

---

### 2. Database Migration

#### `server/migrations/20260511000000-add-hidden-reason-to-articles.js`
- Cả up và down migration để thêm/xóa cột `hidden_reason`
- Chạy: `npx sequelize-cli db:migrate`

---

### 3. Frontend

#### `client/src/pages/ArticleReviewPage.js`
- **Thêm cảnh báo** khi tác giả xem bài ở trạng thái `pending/pending_medical`:
  - Hiển thị: "Bạn không thể chỉnh sửa bài viết khi đang được phê duyệt"
  - Style: Nền xanh nhạt, biểu tượng Lock

- **Thêm thông báo lý do ẩn**:
  - Nếu bài ở trạng thái `hidden` ĐỘC LẬP user là tác giả → hiện hộp thông báo
  - Hiển thị: `article.hidden_reason` + gợi ý "Bạn có thể chỉnh sửa và gửi lại"
  - Style: Nền vàng nhạt, biểu tượng ExclamationTriangle

- **Nút Ẩn/Hiện**:
  - Hiển thị cho: `admin` HOẶC (`staff` với `department='content' && rank='manager'`) HOẶC `hasPermission('articles', 'hide')`
  - Khi nhấn → Mở modal popup yêu cầu nhập lý do (popup form, không dùng alert)

#### `client/src/pages/ArticleManagementPage.js`
- **canShowButton() logic**:
  - Edit button: Ẩn nếu tác giả và bài ở trạng thái `pending/pending_medical`
  - Hide button: Hiển thị cho admin HOẶC trưởng phòng nội dung
  
- **Modal form**: Khi tác giả xem bài `hidden` trong danh sách → hiện cảnh báo lý do ẩn

---

## Hướng dẫn Triển khai

### Bước 1: Cập nhật Database
```bash
cd server
npx sequelize-cli db:migrate
```

### Bước 2: Restart Backend & Frontend
```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd client
npm start
```

### Bước 3: Test Flow

**Test 1: Tác giả không thể chỉnh sửa khi pending**
1. Staff/Doctor tạo bài viết
2. Staff/Doctor submit phê duyệt → status = `pending`
3. Cố click nút "Chỉnh sửa" → Button **bị ẩn** hoặc call API trả về 403
4. Hiển thị cảnh báo: "Bạn không thể chỉnh sửa khi đang phê duyệt"

**Test 2: Admin ẩn bài với lý do**
1. Admin vào trang phê duyệt bài nào đó (status = `approved`)
2. Click nút "Ẩn bài viết này"
3. Mở modal yêu cầu nhập lý do (popup form)
4. Nhập lý do (VD: "Vi phạm chính sách")
5. Nhấn "Thực thi" → Gửi API `POST /api/articles/:id/hide` với `{reason: "..."}`
6. Bài chuyển status → `hidden`, `hidden_reason` được lưu
7. **Tác giả nhận thông báo** với nội dung lý do

**Test 3: Tác giả xem lý do ẩn**
1. Tác giả vào trang phê duyệt bài bị ẩn
2. Trang hiển thị hộp vàng: "Lý do bài bị ẩn: [reason]"
3. Gợi ý: "Bạn có thể chỉnh sửa bài viết và gửi lại để phê duyệt"

**Test 4: Admin hiện bài lại**
1. Admin vào bài `hidden`, click "Hiện lại bài viết"
2. Modal yêu cầu ghi chú lý do hiện lại
3. Nhấn "Thực thi" → Bài chuyển status → `approved`, `hidden_reason` = NULL
4. Tác giả nhận thông báo: "Admin đã hiện lại bài viết"

**Test 5: Tác giả chỉnh sửa & gửi lại**
1. Sau khi admin hiện bài → tác giả vậtnút "Chỉnh sửa" (giờ bài ở `approved`)
2. Tác giả sửa content, nhấn "Gửi phê duyệt"
3. Popup xác nhận: "Sửa sẽ yêu cầu duyệt lại"
4. Xác nhận → Bài chuyển status → `pending`, tạo entry `resubmit` trong ArticleReviewHistory

---

## Responsive Design

### UI Elements
- ✅ Tất cả icon dùng `react-icons/fa` → tự động responsive
- ✅ Popup/modal dùng CSS Flexbox → áp dụng trên mọi kích thước màn hình
- ✅ **Không tô màu border** — dùng `border-left` accent color thay vì `border` toàn phần
- ✅ Font size tự điều chỉnh trên tablet/mobile:
  - Header: `18px` → `16px` (mobile)
  - Body text: `14px` → `12px` (mobile)

### Kiểm tra Responsive
```
- Desktop (1920px): Hiển thị đầy đủ
- Tablet (768px): Sidebar dựng hàng, 2 cột → 1 cột
- Mobile (375px): Single column, modal fullscreen
```

---

## Lịch sử ArticleReviewHistory

Các action được lưu:
- `submit` — Tác giả gửi phê duyệt lần đầu
- `resubmit` — Tác giả gửi lại sau khi chỉnh sửa
- `approve` — Admin/Manager phê duyệt
- `reject` — Admin/Manager từ chối (lưu `reason`)
- `hide` — Admin/Manager ẩn bài (lưu `reason`)
- `unhide` — Admin/Manager hiện lại bài
- `request_edit` — Yêu cầu chỉnh sửa bài đã duyệt
- `request_rewrite` — Yêu cầu viết lại bài (lưu `reason`)

---

## Các File Đã Sửa

| File | Thay đổi |
|------|---------|
| `server/models/Article.js` | Thêm `hidden_reason` field |
| `server/controllers/articleController.js` | Cập nhật `updateArticle()`, `hideArticle()`, `unhideArticle()` |
| `server/middleware/roleMiddleware.js` | Thêm helper `isContentManager()` |
| `server/migrations/20260511000000-add-hidden-reason-to-articles.js` | **Tạo mới** migration |
| `client/src/pages/ArticleReviewPage.js` | Thêm cảnh báo + hiển thị hidden_reason |
| `client/src/pages/ArticleManagementPage.js` | Cập nhật `canShowButton()` logic |

---

## Troubleshooting

**Problem**: Nút Chỉnh sửa vẫn hiển thị khi bài pending
- **Solution**: Kiểm tra `canShowButton()` logic và status trong db — có thể status không sync từ backend

**Problem**: Lý do ẩn không hiển thị cho tác giả
- **Solution**: Kiểm tra:
  1. `article.hidden_reason` có dữ liệu không?
  2. `user?.id === article.author_id` có match không?
  3. Status có phải `hidden` không?

**Problem**: PopupModal form ẩn/hiện không hiển thị
- **Solution**: Kiểm tra cấp quyền — đảm bảo user có permission hoặc là admin

---

## Ghi chú Bảo trì

- Nếu thêm role mới → cập nhật `isContentManager()` helper
- Nếu thêm permission module → cập nhật `hasPermission()` check
- Lưu ý: `hidden_reason` tối đa ~500 ký tự (database TEXT type)
