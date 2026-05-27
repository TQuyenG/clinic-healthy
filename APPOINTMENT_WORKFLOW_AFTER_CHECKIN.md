# Quy Trình Lịch Hẹn Sau Khi Check-In

## 📋 Câu Hỏi Ban Đầu
**Sau khi checkin xong, nhận số, được gọi tên vào khám thì tình trạng "đang khám bệnh" - Bác sĩ vào trang quản lý lịch hẹn để đổi trang thái hay trang chi tiết lịch hẹn đó vậy?**

## ✅ Câu Trả Lời

### Quy Trình Hiện Tại Trong Hệ Thống

**Bác sĩ không cần vào bất kỳ trang quản lý nào để đổi trạng thái.** Bệnh nhân sẽ được check-in tại lễ tân, nhận số thứ tự, và khi gọi tên thì trạng thái sẽ tự động chuyển sang "Đang khám" bởi lễ tân. Bác sĩ sau đó chỉ cần vào trang "Nhập kết quả khám" để hoàn thành khám.

---

## 🔄 Luồng Công Việc Chi Tiết

### 1️⃣ **Lễ Tân - Check-in Bệnh Nhân** ✓
- **Người lễ tân / Bác sĩ** nhấn nút **"Check-in"** tại danh sách lịch hẹn
- **Vị trí UI**: [DoctorAppointmentsPage.js](client/src/pages/DoctorAppointmentsPage.js) - nút "Check-in" 
- **Điều kiện hiển thị**: Khi lịch hẹn có trạng thái `'confirmed'` hoặc `'upcoming'`
- **API được gọi**: 
  ```javascript
  appointmentService.checkInAppointment(selectedAppointment.id, { override_queue: true })
  ```
- **Kết quả**: 
  - Cấp số thứ tự động cho bệnh nhân (Display queue: U1, U2 hoặc N1, N2)
  - Lịch hẹn hiện tại sẽ chuyển sang trạng thái `'in_progress'` (Đang khám)
  - Bệnh nhân được cập nhật trong danh sách chờ lâm sàng

### 2️⃣ **Bác Sĩ - Khám Bệnh và Nhập Kết Quả** 
Sau khi lễ tân check-in, bác sĩ sẽ thấy lịch hẹn có trạng thái **"Đang khám" (in_progress)** và có thể:

#### **Tùy Chọn 1: Nhập Kết Quả Trực Tiếp**
- **Nút**: "Khám bệnh" (FaUserMd icon)
- **Vị trí**: Trong danh sách lịch hẹn bác sĩ sở hữu
- **Điều kiện**: Hiển thị khi trạng thái là `'confirmed'`, `'upcoming'`, hoặc `'in_progress'`
- **Điều hướng**: Tới trang `/nhap-ket-qua/{appointment.code}`
- **Tại đây bác sĩ có thể**:
  - Nhập chẩn đoán (Kết quả khám)
  - Nhập đơn thuốc
  - Đặt lịch tái khám
  - Tải lên tập tin y tế (ảnh siêu âm, kết quả xét nghiệm, v.v.)
- **Backend API**: 
  ```
  POST /api/appointments/{code}/complete
  Body: { medicalResult, prescription, nextAppointment, files }
  ```
- **Kết quả**: 
  - Trạng thái lịch hẹn chuyển sang `'completed'` (Hoàn thành)
  - Tạo bản ghi Medical Record (Hồ sơ Y tế)
  - Bệnh nhân nhận thông báo: "Lịch hẹn đã hoàn thành. Vui lòng xem kết quả khám."

#### **Tùy Chọn 2: Chỉ Định Dịch Vụ Phụ**
- **Nút**: "Chỉ định dịch vụ" (FaPlay icon)
- **Điều kiện**: Hiển thị khi trạng thái là `'confirmed'`, `'upcoming'`, hoặc `'in_progress'`
- **Tác dụng**: Bác sĩ có thể chỉ định thêm các dịch vụ phụ như:
  - Siêu âm bụng
  - Xét nghiệm máu
  - Chụp X-quang, v.v.
- **Backend API**:
  ```
  POST /api/appointments/{id}/service-indications
  Body: { indications: [{ service_name, order_sequence, dependencies }] }
  ```

---

## 📊 Bảng Tóm Tắt Trạng Thái

