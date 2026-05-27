# 📋 Workflow Lịch Hẹn - 5 Trạng Thái & Phối Hợp Các Role

## 🎯 Tổng Quan Workflow

```
Bệnh nhân đặt lịch
      ↓
 PENDING (Chờ xác nhận)
   ├─ Admin xác nhận
   └─ Admin từ chối / hủy
      ↓
 CONFIRMED (Đã xác nhận)
   ├─ Bệnh nhân thanh toán
   ├─ Bệnh nhân đổi/hủy lịch
   └─ Lễ tân check-in
      ↓
 IN_PROGRESS (Đang khám)
   ├─ Bác sĩ kiểm tra, chỉ định
   └─ Bác sĩ nhập kết quả
      ↓
 COMPLETED (Hoàn thành)
   └─ Bệnh nhân xem kết quả, đánh giá
      
CANCELLED (Đã hủy) - Có thể từ bất kỳ trạng thái nào
```

---

## 📊 Chi Tiết Từng Bước

### **BƯỚC 1️⃣: BỆNH NHÂN ĐẶT LỊCH**

| Thông Tin | Chi Tiết |
|----------|---------|
| **Người thực hiện** | Bệnh nhân (hoặc Lễ tân đặt hộ) |
| **Nơi thực hiện** | Web/App - Trang "Đặt Lịch Hẹn" |
| **Trạng thái sau** | `PENDING` |
| **Dữ liệu cần** | Chọn: Dịch vụ, Bác sĩ, Ngày giờ, Loại hẹn (online/offline) |
| **Điều kiện** | Chỉ được đặt cho các khung giờ còn trống |
| **Kết quả** | - Lịch được tạo với trạng thái `pending`<br>- Sinh mã lịch (VD: AP-202605-001)<br>- Email/SMS xác nhận được gửi cho bệnh nhân<br>- Admin nhận thông báo cần xác nhận |

#### API: `POST /api/appointments`
```javascript
Body: {
  service_id: 123,
  doctor_id: 456,
  appointment_date: "2026-05-10",
  appointment_start_time: "09:00:00",
  appointment_type: "offline",
  reason: "Khám tổng quát",
  payment_method: "cash" | "vnpay" | "momo"
}

Response: {
  id: 789,
  code: "AP-202605-001",
  status: "pending",
  payment_status: "unpaid"
}
```

---

### **BƯỚC 2️⃣: ADMIN XÁC NHẬN LỊCH** ✅

| Thông Tin | Chi Tiết |
|----------|---------|
| **Người thực hiện** | Admin / Staff (Quản lý lịch) |
| **Nơi thực hiện** | Web - Trang "Quản Lý Lịch Hẹn" |
| **Trạng thái hiện** | `PENDING` |
| **Trạng thái sau** | `CONFIRMED` |
| **Thời hạn** | Càng sớm càng tốt (chỉ nên để pending < 1 giờ) |
| **Hành động Admin** | 1. Kiểm tra thông tin lịch hẹn<br>2. Kiểm tra bác sĩ có sẵn không<br>3. Nhấn nút "Xác nhận"<br>4. (Tuỳ chọn) Ghi chú thêm |
| **Điều kiện từ chối** | - Bác sĩ không có lịch làm việc<br>- Khung giờ đã full<br>- Dịch vụ không hoạt động |
| **Kết quả nếu xác nhận** | - Lịch chuyển sang `CONFIRMED`<br>- Bệnh nhân nhận email/SMS: "Lịch xác nhận"<br>- Bác sĩ nhận thông báo<br>- Lịch xuất hiện trong hàng chờ |
| **Kết quả nếu từ chối** | - Lịch chuyển sang `CANCELLED`<br>- Bệnh nhân nhận thông báo hủy<br>- Hoàn tiền (nếu đã thanh toán) |

#### API: `PUT /api/appointments/{code}/confirm`
```javascript
Body: {
  doctor_id: 456 // Optional: đổi bác sĩ nếu cần
}

Response: {
  status: "confirmed",
  message: "Xác nhận lịch hẹn thành công"
}
```

---

