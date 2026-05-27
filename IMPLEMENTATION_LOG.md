# 📋 IMPLEMENTATION LOG - Consultation Realtime & Appointment Rating Sync
**Ngày bắt đầu:** 2024-05-09  
**Mục tiêu:** Đồng bộ hóa chức năng rating/feedback giữa tư vấn online và khám tại viện

---

## 📌 BƯỚC 1: XÓA TAB HOÀN TIỀN KHỎI TRANG REALTIME ✅

**Trạng thái:** ✅ COMPLETED

**File thay đổi:**
- `client/src/pages/ConsultationRealtimeManagementPage.js`

**Chi tiết thay đổi:**

1. **Xóa button tab Hoàn tiền** (dòng ~261-268)
   ```jsx
   ❌ Xóa:
   {isAdmin && (
     <button className={`crm-tab ${activeTab === 'refunds' ? 'active' : ''}`}>
       <FaDollarSign /> Hoàn tiền
     </button>
   )}
   ```
   - **Lý do:** Tab hoàn tiền liên quan Tài chính, không phải realtime monitoring
   - **Chuyển sang:** Financial Management Page (chưa implement)
   - **Chú thích:** Ghi comment `❌ BƯỚC 1 (2024-05-09)` trong code

2. **Xóa render content Refund** (dòng ~327-329)
   ```jsx
   ❌ Xóa:
   {activeTab === 'refunds' && (
     <RefundManagement />
   )}
   ```

3. **Xóa imports không dùng**
   - ❌ Xóa: `FaDollarSign` từ react-icons
   - ❌ Xóa: `import { RefundManagement }` từ components

**Access Control (AC) thay đổi:**
- Trước: `isAdmin` có thể thấy tab hoàn tiền
- Sau: Tab hoàn tiền bị xóa hẳn, cần qua trang khác

**Lưu ý debug:**
- Nếu quên xóa import RefundManagement → lỗi `Component not found`
- Nếu quên xóa FaDollarSign → lỗi `icon not used`

---

## 📌 BƯỚC 2: IMPLEMENT APPOINTMENT RATING (Database & Backend)

**Trạng thái:** ⏳ PENDING

**Công việc:**

### 2.1 Database Migration
**File:** `server/migrations/[timestamp]-add-rating-to-appointments.js` (NEW)

```javascript
// Migration UP: Thêm rating + feedback columns
ALTER TABLE appointments ADD COLUMN (
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  reviewed_at DATETIME,
  feedback_status ENUM('pending', 'approved', 'hidden') DEFAULT 'pending',
  admin_note TEXT,
  reviewer_id INT REFERENCES users(id) ON DELETE SET NULL
);

// Migration DOWN: Xóa columns
ALTER TABLE appointments DROP COLUMN rating, review, reviewed_at, feedback_status, admin_note, reviewer_id;
```

**AC:** 
- Chỉ bệnh nhân (`patient_id` = user id) mới được ghi rating
- Admin/Staff có quyền duyệt/ẩn feedback

### 2.2 Model Update
**File:** `server/models/Appointment.js`

```javascript
// THÊM các fields này:
rating: {
  type: DataTypes.INTEGER,
  allowNull: true,
  validate: { min: 1, max: 5 },
  comment: 'Rating 1-5 sao từ bệnh nhân sau khám xong'
},
review: {
  type: DataTypes.TEXT,
  allowNull: true,
  comment: 'Nội dung review từ bệnh nhân'
},
reviewed_at: {
  type: DataTypes.DATE,
  allowNull: true,
  comment: 'Thời điểm bệnh nhân gửi rating'
},
feedback_status: {
  type: DataTypes.ENUM('pending', 'approved', 'hidden'),
  defaultValue: 'pending',
  comment: 'Trạng thái duyệt của admin (pending=chưa review, approved=public, hidden=ẩn)'
},
admin_note: {
  type: DataTypes.TEXT,
  allowNull: true,
  comment: 'Ghi chú của admin khi duyệt/từ chối review'
},
reviewer_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: 'users', key: 'id' },
  comment: 'Admin/Staff reviewer_id khi duyệt'
}
```