| Trạng Thái | Giai Đoạn | Người Phụ Trách | Hành Động |
|-----------|----------|-----------------|---------|
| `pending` | Chờ xác nhận | Admin / Staff | Xác nhận lịch |
| `confirmed` | Đã xác nhận | Lễ tân / Bác sĩ | Check-in hoặc Nhập kết quả |
| `in_progress` | Đang khám | Bác sĩ | Nhập kết quả / Chỉ định dịch vụ |
| `completed` | Hoàn thành | Bệnh nhân | Xem kết quả, Đánh giá |
| `cancelled` | Đã hủy | Admin / Staff / Bệnh nhân | - |

---

## 🎯 Các Điểm Quan Trọng

### ✅ Những Gì Đã Được Thực Hiện
1. **Check-in tự động cấp số**: Khi lễ tân/bác sĩ nhấn "Check-in", hệ thống tự động:
   - Cấp số thứ tự cho bệnh nhân
   - Chuyển trạng thái sang "Đang khám" (`in_progress`)
   - Đưa bệnh nhân lên đầu danh sách chờ lâm sàng

2. **Danh sách lâm sàng theo thứ tự**: Bác sĩ có thể xem hàng đợi khám qua API:
   ```
   GET /api/appointments/staff/clinical-queue?date=YYYY-MM-DD&doctor_id=XX
   ```
   - Bệnh nhân đang khám (`in_progress`) luôn xếp ở vị trí đầu tiên
   - Sau đó là bệnh nhân VIP (`U` prefix) rồi mới đến bệnh nhân thường (`N` prefix)

3. **Bác sĩ nhập kết quả trực tiếp**: Bác sĩ không cần vào trang quản lý để đổi trạng thái, chỉ cần:
   - Nhấn nút "Khám bệnh" 
   - Điều hướng tới `/nhap-ket-qua/{appointment.code}`
   - Nhập thông tin khám và hoàn thành

### ⚠️ Cần Kiểm Tra / Cải Thiện (Tuỳ Nhu Cầu)

1. **Hiện tại Check-in chỉ có trong `DoctorAppointmentsPage.js`**: 
   - Đây là trang của **Bác sĩ xem lịch hẹn của mình**
   - Nếu muốn **Lễ Tân (Staff) cũng Check-in được**, cần tạo một trang riêng cho Staff lâm sàng hoặc thêm quyền cho Staff trong trang này

2. **Nên thêm trang "Hàng Đợi Lâm Sàng"** để:
   - Hiển thị danh sách bệnh nhân chờ khám theo thứ tự ưu tiên
   - Khi bác sĩ gọi bệnh nhân tiếp theo, tự động chuyển sang "Đang khám"
   - Gợi ý bác sĩ bệnh nhân tiếp theo nên khám

3. **Mobile App cho Lễ Tân**: Cân nhắc cải thiện UX để:
   - Lễ Tân dễ tìm nút "Check-in" 
   - Cấp số xuất hiện rõ ràng trên màn hình
   - Có âm thanh thông báo khi cấp số mới

---

## 💾 File Liên Quan

### Frontend
- **[DoctorAppointmentsPage.js](client/src/pages/DoctorAppointmentsPage.js)** - Danh sách lịch hẹn bác sĩ, nút Check-in
- **[AppointmentDetailPage.js](client/src/pages/AppointmentDetailPage.js)** - Chi tiết lịch hẹn
- **[appointmentService.js](client/src/services/appointmentService.js)** - API client

### Backend  
- **[appointmentController.js](server/controllers/appointmentController.js)** - Xử lý check-in, hoàn thành lịch hẹn
  - `checkIn()` - Check-in tại quầy, cấp số
  - `completeAppointment()` - Hoàn thành lịch hẹn (nhập kết quả khám)
  - `getDoctorAppointments()` - Lấy danh sách lịch hẹn bác sĩ
  - `getClinicalQueue()` - Lấy hàng đợi lâm sàng theo thứ tự ưu tiên

- **[Appointment.js](server/models/Appointment.js)** - Model lịch hẹn, các trạng thái: `pending`, `confirmed`, `in_progress`, `completed`

---

## 📝 Kết Luận

**Câu trả lời ngắn gọn**: 
- ✅ Bác sĩ **KHÔNG cần** vào trang **Quản lý Lịch Hẹn** để đổi trạng thái
- ✅ Lễ tân **Check-in** → Trạng thái tự động chuyển sang **"Đang Khám"**
- ✅ Bác sĩ **Nhấn "Khám bệnh"** → Điều hướng tới trang **Nhập Kết Quả**
- ✅ Nhập xong → Lịch hẹn chuyển sang **"Hoàn Thành"**

**Quy trình hoàn toàn tự động và không cần can thiệp bằng cách thay đổi trạng thái thủ công.**