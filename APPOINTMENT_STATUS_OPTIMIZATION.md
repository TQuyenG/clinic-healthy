# 🎯 Tối Ưu Trạng Thái Lịch Hẹn

## ❌ Vấn Đề Hiện Tại

### Trạng Thái Được Định Nghĩa (9 cái)
```
pending → confirmed → upcoming → waiting_pay → waiting_exam 
                      ↓
                   in_progress → completed
                      ↓           ↓
                    passed    cancelled
```

### Vấn Đề
1. **Quá nhiều trạng thái** → User bối rối
2. **Trạng thái dư thừa**:
   - `waiting_pay`: Nên dùng `payment_status` thay vì `status`
   - `waiting_exam`: Không rõ ích lợi, tương tự `confirmed`
   - `upcoming`: Chỉ là display của `confirmed` gần giờ khám
   - `passed`: Có thể dùng ngày khám + trạng thái thay vì status riêng
3. **Bệnh nhân không thấy trạng thái "Đang khám"** → Nhầm lẫn
4. **Thống kê không chính xác** → Trang bệnh nhân chỉ hiển thị 5 trạng thái

---

## ✅ Workflow Tối Ưu Được Đề Xuất

### **Chỉ 5 Trạng Thái Chính**

```
1️⃣ pending (Chờ xác nhận)
   ↓ [Admin xác nhận]
   
2️⃣ confirmed (Đã xác nhận)
   ↓ [Lễ tân check-in]
   
3️⃣ in_progress (Đang khám)
   ↓ [Bác sĩ nhập kết quả]
   
4️⃣ completed (Hoàn thành)
   └─ [Bệnh nhân xem kết quả]

❌ cancelled (Đã hủy)
```

---

## 📋 Chi Tiết Từng Trạng Thái

| Trạng Thái | Điều Kiện | Người Hành Động | Người Dùng Thấy | Hành Động Tiếp |
|-----------|----------|-----------------|-----------------|---------|
| **pending** | Vừa đặt lịch | - | ❌ Ẩn | Chờ admin xác nhận |
| **confirmed** | Admin xác nhận | Admin/Staff | ✅ "Đã xác nhận" | Chờ lễ tân check-in |
| **in_progress** | Lễ tân check-in | Lễ Tân | ✅ "Đang khám" | Bác sĩ khám bệnh |
| **completed** | Bác sĩ nhập kết quả | Bác Sĩ | ✅ "Hoàn thành" | Bệnh nhân xem kết quả |
| **cancelled** | Hủy lịch | Admin/Staff/Bệnh nhân | ✅ "Đã hủy" | - |

---

## 🔄 Xử Lý Các Trạng Thái Bị Xóa

### ❌ `waiting_pay` → Dùng `payment_status`
**Hiện tại**: Chuyển status sang `waiting_pay` khi check-in
```javascript
// ❌ CŨ
status: 'waiting_pay'
status: 'waiting_exam'

// ✅ MỚI - Dùng payment_status + status = confirmed
status: 'confirmed'
payment_status: 'unpaid'   // Người dùng thấy giá đỏ nếu chưa thanh toán
payment_status: 'paid_at_clinic' // Xác nhận thanh toán khà quầy
```

**Lợi ích**:
- User nhìn thanh toán riêng từ appointment detail
- Không lẫn với trạng thái khám bệnh
- Bác sĩ vẫn có thể bắt đầu check-in dù chưa thanh toán

---

### ❌ `waiting_exam` → Gộp vào `confirmed`
**Hiện tại**: Trạng thái trung gian giữa check-in và bác sĩ khám
```javascript
// ❌ CŨ
'confirmed' → 'waiting_exam' → 'in_progress'

// ✅ MỚI
'confirmed' → 'in_progress'
// Dùng display_queue để xác định ai sắp khám, ai đang chờ
```

**Lợi ích**:
- Giảm độ phức tạp
- Dùng `display_queue` (U1, U2, N1, N2) để quản lý hàng đợi
- Frontend dễ dàng sắp xếp: `in_progress` đứng trước, `confirmed` đứng sau

---

### ❌ `upcoming` → Tính toán động từ thời gian
**Hiện tại**: Status là `upcoming` khi gần giờ khám
```javascript
// ❌ CŨ
if (hoursRemaining < 24) status = 'upcoming'

// ✅ MỚI
// Luôn dùng confirmed, nhưng frontend tính toán để highlight
const isUpcoming = (appointmentTime - now) < 24 * 60 * 60;
// Hiển thị badge: "Sắp tới" nếu isUpcoming
```

**Lợi ích**:
- Không cần trạng thái riêng
- UI dễ highlight "Sắp tới" bằng CSS
- Giảm database churn

---

### ❌ `passed` → Dùng `appointment_date < today`
**Hiện tại**: Đánh dấu status = 'passed' khi vừa qua giờ khám
```javascript
// ❌ CŨ
if (now > appointmentTime) status = 'passed'

// ✅ MỚI
// Không cần status, tính toán từ appointment_date
const isPassed = (today > appointmentDate) && status !== 'completed' && status !== 'cancelled';
// Hiển thị: "Vắng mặt" (badge xám) nếu isPassed
```

**Lợi ích**:
- Không cần cập nhật database
- Tính toán real-time bên frontend
- Dễ phân biệt "Hoàn thành" (có kết quả) vs "Vắng mặt" (không đến)

---

