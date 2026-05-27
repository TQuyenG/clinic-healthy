/**
 * DANH SÁCH MODULES VÀ PERMISSIONS CHI TIẾT
 * ========================================
 * 
 * 24 Modules với tổng cộng 136+ permissions chi tiết
 * Mỗi permission có: key (code), label (UI), description
 * 
 * HOW TO USE:
 * - Admin phân quyền cho Staff qua PermissionsTab (UI mới)
 * - Permissions được lưu trong Staff.permissions (JSON)
 * - Sidebar chỉ render menu nếu user có permission đó
 * - UI chỉ render button/action nếu user có permission
 */

// MODULES DANH SÁCH (22 module)
// ================================

1. 🕐 work_shift - Lịch làm việc
   - view_personal: Xem lịch làm việc cá nhân
   - view_doctors: Xem lịch làm việc của bác sĩ
   - register_shift: Đăng ký ca làm
   - register_leave: Đăng ký nghỉ phép
   - register_overtime: Đăng ký tăng ca
   - approve_shift: Phê duyệt ca làm (Manager)
   - approve_leave: Phê duyệt nghỉ phép (Manager)
   - approve_overtime: Phê duyệt tăng ca (Manager)
   - manage_schedule: Quản lý lịch khác (Manager)
   
2. 📋 appointments - Lịch hẹn & Tiếp đón
   - view: Xem danh sách lịch hẹn
   - create: Tạo mới
   - edit: Sửa
   - cancel: Hủy lịch
   - reject: Từ chối
   - approve: Xác nhận
   - verify_payment: Xác nhận thanh toán (Staff)
   - check_in: Check-in
   - update_status: Cập nhật trạng thái
   - resend_code: Gửi lại mã
   - view_reviews: Xem đánh giá
   - assign_doctor: Phân công bác sĩ (Manager)
   
3. 👨‍⚕️ doctors - Quản lý bác sĩ
   - view: Xem danh sách
   - edit: Sửa (Manager)
   - manage_schedule: Quản lý lịch (Manager)
   - assign: Phân công (Manager)
   
4. 🏥 patients - Quản lý bệnh nhân
   - view: Xem
   - edit: Sửa
   - delete: Xóa (Manager)
   
5. 📊 medical_records - Hồ sơ bệnh án
   - view: Xem hồ sơ
   - create: Tạo mới
   - edit: Sửa nội dung
   - edit_vitals: Sửa chỉ số sinh tồn
   - delete: Xóa (Manager)
   
6. 📰 articles - Bài viết
   - view: Xem danh sách
   - create: Tạo mới
   - edit: Sửa
   - duplicate: Sao chép
   - delete: Xóa (Manager)
   - publish: Xuất bản (Manager)
   - approve: Phê duyệt (Manager)
   - reject: Từ chối (Manager)
   - hide: Ẩn (Manager)
   - restore: Khôi phục (Manager)
   
7. 💊 medicines - Thông tin thuốc
   - view: Xem danh sách
   - create: Tạo mới (Manager)
   - edit: Sửa (Manager)
   - delete: Xóa (Manager)
   - propose_update: Đề xuất cập nhật
   
8. 🏪 pharmacy - Kho thuốc
   - view: Xem tồn kho
   - import: Nhập kho
   - export_retail: Bán lẻ
   - export_prescription: Bán theo đơn
   - view_batches: Xem lô thuốc
   - view_transactions: Xem lịch sử giao dịch
   - manage_suppliers: Quản lý nhà cung cấp (Manager)
   - view_alerts: Xem cảnh báo tồn kho
   - adjust_stock: Điều chỉnh tồn kho (Manager)

9. 🏥 diseases - Thông tin bệnh lý
   - view: Xem danh sách
   - create: Tạo mới (Manager)
   - edit: Sửa (Manager)
   - delete: Xóa (Manager)
   - propose_update: Đề xuất cập nhật
   
