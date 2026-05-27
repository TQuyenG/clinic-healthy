#!/bin/bash
# Script triển khai: Chỉnh sửa & Ẩn/Hiện bài viết

echo "================================================"
echo "🚀 Triển khai: Quyền Chỉnh sửa & Ẩn/Hiện Bài Viết"
echo "================================================"

# Bước 1: Kiểm tra migration file
echo ""
echo "📋 Bước 1: Kiểm tra migration file..."
if [ -f "server/migrations/20260511000000-add-hidden-reason-to-articles.js" ]; then
    echo "✅ Migration file tồn tại"
else
    echo "❌ Migration file không found - kiểm tra lại đường dẫn"
    exit 1
fi

# Bước 2: Chạy migration
echo ""
echo "📦 Bước 2: Chạy migration để thêm cột hidden_reason..."
cd server
npx sequelize-cli db:migrate --name 20260511000000-add-hidden-reason-to-articles

if [ $? -eq 0 ]; then
    echo "✅ Migration hoàn tất thành công"
else
    echo "❌ Migration thất bại - kiểm tra database connection"
    exit 1
fi

cd ..

# Bước 3: Restart backend
echo ""
echo "🔄 Bước 3: Restart backend server..."
echo "💡 Chạy lệnh sau trong terminal riêng:"
echo ""
echo "   cd server"
echo "   npm start"
echo ""

# Bước 4: Thông tin test
echo "🧪 Bước 4: Test Flow"
echo ""
echo "=== Test 1: Tác giả không thể chỉnh sửa khi pending ==="
echo "1. Staff/Doctor tạo bài → gửi phê duyệt (pending)"
echo "2. Kiểm tra: Nút 'Chỉnh sửa' bị ẩn?"
echo "3. Cố call API edit → Kiểm tra response 403?"
echo ""

echo "=== Test 2: Admin ẩn bài với lý do ==="
echo "1. Admin vào trang phê duyệt bài (approved)"
echo "2. Click 'Ẩn bài viết'"
echo "3. Nhập lý do: 'Vi phạm chính sách'"
echo "4. Kiểm tra: status = 'hidden', hidden_reason được lưu?"
echo "5. Tác giả nhận thông báo?"
echo ""

echo "=== Test 3: Tác giả xem lý do ẩn ==="
echo "1. Tác giả vào bài bị ẩn"
echo "2. Kiểm tra: Hiển thị hộp vàng với lý do ẩn?"
echo ""

echo "=== Test 4: Admin hiện bài ==="
echo "1. Admin vào bài hidden"
echo "2. Click 'Hiện lại bài viết'"
echo "3. Nhập lý do: 'Đã sửa - cho phép hiện'"
echo "4. Kiểm tra: status = 'approved', hidden_reason = NULL?"
echo ""

echo "================================================"
echo "✅ Triển khai hoàn tất!"
echo "================================================"