### **BƯỚC 3️⃣: BỆNH NHÂN THANH TOÁN** (Tuỳ Chọn)

| Thông Tin | Chi Tiết |
|----------|---------|
| **Người thực hiện** | Bệnh nhân (hoặc Lễ tân thu tiền) |
| **Nơi thực hiện** | Web/App - Trang "Chi Tiết Lịch Hẹn" |
| **Trạng thái** | Vẫn `CONFIRMED` (không đổi) |
| **Phương thức thanh toán** | 1. Tiền mặt tại quầy<br>2. Chuyển khoản<br>3. VNPay<br>4. MoMo |
| **Điều kiện** | - Lịch phải là `CONFIRMED`<br>- Còn 30 phút trước lịch khám (cho online payment) |
| **Kết quả** | - `payment_status`: `unpaid` → `paid_online` hoặc `paid_at_clinic`<br>- Email/SMS: "Thanh toán thành công"<br>- Bệnh nhân thấy hóa đơn<br>- Thu ngân/VNPay cập nhật thanh toán |

#### Các API:
```javascript
// 1. Thanh toán Online (VNPay/MoMo)
GET /api/payments/create-payment
Query: { appointment_code: "AP-202605-001", method: "vnpay" }

// 2. Thanh toán Tại Quầy
PUT /api/appointments/{code}/payment
Body: { payment_status: "paid_at_clinic", amount: 500000 }

// 3. Hoàn tiền (nếu hủy)
POST /api/payments/refund
Body: { appointment_id: 789, reason: "..." }
```

---

### **BƯỚC 4️⃣: LỄ TÂN CHECK-IN BỆNH NHÂN** ✅

| Thông Tin | Chi Tiết |
|----------|---------|
| **Người thực hiện** | Lễ Tân / Staff |
| **Nơi thực hiện** | Quầy lễ tân - Trang "Quản Lý Lịch Hẹn" hoặc "Hàng Đợi Lâm Sàng" |
| **Trạng thái hiện** | `CONFIRMED` |
| **Trạng thái sau** | `IN_PROGRESS` |
| **Quy trình** | 1. Bệnh nhân đến quầy<br>2. Lễ tân kiểm tra thông tin<br>3. Nhấn nút "Check-in"<br>4. Hệ thống cấp số thứ tự |
| **Cấp số thứ tự** | - **U1, U2, U3...** = VIP / Ưu tiên<br>- **N1, N2, N3...** = Thường<br>- Ưu tiên những người thanh toán, đặt trước |
| **Thông báo** | - Bếp nhân thấy số lịch trên màn hình<br>- Bệnh nhân nghe tiếng gọi<br>- Lịch chuyển sang `IN_PROGRESS` trong hệ thống |
| **Điều kiện đặc biệt** | - Cho phép check-in sớm/muộn (trong 1-2 giờ)<br>- Nếu muộn quá, xem như "Vắng mặt" |
| **Kết quả** | - Lịch: `IN_PROGRESS`<br>- `display_queue`: "U1" hoặc "N1"<br>- Bác sĩ thấy hàng chờ mới |

#### API: `PUT /api/appointments/{id}/check-in`
```javascript
Body: {
  is_late: false,
  override_queue: false // true = ưu tiên
}

Response: {
  status: "in_progress",
  display_queue: "U1",
  queue_position: 1,
  message: "Cấp số thứ tự U1"
}
```

---

### **BƯỚC 5️⃣: BÁC SĨ KHÁM & CHỈ ĐỊNH** 🩺

| Thông Tin | Chi Tiết |
|----------|---------|
| **Người thực hiện** | Bác Sĩ |
| **Nơi thực hiện** | Phòng khám - Xem danh sách "Hàng Đợi Lâm Sàng" |
| **Trạng thái** | Vẫn `IN_PROGRESS` |
| **Quy trình khám** | 1. Bác sĩ gọi bệnh nhân từ hàng đợi (mã U1)<br>2. Hỏi triệu chứng, bệnh sử<br>3. Kiểm tra sơ bộ<br>4. (Tuỳ chọn) Chỉ định dịch vụ phụ:<br>   - Siêu âm bụng<br>   - Xét nghiệm máu<br>   - Chụp X-quang<br>5. Quyết định: Khám xong hay còn đợi xét nghiệm |
| **Dữ liệu lưu** | - Ghi chú khám sơ bộ<br>- Chỉ định dịch vụ<br>- Thời gian bắt đầu, kết thúc |