### 2.3 Backend Routes
**File:** `server/routes/appointmentRoutes.js` (ADD)

```javascript
// 1. Patient rating appointment
router.put(
  '/:id/rate',
  authMiddleware,
  authorize('patient'),
  appointmentController.rateAppointment
);

// 2. Admin view all appointment feedbacks + approve/hide
router.get(
  '/admin/feedbacks',
  authMiddleware,
  authorize('admin', 'staff'),
  appointmentAdminController.getAllAppointmentFeedbacks
);

// 3. Admin approve/hide single feedback
router.put(
  '/admin/feedbacks/:id/toggle-status',
  authMiddleware,
  authorize('admin', 'staff'),
  appointmentAdminController.toggleFeedbackStatus
);
```

### 2.4 Backend Controllers
**Create file:** `server/controllers/appointmentAdminController.js` (NEW)

**Hàm 1: `rateAppointment(req, res)`**
```
【Request】
- Method: PUT
- Route: /api/appointments/:id/rate
- Auth: Patient only
- Body: { rating (1-5), review (string) }

【Logic】
1. Kiểm tra appointment có tồn tại + patient_id = user.id
2. Kiểm tra appointment.status === 'completed'
3. Kiểm tra appointment chưa được rate (rating IS NULL)
4. Validate rating: 1-5
5. Save: appointment.rating = rating, appointment.review = review, appointment.reviewed_at = NOW()
6. Set: feedback_status = 'pending' (chờ admin duyệt)

【AC】
- Chỉ patient của appointment đó mới rating được
- Không được rating lại (reviewed_at IS NOT NULL → error)

【Response】
{ success: true, message: 'Đánh giá thành công, chờ admin duyệt' }

【Error cases】
- 400: Appointment chưa hoàn thành
- 403: Không phải patient của appointment
- 409: Appointment đã được rating
```

**Hàm 2: `getAllAppointmentFeedbacks(req, res)`**
```
【Request】
- Method: GET
- Route: /api/appointments/admin/feedbacks
- Auth: Admin/Staff
- Query: { doctor_id?, rating?, status?, page, limit }

【Logic】
1. Query Appointment WHERE rating IS NOT NULL
2. Filter theo: doctor_id, rating, feedback_status
3. Include: patient (full_name, avatar_url), doctor (full_name, specialty)
4. Order by: reviewed_at DESC
5. Paginate: page, limit

【AC】
- Admin: thấy tất cả
- Staff: thấy appointment của bác sĩ mình quản lý

【Response】
{
  success: true,
  data: {
    feedbacks: [...],
    pagination: { total, page, limit, totalPages }
  }
}
```

**Hàm 3: `toggleFeedbackStatus(req, res)`**
```
【Request】
- Method: PUT
- Route: /api/appointments/admin/feedbacks/:id/toggle-status
- Auth: Admin/Staff
- Body: { status ('approved'|'hidden'), admin_note? }

【Logic】
1. Kiểm tra appointment tồn tại + có rating
2. Validate status ∈ ['approved', 'hidden']
3. Update: feedback_status = status, admin_note = admin_note?, reviewer_id = req.user.id
4. Log action for audit

【AC】
- Chỉ admin/staff với permission 'appointment_feedback:manage'

【Response】
{ success: true, message: 'Cập nhật trạng thái thành công' }
```

---

## 📌 BƯỚC 3: IMPLEMENT APPOINTMENT RATING (Frontend)

**Trạng thái:** ⏳ PENDING

**Công việc:**

### 3.1 Create Rating Modal Component
**File:** `client/src/components/appointment/AppointmentRatingModal.js` (NEW)