10. 💬 consultations - Tư vấn trực tuyến
   - view: Xem danh sách
   - create: Tạo mới
   - edit: Sửa
   - approve: Xác nhận (Manager/Doctor)
   - reject: Từ chối (Manager/Doctor)
   - close: Đóng phiên (Doctor)
   
10. 💰 consultation_pricing - Gói dịch vụ tư vấn
    - view: Xem danh sách
    - create: Tạo gói (Manager)
    - edit: Sửa (Manager)
    - delete: Xóa (Manager)
    - set_price: Đặt giá (Manager)
    - hide: Ẩn gói (Manager)
    
11. ⚡ consultation_realtime - Tư vấn realtime
    - monitor: Giám sát
    - resolve_errors: Xử lý lỗi (Manager)
    
12. 📹 video_call - Video call tư vấn
    - monitor: Giám sát
    - resolve_errors: Xử lý lỗi (Manager)
    
13. 💬 forum - Diễn đàn & Q&A
    - view_topics: Xem chuyên mục
    - create_topic: Tạo chuyên mục (Manager)
    - edit_topic: Sửa chuyên mục (Manager)
    - delete_topic: Xóa chuyên mục (Manager)
    - hide_topic: Ẩn chuyên mục (Manager)
    - approve_question: Phê duyệt câu hỏi (Manager)
    - delete_question: Xóa câu hỏi (Manager)
    - hide_question: Ẩn câu hỏi (Manager)
    - moderate: Kiểm duyệt (Manager)
    
14. 👥 community - Nhóm cộng đồng
    - view: Xem danh sách
    - create: Tạo nhóm (Manager)
    - edit: Sửa (Manager)
    - manage_members: Quản lý thành viên (Manager)
    - moderate_posts: Kiểm duyệt bài viết (Manager)
    
15. 💳 payments - Quản lý thanh toán
    - view: Xem danh sách
    - pos: Quầy Tiếp Đón (POS) (Staff)
    - verify: Xác nhận
    - approve: Phê duyệt (Manager)
    - refund: Hoàn tiền (Manager)
    - export: Xuất báo cáo (Manager)
    
16. 🔄 refund_requests - Danh sách hoàn tiền
    - view: Xem danh sách
    - approve: Phê duyệt (Manager)
    - reject: Từ chối (Manager)
    
17. 📈 statistics - Thống kê & Báo cáo
    - view: Xem báo cáo
    - revenue: Thống kê doanh thu (Manager)
    - export: Xuất dữ liệu (Manager)
    
18. 🏥 services - Dịch vụ y tế
    - view: Xem danh sách
    - create: Tạo mới (Manager)
    - edit: Sửa (Manager)
    - delete: Xóa (Manager)
    - set_price: Đặt giá (Manager)
    
19. 📂 service_categories - Danh mục dịch vụ
    - view: Xem danh sách
    - create: Tạo mới (Manager)
    - edit: Sửa (Manager)
    - delete: Xóa (Manager)
    
20. 🎉 events_vouchers - Sự kiện & Khuyến mãi
    - view_events: Xem sự kiện
    - create_event: Tạo sự kiện (Manager)
    - edit_event: Sửa sự kiện (Manager)
    - delete_event: Xóa sự kiện (Manager)
    - view_vouchers: Xem voucher
    - create_voucher: Tạo voucher (Manager)
    - edit_voucher: Sửa voucher (Manager)
    - delete_voucher: Xóa voucher (Manager)
    - create_game: Tạo vòng quay (Manager)
    - config_rewards: Cấu hình phần thưởng (Manager)
    
21. 📧 contact - Quản lý liên hệ
    - view: Xem tin nhắn
    - reply: Trả lời
    - mark_read: Đánh dấu đã đọc
    - delete: Xóa (Manager)
    
