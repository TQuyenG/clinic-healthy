# 🔄 GIAI ĐOẠN 1: TỐI ƯU HÓA STATUS (9→5)

## 📊 THAY ĐỔI CHỦ YẾU

### Status Cũ (9 status)
```
pending → confirmed → upcoming → waiting_pay → waiting_exam 
→ in_progress → completed → passed → cancelled
```

### Status Mới (5 status)
```
pending → confirmed → in_progress → completed → cancelled
```

---

## 📝 MAPPING CÁC STATUS CŨ

| Status Cũ | Xử Lý Mới | Lý Do |
|-----------|-----------|-------|
| **pending** | pending (giữ) | Lịch vừa mới đặt |
| **confirmed** | confirmed (giữ) | Đã thanh toán hoặc staff xác nhận |
| **upcoming** | ❌ Xóa | Tính động: `appointment_date < now + 24h && status === 'confirmed'` |
| **waiting_pay** | ❌ Xóa | Dùng `payment_status === 'unpaid'` thay thế |
| **waiting_exam** | ❌ Xóa | Rename thành **in_progress** (sau check-in) |
| **in_progress** | in_progress (giữ) | Đang khám (sau check-in) |
| **completed** | completed (giữ) | Hoàn thành khám |
| **passed** | ❌ Xóa | Tính động: `appointment_date < today && status === 'completed'` |
| **cancelled** | cancelled (giữ) | Đã hủy |

---

## 🔧 CHI TIẾT THAY ĐỔI

### 1️⃣ BACKEND: `server/models/Appointment.js`

**Dòng 33-36:** Status enum
```javascript
// CŨ:
status: { 
  type: DataTypes.ENUM('pending', 'confirmed', 'upcoming','waiting_pay','waiting_exam', 'in_progress', 'completed', 'passed', 'cancelled'), 
  defaultValue: 'pending'
}

// MỚI:
status: { 
  type: DataTypes.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'), 
  defaultValue: 'pending',
  comment: 'OPTIMIZED: 5 status workflow (v1.1.0)\n- pending: Just booked\n- confirmed: Paid or staff-confirmed\n- in_progress: After check-in\n- completed: Exam done\n- cancelled: Cancelled'
}
```

---

### 2️⃣ BACKEND: `server/controllers/appointmentController.js`

**Thay đổi các hàm xử lý status:**

| Hàm | Thay Đổi |
|-----|----------|
| `checkInAppointment()` | Line ~120: `status: 'waiting_exam'` → `status: 'in_progress'` |
| `completePayment()` | Line ~576: Giữ nguyên (đã auto-confirm) |
| `updatePaymentInfo()` | Line ~2087: Giữ nguyên (đã auto-confirm) |
| `cancelAppointment()` | Xóa kiểm tra `!['completed', 'cancelled']` - thêm `pending, confirmed, in_progress` |
| Health check endpoints | Tính `isUpcoming` = `appointment_date < now+24h && status === 'confirmed'` |
| | Tính `isPassed` = `appointment_date < today && status === 'completed'` |

---

### 3️⃣ FRONTEND: `client/src/pages/MyAppointmentsPage.js`

**Cập nhật logic xử lý statuses:**
```javascript
// CŨ: Chỉ handle 5 statuses
// MỚI: Handle 5 statuses + 2 tính toán động

const getStatusBadgeClass = (appointment) => {
  const { status, appointment_date } = appointment;
  const today = new Date().toDateString();
  
  // Tính toán động: upcoming, passed
  const isUpcoming = status === 'confirmed' && new Date(appointment_date) < new Date(Date.now() + 24*60*60*1000);
  const isPassed = status === 'completed' && new Date(appointment_date) < new Date(today);
  
  if (isUpcoming) return 'badge-warning'; // Sắp tới
  if (isPassed) return 'badge-secondary'; // Đã qua
  // ... còn lại
}
```

---

### 4️⃣ FRONTEND: `client/src/pages/AppointmentManagementPage.js`

**Cập nhật filter dropdown:**
- Xóa: upcoming, waiting_pay, waiting_exam, passed
- Thêm: "Dynamic filters" (upcoming auto-calc, passed auto-calc)
- Filter logic chuyển từ status enum → compose filters

---

## 🐛 LOGGING & DEBUG

### Backend Log Format:
```javascript
// Standard format trong tất cả hàm thay đổi status
console.log(`[OPTIMIZATION_V1.1] [${appointmentCode}] Status change: ${oldStatus} → ${newStatus}`);
console.log(`[OPTIMIZATION_V1.1] [${appointmentCode}] Reason: ${changeReason} | User: ${userId} | Role: ${userRole}`);
console.error(`[ERROR][OPTIMIZATION_V1.1] [${appointmentCode}] Status: ${newStatus} failed - ${error.message}`);
```

### Frontend Log Format:
```javascript
// Standard format
console.log(`[OPTIMIZATION_V1.1] Rendering appointment ${code} with status ${status}`);
console.warn(`[OPTIMIZATION_V1.1] Unexpected status ${status} - fallback to default`);
```

---

## ✅ TEST CHECKLIST

- [ ] Appointment create: `status = 'pending'`
- [ ] Payment complete: `status = 'confirmed'` (auto)
- [ ] Check-in: `status = 'in_progress'` (not `waiting_exam`)
- [ ] Complete: `status = 'completed'`
- [ ] Cancel: `status = 'cancelled'` (any state except completed)
- [ ] Frontend: Upcoming appointments show correctly (< 24h)
- [ ] Frontend: Passed appointments show correctly (date passed)
- [ ] DB Migration: Old statuses migrated or dropped gracefully
- [ ] API: No errors on old clients sending old statuses

---

## 📅 MIGRATION STRATEGY

**If existing data has old statuses:**
```sql
-- Migration SQL (nếu cần)
UPDATE appointments 
SET status = 'confirmed' 
WHERE status IN ('upcoming', 'waiting_pay', 'waiting_exam', 'passed');

UPDATE appointments 
SET status = 'cancelled' 
WHERE status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
```

**Sequelize Migration:**
- Create new migration file: `YYYYMMDD-optimize-appointment-status.js`
- Drop old enum values
- Keep data by converting old → new mapping

---

## 🔎 ROLLBACK PLAN

Nếu gặp lỗi nghiêm trọng:
```bash
git revert <commit-hash>
# Restart server
npm start
```

Old status values in DB sẽ vẫn tồn tại nhưng Sequelize sẽ reject. Cần manual insert mapping hoặc data fix.

---

## 📌 NEXT STEPS

1. ✅ Update Appointment.js model (enum)
2. ✅ Update appointmentController.js (status logic)
3. ✅ Update AppointmentManagementPage.js (frontend)
4. ✅ Update MyAppointmentsPage.js (frontend)
5. ⏳ Create DB migration (if running on production)
6. ⏳ Test all flows end-to-end
7. ⏳ Commit với message: "OPTIMIZATION_V1.1: Reduce appointment statuses 9→5"