## 📊 Bảng So Sánh: Cũ vs Mới

| Khía Cạnh | Hiện Tại | Tối Ưu |
|----------|---------|--------|
| **Số trạng thái** | 9 | 5 |
| **Trạng thái chính** | 9 | 5 |
| **User thấy** | 5-8 | 5 |
| **Database queries** | Cao (check `status`) | Thấp |
| **Database updates** | Thường xuyên | Ít hơn |
| **UI complexity** | Cao | Thấp |
| **Dễ hiểu** | ❌ | ✅ |

---

## 💻 Frontend: Hiển Thị Tối Ưu

### MyAppointmentsPage.js - Badge Logic
```javascript
// ✅ MỚI: Dễ hơn
const getStatusBadge = (appointment) => {
  const { status, appointment_date, appointment_start_time, payment_status } = appointment;
  const now = new Date();
  const appointmentTime = new Date(`${appointment_date}T${appointment_start_time}`);
  const isPassed = now > appointmentTime && status !== 'completed' && status !== 'cancelled';
  
  // Priority: completed > cancelled > in_progress > passed > confirmed > pending
  if (status === 'completed') return { text: 'Hoàn thành', color: 'success' };
  if (status === 'cancelled') return { text: 'Đã hủy', color: 'danger' };
  if (status === 'in_progress') return { text: '🔴 Đang khám', color: 'warning' };
  if (isPassed) return { text: 'Vắng mặt', color: 'secondary' };
  if (status === 'confirmed') {
    const hoursLeft = (appointmentTime - now) / (1000 * 60 * 60);
    if (hoursLeft < 24) return { text: '⏰ Sắp tới', color: 'info' };
    return { text: 'Đã xác nhận', color: 'primary' };
  }
  return { text: 'Chờ xác nhận', color: 'warning' };
};
```

### AppointmentManagementPage.js - Quản Lý
```javascript
// ✅ MỚI: Filter dễ hơn
const getStatusBadge = (status) => {
  // Sử dụng một map thống nhất cho cả Admin và Bệnh nhân
  const statusMap = {
    'pending': { text: 'Chờ xác nhận', color: 'warning' },
    'confirmed': { text: 'Đã xác nhận', color: 'primary' },
    'in_progress': { text: 'Đang khám', color: 'info' },
    'completed': { text: 'Hoàn thành', color: 'success' },
    'cancelled': { text: 'Đã hủy', color: 'danger' }
  };
  return statusMap[status] || { text: 'Khác', color: 'secondary' };
};
```

---

## 🚀 Lợi Ích Của Tối Ưu

### ✅ Cho User
- **Dễ hiểu**: Chỉ 5 trạng thái rõ ràng
- **Không bối rối**: Không thấy trạng thái "pending" (chỉ admin thấy)
- **Thấy được "Đang khám"**: Biết lịch mình đang được khám
- **Thấy được "Vắng mặt"**: Biết khi nào không đến

### ✅ Cho Dev
- **Code simple**: Ít case statement
- **Database gọn**: Ít update status
- **Bug ít hơn**: Ít trạng thái = ít conflict
- **Maintenance dễ**: Logic trung tâm hơn

### ✅ Cho Hệ Thống
- **Performance**: Ít query status
- **Consistency**: Một workflow clear
- **Scalability**: Dễ mở rộng sau này

---

## 📝 Hành Động Cần Làm

1. **Update Model** (server/models/Appointment.js)
   - ENUM status: Chỉ giữ 5: pending, confirmed, in_progress, completed, cancelled
   - Xóa: upcoming, waiting_pay, waiting_exam, passed

2. **Update Controller** (server/controllers/appointmentController.js)
   - Xóa logic tự động chuyển sang `waiting_pay`, `waiting_exam`, `upcoming`, `passed`
   - Bảo vệ chỉ cho phép: pending → confirmed → in_progress → completed
   - Cho phép từ bất kỳ → cancelled

3. **Update Frontend**
   - MyAppointmentsPage.js: Thêm logic tính `isPassed`, `isUpcoming` từ time
   - AppointmentManagementPage.js: Dùng STATUS_MAP constants
   - DoctorAppointmentsPage.js: Giống AppointmentManagementPage

4. **Tạo Constants** (client/src/config/appointmentStatuses.js)
   ```javascript
   export const APPOINTMENT_STATUSES = {
     PENDING: 'pending',
     CONFIRMED: 'confirmed',
     IN_PROGRESS: 'in_progress',
     COMPLETED: 'completed',
     CANCELLED: 'cancelled'
   };
   
   export const STATUS_DISPLAY = {
     'pending': { text: 'Chờ xác nhận', icon: FaHourglassHalf, color: 'warning' },
     // ...
   };
   ```

5. **Database Migration**
   - Chuyển `waiting_pay` → `confirmed`, cập nhật payment_status
   - Chuyển `waiting_exam` → `confirmed`
   - Chuyển `upcoming` → `confirmed`
   - Chuyển `passed` → `cancelled` hoặc giữ nguyên (tuỳ context)

---

## ⚠️ Cân Nhắc

- **Backward Compatibility**: Cần migration script cho dữ liệu cũ
- **Payment Workflow**: `waiting_pay` logic cần chuyển sang `payment_status` kiểm tra
- **Clinical Queue**: `upcoming` logic cần dùng `display_queue` thay vì status
- **Testing**: Cần test workflow đầy đủ: pending → confirmed → in_progress → completed