#### API: `POST /api/appointments/{id}/service-indications`
```javascript
Body: {
  indications: [
    { service_name: "Siêu âm bụng", order_sequence: 1 },
    { service_name: "Xét nghiệm máu", order_sequence: 2 }
  ]
}
```

---

### **BƯỚC 6️⃣: BÁC SĨ NHẬP KẾT QUẢ KHÁM** 📝

| Thông Tin | Chi Tiết |
|----------|---------|
| **Người thực hiện** | Bác Sĩ |
| **Nơi thực hiện** | Trang "Nhập Kết Quả Khám" (`/nhap-ket-qua/{code}`) |
| **Trạng thái hiện** | `IN_PROGRESS` |
| **Trạng thái sau** | `COMPLETED` |
| **Dữ liệu nhập** | 1. **Chẩn đoán**: Kết quả khám sơ bộ (text/rich editor)<br>2. **Đơn Thuốc**: Danh sách thuốc + liều lượng<br>3. **Lịch Tái Khám**: Ngày/giờ tái khám (tuỳ chọn)<br>4. **Tệp Y Tế**: Upload ảnh siêu âm, kết quả xét nghiệm<br>5. **Ghi Chú Bác Sĩ**: Lưu ý hay cách chăm sóc |
| **Tạo Hồ Sơ Y Tế** | - Hệ thống tự động tạo Medical Record<br>- Sinh mã: `MR-202605-001`<br>- Lưu trữ đầy đủ dữ liệu khám |
| **Kết quả** | - Lịch: `COMPLETED`<br>- Medical Record tạo thành công<br>- Email: "Kết quả khám sẵn sàng"<br>- Bệnh nhân nhận thông báo |

#### API: `PUT /api/appointments/{code}/complete`
```javascript
Body: {
  medicalResult: "Khám toàn thân bình thường, huyết áp ổn định, ...",
  prescription: JSON.stringify([
    { drug_name: "Aspirin", dosage: "1 viên", frequency: "2 lần/ngày", duration: "7 ngày" }
  ]),
  nextAppointment: "2026-05-17",
  files: [] // Upload files
}

Response: {
  status: "completed",
  medicalRecord: { id: 999, code: "MR-202605-001" },
  message: "Hoàn thành lịch hẹn thành công"
}
```

---

### **BƯỚC 7️⃣: BỆNH NHÂN XEM KẾT QUẢ & ĐÁNH GIÁ** ⭐

| Thông Tin | Chi Tiết |
|----------|---------|
| **Người thực hiện** | Bệnh Nhân |
| **Nơi thực hiện** | Trang "Kết Quả Khám" hoặc "Chi Tiết Lịch Hẹn" |
| **Trạng thái** | `COMPLETED` |
| **Quyền truy cập** | - Bệnh nhân xem kết quả khám của chính mình<br>- Xem đơn thuốc<br>- Download tài liệu y tế<br>- Xem lịch tái khám |
| **Hành động bệnh nhân** | 1. Xem kết quả khám<br>2. (Tuỳ chọn) Đánh giá bác sĩ: 1-5 sao + nhận xét<br>3. (Tuỳ chọn) Đặt lịch tái khám<br>4. (Tuỳ chọn) Tải đơn thuốc, hóa đơn |
| **Bảo Mật** | - Chỉ bệnh nhân của lịch đó mới xem được<br>- Cần xác thực (password) để xem (nếu online)<br>- Log truy cập được ghi lại |

#### API: `GET /api/appointments/{code}`
```javascript
Response: {
  status: "completed",
  medicalRecord: {
    id: 999,
    diagnosis: "...",
    prescription: [...],
    nextAppointment: "2026-05-17"
  }
}
```

---