```jsx
【Props】
- isOpen: boolean
- appointment: object (id, doctor_id, status)
- onClose: () => void
- onSubmit: (rating, review) => void

【Features】
- Star rating (1-5 interactive)
- Review textarea (250 chars max)
- Submit + Cancel buttons
- Loading state during submission

【AC】
- Chỉ hiển thị khi appointment.status === 'completed'
- Patient only
- Không submit được nếu rating không chọn
```

### 3.2 Update Appointment Detail Page
**File:** `client/src/pages/AppointmentDetailPage.js`

```jsx
// Thêm state + effect
const [showRatingModal, setShowRatingModal] = useState(false);

// Trigger modal khi user xem appointment completed
useEffect(() => {
  if (appointment?.status === 'completed' && !appointment?.rating) {
    setShowRatingModal(true);
  }
}, [appointment]);

// Render modal + button
<AppointmentRatingModal
  isOpen={showRatingModal}
  appointment={appointment}
  onClose={() => setShowRatingModal(false)}
  onSubmit={handleSubmitRating}
/>

// Handler
const handleSubmitRating = async (rating, review) => {
  try {
    await appointmentService.rateAppointment(id, { rating, review });
    // Reload appointment
    await fetchAppointmentDetail();
    // Show success toast
  } catch (error) {
    // Show error toast
  }
};
```

### 3.3 Update Appointment List Page
**File:** `client/src/pages/AppointmentHistoryPage.js`

```jsx
// Show "⭐ Chưa đánh giá" badge cho completed appointments chưa rating
// Click → open rating modal
{appointment.status === 'completed' && !appointment.rating && (
  <button onClick={() => setRatingModal(true)}>
    ⭐ Đánh giá ngay
  </button>
)}
```

### 3.4 Admin Feedback Management Component
**File:** `client/src/components/appointment/AppointmentFeedbackManagement.js` (NEW)

```jsx
【Features】
- List all appointment feedbacks (rating + review)
- Filter: doctor, rating, status
- Star display + review preview
- Toggle status button: Approve ✅ / Hide 🚫
- Admin note field

【AC】
- Admin/Staff only
- Staff chỉ thấy feedback bác sĩ mình quản lý
```

---

## 📌 BƯỚC 4: TẠO DOCTOR REVIEWS PAGE CÔNG KHAI

**Trạng thái:** ⏳ PENDING

**Công việc:**

### 4.1 Create Doctor Detail + Reviews Page
**File:** `client/src/pages/DoctorDetailWithReviewsPage.js` (NEW)

```jsx
【Route】
GET /doctors/:id/reviews OR /doctors/:id (combine)

【Features】
- Doctor profile info
- Aggregate rating từ 2 bảng:
  * Consultation feedbacks (approved)
  * Appointment feedbacks (approved)
- Total reviews count
- Review list + pagination
- Filter: rating, type (consultation|appointment)
- Sort: newest, highest rating

【Data】
const reviews = [
  ...consultationReviews.filter(r => r.feedback_status === 'approved'),
  ...appointmentReviews.filter(r => r.feedback_status === 'approved')
].sort((a,b) => b.reviewed_at - a.reviewed_at);

const avgRating = (
  reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
).toFixed(1);

【AC】
- Public (bệnh nhân khác có thể xem)
- Chỉ hiển thị feedback status = 'approved'
```

### 4.2 Integrate vào Doctor Search/List
**File:** `client/src/components/DoctorCard.js` (UPDATE)

```jsx
// Thêm:
- Link to reviews page
- Show avg rating badge
- Show review count badge

<div className="doctor-card">
  <img src={doctor.avatar_url} />
  <h3>{doctor.full_name}</h3>
  <p>⭐ {doctor.avgRating} ({doctor.reviewCount} reviews)</p>
  <Link to={`/doctors/${doctor.id}/reviews`}>Xem đánh giá</Link>
</div>
```

---

## 📌 BƯỚC 5: UPDATE THỐNG KÊ (COMBINE 2 BẢNG)

**Trạng thái:** ⏳ PENDING

**Công việc:**

### 5.1 Backend Statistics Routes
**File:** `server/routes/statisticRoutes.js` (UPDATE) / `server/routes/consultationRoutes.js` (ADD)