22. ⚙️ system_settings - Cấu hình hệ thống
    - view: Xem cấu hình
    - view_audit_logs: Xem audit logs
    - edit_home: Sửa trang chủ (Manager)
    - edit_about: Sửa About (Manager)
    - edit_facilities: Sửa cơ sở vật chất (Manager)
    - edit_equipment: Sửa trang bị (Manager)
    - edit_contact: Sửa thông tin liên hệ (Manager)
    - edit_privacy: Sửa Privacy Policy (Manager)
    - edit_terms: Sửa Terms & Conditions (Manager)
    - edit_email: Cấu hình Email (Manager)
    - edit_payment: Cấu hình Thanh toán (Manager)
    
23. 👔 staff_management - Quản lý nhân viên
    - view: Xem danh sách
    - create: Tạo nhân viên (Manager)
    - edit: Sửa thông tin (Manager)
    - delete: Xóa (Manager)
    - assign_department: Phân phòng ban (Manager)
    - assign_permissions: Phân quyền (Manager)
    - view_history: Xem lịch sử (Manager)


🔐 LOGIC PHÂN QUYỀN
==================

1. ADMIN:
   - Toàn quyền (permissions = 'admin')
   - Không thể bị phân quyền được

2. MANAGER (Trưởng phòng ban):
   - Có access các modules theo phòng ban của họ
   - Có quyền Manager (approve, delete, etc.)
   - Có thể phân quyền cho Staff dưới cấp
   - Chỉ phân quyền được module thuộc phòng ban họ

3. STAFF (Nhân viên thường):
   - Chỉ có access modules cấp "Staff"
   - Không có quyền Manager
   - Phân quyền được theo department template

4. INTEGRATIONS:
   - Sidebar chỉ hiển thị MENU nếu canAccessModule() = true
   - UI chỉ hiển thị BUTTON nếu hasPermission() = true
   - AuditLog tự động ghi "permission_change" khi admin cập nhật


📝 KIỀM TRA AUDIT LOG
====================

API: GET /api/permissions/audit-logs

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "action_type": "permission_change",
      "target_type": "staff",
      "target_id": 5,
      "target_name": "Nguyễn Văn A",
      "details": {
        "old_permissions": {...},
        "new_permissions": {...},
        "changed_at": "2024-05-02T10:30:00Z"
      },
      "created_at": "2024-05-02T10:30:00Z"
    }
  ]
}


🧪 TESTING HƯỚNG DẪN
===================

1. Test phân quyền TẠOSANG:
   - Admin: Vào trang Quản lý nhân viên
   - Chọn 1 Staff
   - Tab "Phân quyền"
   - Tick "Xem danh sách bài viết"
   - Untick "Tạo mới"
   - Lưu → Audit log tạo record

2. Test Sidebar cập nhật:
   - Staff login
   - Sidebar hiển thị menu "Bài viết" với "Xem" + "Sửa"
   - Admin tắt quyền "Xem"
   - Staff refresh page → Menu "Bài viết" biến mất
   - Staff call refreshPermissions() → Menu biến mất tức thì

3. Test permission check tại action:
   - Staff chỉ có "Xem"
   - Truy cập /quan-ly-bai-viet → Hiển thị danh sách
   - Nút "Thêm bài viết" ẩn (vì không có quyền "create")
   - Nút "Sửa" ẩn (vì không có quyền "edit")

4. Test backward compat:
   - Admin vẫn toàn quyền
   - Doctor access appointment, medical_records
   - Sidebar logic hoạt động như cũ với new permissions format


📊 PERFORMANCE & BEST PRACTICES
===============================

1. Permissions cache:
   - Lưu trong localStorage → tránh call API mỗi lần render
   - refreshPermissions() mỗi 30s hoặc khi cần
   - Dispatch event khi update để components listen

2. Permission checking:
   - Dùng useMemo để cache hasPermission()
   - Check permissions ở component level, không ở backend
   - Backend vẫn verify permissions trước execute

3. UI UX:
   - Ẩn button thay vì disable (không gây confuse)
   - Tooltip khi hover: "Bạn không có quyền hành động này"
   - Audit log để admin track thay đổi
   - Confirmation dialog trước save permission change

*/