### **BƯỚC (Tuỳ Chọn): BỆNH NHÂN HỦY LỊCH** ❌

| Thông Tin | Chi Tiết |
|----------|---------|
| **Người thực hiện** | Bệnh Nhân hoặc Admin/Staff |
| **Nơi thực hiện** | Trang "Chi Tiết Lịch Hẹn" |
| **Có thể hủy khi** | Trạng thái: `PENDING`, `CONFIRMED`, `IN_PROGRESS` |
| **Không thể hủy** | Trạng thái: `COMPLETED`, `CANCELLED` |
| **Điều kiện hủy bệnh nhân** | - Phải hủy **trước 6 giờ** khám|
| **Điều kiện hủy Admin** | - Admin/Staff có thể hủy bất cứ lúc nào |
| **Lý do hủy** | Bắt buộc nhập lý do hủy |
| **Hoàn tiền** | - **>= 24h trước**: Hoàn 100%<br>- **6-24h trước**: Hoàn 50%<br>- **< 6h trước**: Không hoàn<br>- **Đã hủy**: Không hoàn |
| **Trạng thái sau** | `CANCELLED` |
| **Kết quả** | - Lịch hủy<br>- Email: "Lịch hẹn đã hủy, hoàn tiền ..."<br>- Khám không diễn ra |

#### API: `PUT /api/appointments/{code}/cancel`
```javascript
Body: {
  reason: "Công việc bận, không thể tới"
}

Response: {
  status: "cancelled",
  refund: {
    percent: 100,
    amount: 500000,
    status: "pending"
  }
}
```

---

## 👥 Phối Hợp Giữa Các Role

### **1. BỆNH NHÂN (Patient)**
| Bước | Hành Động | Trạng Thái | Khi Nào |
|-----|---------|----------|--------|
| 1️⃣ | Đặt lịch | pending | Bất cứ lúc nào |
| 3️⃣ | Thanh toán | confirmed | Trước ngày khám 30 phút |
| 4️⃣ | Đến quầy | in_progress | Vào giờ lịch hẹn |
| 7️⃣ | Xem kết quả | completed | Sau khi bác sĩ nhập |

**Quyền:**
- ✅ Đặt, hủy, đổi lịch
- ✅ Thanh toán
- ✅ Xem kết quả khám
- ✅ Đánh giá bác sĩ
- ❌ Xác nhận lịch
- ❌ Khám bệnh

---

### **2. ADMIN / STAFF QUẢN LÝ (Admin/Receptionist)**
| Bước | Hành Động | Trạng Thái | Khi Nào |
|-----|---------|----------|--------|
| 2️⃣ | Xác nhận lịch | confirmed | Trong 1 giờ sau đặt |
| 3️⃣ | Thu tiền tại quầy | confirmed | Trước ngày khám |
| 4️⃣ | Check-in bệnh nhân | in_progress | Bệnh nhân đến quầy |
| - | Quản lý hàng chờ | in_progress | Cả ngày |

**Quyền:**
- ✅ Xác nhận / từ chối lịch
- ✅ Check-in bệnh nhân
- ✅ Thu tiền (ghi nhận thanh toán)
- ✅ Cấp số thứ tự
- ✅ Quản lý hàng đợi
- ✅ Hủy lịch với lý do
- ❌ Khám bệnh
- ❌ Nhập kết quả

---

### **3. BÁC SĨ (Doctor)**
| Bước | Hành Động | Trạng Thái | Khi Nào |
|-----|---------|----------|--------|
| 5️⃣ | Xem hàng đợi | in_progress | Trong ca làm việc |
| 5️⃣ | Gọi bệnh nhân | in_progress | Theo thứ tự |
| 5️⃣ | Chỉ định dịch vụ | in_progress | Khi khám |
| 6️⃣ | Nhập kết quả | completed | Sau khi khám xong |

**Quyền:**
- ✅ Xem lịch hẹn của mình
- ✅ Xem hàng đợi lâm sàng
- ✅ Chỉ định dịch vụ phụ
- ✅ Nhập kết quả khám
- ✅ Xem hồ sơ bệnh nhân
- ❌ Xác nhận lịch
- ❌ Quản lý thanh toán