```javascript
// New unified statistics endpoint
router.get(
  '/unified/doctor-stats/:doctor_id',
  appointmentStatisticController.getDoctorUnifiedStats
);
```

### 5.2 Backend Controller
**File:** `server/controllers/appointmentStatisticController.js` (NEW)

**Hàm: `getDoctorUnifiedStats(req, res)`**
```
【Logic】
1. Lấy stats từ Consultation:
   - totalConsultations
   - avgRatingConsultation
   - totalReviewsConsultation
   
2. Lấy stats từ Appointment:
   - totalAppointments
   - avgRatingAppointment
   - totalReviewsAppointment
   
3. Combine:
   - totalServices = totalConsultations + totalAppointments
   - totalReviews = totalReviewsConsultation + totalReviewsAppointment
   - avgRatingOverall = (
       totalReviewsConsultation * avgRatingConsultation +
       totalReviewsAppointment * avgRatingAppointment
     ) / totalReviews
   
4. Return: Consolidated stats object

【Response】
{
  doctor_id, 
  doctor_name,
  total_services: 50,
  total_consultations: 30,
  total_appointments: 20,
  total_reviews: 25,
  avg_rating_overall: 4.6,
  avg_rating_consultation: 4.7,
  avg_rating_appointment: 4.5,
  review_breakdown: {
    5_star: 15,
    4_star: 7,
    3_star: 2,
    2_star: 1,
    1_star: 0
  }
}
```

### 5.3 Frontend Dashboard Update
**File:** `client/src/pages/AdminDashboard.js` (UPDATE)

```jsx
// Add tab/section: Unified Doctor Statistics
// Show: total services, avg rating, review count từ cả 2 bảng
// Chart: rating distribution từ combined data
```

---

## 🔄 FLOW DIAGRAM - RATING SUBMISSION

```
PATIENT FLOW:
┌─ Appointment Completed ──→ Auto-show modal
├─ Patient submit rating ──→ PUT /api/appointments/:id/rate
├─ Store: appointment.rating + appointment.reviewed_at
├─ Set: feedback_status = 'pending'
└─ Show: "Cảm ơn đánh giá! Chờ admin phê duyệt"

ADMIN FLOW:
┌─ GET /api/appointments/admin/feedbacks (list all pending)
├─ Review + comment
├─ PUT /api/appointments/admin/feedbacks/:id/toggle-status
│  └─ Set: feedback_status = 'approved' OR 'hidden'
└─ Published/Hidden on public page

PUBLIC FLOW:
┌─ Patient xem /doctors/:id/reviews
├─ Query: Consultation + Appointment
├─ Filter: feedback_status = 'approved' ONLY
└─ Show: Combined reviews + avg rating
```

---

## 📝 SUMMARY TABLE

| Thành phần | Trước | Sau | Chi tiết |
|-----------|:---:|:---:|----------|
| Refund tab | ✅ | ❌ | Di chuyển sang Financial |
| Appointment rating | ❌ | ✅ | Implement 2-way |
| Doctor reviews page | ❌ | ✅ | Public page |
| Unified stats | ❌ | ✅ | Combine 2 bảng |

---

## 🔍 DEBUG CHECKLIST

**Bước 1:**
- [ ] No import error (RefundManagement, FaDollarSign)
- [ ] Tab hoàn tiền không hiển thị
- [ ] Console không có warning

**Bước 2:**
- [ ] Migration chạy OK
- [ ] Model update không error
- [ ] Routes register đúng

**Bước 3:**
- [ ] Rating modal hiển thị sau completed
- [ ] Rating submit gọi API đúng
- [ ] Admin feedback list load được

**Bước 4:**
- [ ] Doctor reviews page load
- [ ] Combine ratings từ 2 bảng
- [ ] Filter approved feedback

**Bước 5:**
- [ ] Unified stats endpoint work
- [ ] Avg rating tính đúng
- [ ] Dashboard display metrics
