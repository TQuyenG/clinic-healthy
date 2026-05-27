# Department Role Split Guide

Mục tiêu của tài liệu này là chia nhỏ vai trò theo **bộ phận công việc** bên trong từng phòng ban hiện có, không tạo thêm phòng ban mới.

## Nguyên tắc

- Giữ nguyên các phòng ban gốc: `support`, `finance`, `content`, `clinical`, `system`.
- Mỗi phòng ban có thể có nhiều vai trò con, dùng để gán quyền chi tiết hơn.
- Vai trò con chỉ là template quyền và mô tả công việc, không phải một phòng ban mới.
- Quyền thật vẫn phải chạy qua `permissionModules.js` và kiểm tra ở backend.

## Danh sách vai trò con hiện có

Chỉ còn vai trò con cho nhân viên cấp staff. Vai trò manager không còn là role profile riêng nữa.

### Support

- `receptionist_frontdesk`: Lễ tân quầy, check-in, cấp số, đặt lịch.
- `customer_care`: CSKH (gộp cả tổng đài), xử lý phản hồi, tin nhắn, báo cáo.

### Finance

- `cashier`: Thu ngân, xác nhận thanh toán tại quầy.
- `accountant_debt`: Kế toán công nợ, theo dõi khoản phải thu/phải trả.
- `accountant_reconciliation`: Kế toán đối soát, hoàn tiền, xuất báo cáo.

### Content

- `writer`: Biên tập viên, viết và chỉnh sửa nội dung.

### Clinical

- `clinical_staff`: Nhân viên lâm sàng, hỗ trợ hồ sơ và điều phối khám.

### System

- `it_support`: IT hỗ trợ, xem log, giám sát hệ thống.

## Vai trò seed hiện tại theo phòng ban

### Support

1. `receptionist_frontdesk` - Lễ tân quầy
2. `customer_care` - Chăm sóc khách hàng (bao gồm tổng đài)

### Finance

1. `cashier` - Thu ngân
2. `accountant_debt` - Kế toán công nợ
3. `accountant_reconciliation` - Kế toán đối soát

### Content

1. `writer` - Biên tập viên

### Clinical

1. `clinical_staff` - Nhân viên lâm sàng

### System

1. `it_support` - IT hỗ trợ

## Ghi chú về seed

- Seed sẽ ưu tiên `role_profile` cho các bản ghi rank `staff`.
- Bản ghi rank `manager` không dùng role profile con nữa.
- Nếu bạn muốn bỏ vai trò nào khỏi hệ thống, chỉ cần nói rõ mã vai trò hoặc tên hiển thị.

## File đã chuẩn bị

- [server/config/departmentPermissions.js](server/config/departmentPermissions.js)
- [server/config/departmentRoleProfiles.js](server/config/departmentRoleProfiles.js)

## Cách dùng

1. Chọn phòng ban.
2. Chọn vai trò con phù hợp.
3. Gán permissions template theo vai trò con.
4. Backend vẫn kiểm tra permission khi gọi API.

## Gợi ý thực tế cho hệ thống của bạn

- Lễ tân tổng đài đã gộp vào `customer_care`.
- Kế toán nên tách thành `cashier`, `debt`, `reconciliation`.
- Nội dung hiện chỉ giữ `writer` cho staff.
- Clinical có 1 role profile cố định `clinical_staff`.
- System chỉ giữ `it_support` cho staff.