---

### **4. LỄ TÂN CHECK-IN (Front Desk Staff)**
| Bước | Hành Động | Trạng Thái | Khi Nào |
|-----|---------|----------|--------|
| 4️⃣ | Gọi bệnh nhân check-in | confirmed → in_progress | Bệnh nhân đến |
| 4️⃣ | Cấp số thứ tự | in_progress | Hệ thống tự động |
| 3️⃣ | Ghi nhận thanh toán | confirmed | Bệnh nhân trả tiền |

**Quyền:**
- ✅ Check-in bệnh nhân
- ✅ Cấp số thứ tự
- ✅ Ghi nhận thanh toán
- ❌ Xác nhận lịch
- ❌ Nhập kết quả

---

## 🔄 Sơ Đồ Tương Tác Giữa Các Role

```
BỆNH NHÂN                 ADMIN                     BÁC SĨ                LỄTÂN
   |                        |                          |                    |
   |---- Đặt lịch ------→   |                          |                    |
   |                        |                          |                    |
   |                    Xác nhận                       |                    |
   |   ← Email: Xác nhận |                          |                    |
   |                        |                          |                    |
   |          Thanh toán (optional)                    |                    |
   |                        |                          |                    |
   |           → Check-in ─────→──────→────────→       |                    |
   |                                                   |-- Gọi khám →        |
   |                                           Khám bệnh|                    |
   |                          ← Thông báo khám ←      |                    |
   |                                                   |                    |
   |                                           Nhập kết quả                 |
   |← Email: Kết quả khám ←────────────────────────────|                    |
   |                                                   |                    |
   Xem kết quả & Đánh giá                             |                    |
```

---

## 📈 Timeline - Diễn Biến Trạng Thái

```
Monday 09:00  - Bệnh nhân đặt lịch
               Status: ⏳ PENDING

Monday 09:15  - Admin xác nhận
               Status: ✅ CONFIRMED
                        
Tuesday 14:00 - Bệnh nhân thanh toán
               Status: ✅ CONFIRMED (không đổi, chỉ payment_status thay đổi)
                        
Thursday 10:00 - Bệnh nhân check-in
               Status: 🔴 IN_PROGRESS

Thursday 10:15 - Bác sĩ khám xong, nhập kết quả
               Status: ✅ COMPLETED

Friday 09:00  - Bệnh nhân xem kết quả
               Status: ✅ COMPLETED (không đổi)
```

---

## 📋 Checklist: Từng Bước Cần Chuẩn Bị

- [ ] **Bước 1** - Đặt lịch
  - [ ] Có form đặt lịch trên web/app?
  - [ ] Hiển thị khung giờ trống?
  - [ ] Gửi email xác nhận cho bệnh nhân?

- [ ] **Bước 2** - Admin xác nhận
  - [ ] Có trang quản lý lịch pending?
 - [ ] Có nút "Xác nhận" rõ ràng?
  - [ ] Gửi email khi xác nhận?

- [ ] **Bước 3** - Thanh toán
  - [ ] Tích hợp VNPay / MoMo?
  - [ ] Ghi nhận thanh toán tại quầy?
  - [ ] Tính hoàn tiền chính xác?

- [ ] **Bước 4** - Check-in
  - [ ] Có màn hình check-in tại lễ tân?
  - [ ] Cấp số thứ tự tự động?
  - [ ] Hiển thị trên màn hình quầy?

- [ ] **Bước 5** - Khám & chỉ định
  - [ ] Bác sĩ thấy hàng đợi?
  - [ ] Có nút "Chỉ định dịch vụ"?
  - [ ] Lưu được các chỉ định?

- [ ] **Bước 6** - Nhập kết quả
  - [ ] Có form nhập kết quả khám?
  - [ ] Upload được tệp y tế?
  - [ ] Tạo được Medical Record?

- [ ] **Bước 7** - Xem kết quả
  - [ ] Bệnh nhân thấy kết quả?
  - [ ] Có thể đánh giá bác sĩ?
  - [ ] Có thể tải hóa đơn/đơn thuốc?
