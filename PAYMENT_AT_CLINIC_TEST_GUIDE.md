# 🧪 Payment-at-Clinic Workflow - Testing Guide

## 📋 Test Scenarios

### Scenario 1: View Countdown Timer in Detail Page

**Setup:**
1. Create or book an appointment with **Online Payment** method
2. Set appointment time = NOW + 35 minutes (to see countdown)

**Steps:**
1. Open Appointment Detail Page for this appointment
2. Scroll to "Payment Information" section
3. **Expected**: See "Hạn thanh toán" timestamp and countdown "Còn Xh Xm"

**Result**: ✅ Countdown should update every second

---

### Scenario 2: Warning Banner When < 10 Minutes Left

**Setup:**
1. Use the appointment from Scenario 1
2. Wait OR manually adjust browser time to simulate < 10 minutes

**Steps:**
1. Refresh Appointment Detail Page
2. Check for RED warning banner

**Expected Result**:
- ✅ Banner appears in RED (#ff6b6b) with blinking animation
- ✅ Icon shows "⏰ HẠNG CẤP: Thanh toán trong X phút!"
- ✅ Warning text: "Nếu không thanh toán, lịch hẹn sẽ bị tự động hủy"
- ✅ Button text changes to "THANH TOÁN NGAY" with pulse animation

---

### Scenario 3: Check-in Blocked If Unpaid

**Setup:**
1. Create appointment with **Online Payment**, still unpaid
2. Login as **Staff** user
3. Go to **Check-in Tab** (Lễ tân - Tiếp nhận)

**Steps:**
1. Find the unpaid appointment in table
2. Click "Check-in" button
3. **Expected**: Error toast appears
   - "⚠️ Không thể check-in: AP-XXXX chưa thanh toán. Vui lòng hoàn tất thanh toán trước!"

**Result**: 
- ✅ Check-in is blocked
- ✅ Counter Payment Modal opens automatically

---

### Scenario 4: Process Payment at Counter

**Setup:**
- Use check-in blocked scenario (Modal is open)

**Steps:**
1. **Modal shows**:
   - Appointment Code (top)
   - Service name
   - Form fields:
     - "Phương thức": Dropdown (Tiền mặt / Chuyển khoản)
     - "Số tiền thực thu": Input field (pre-filled with service price)
     - "Thời điểm thu": DateTime picker (pre-filled with NOW)

2. **Edit if needed**:
   - Change payment method to "Chuyển khoản" (optional)
   - Adjust amount if different from service price
   - Update timestamp if needed

3. **Click "Xác nhận thanh toán"**
   - Button shows "Đang lưu..." while processing

**Expected Success**:
- ✅ Toast: "Đã cập nhật thanh toán tại quầy"
- ✅ Modal closes
- ✅ Appointment list refreshes
- ✅ Appointment status updates
- ✅ **Patient receives email**: 
  - Subject: "✅ Thanh toán thành công - Lịch hẹn AP-XXXX đã được xác nhận"
  - Contains: amount, service name, doctor name, payment method, link to appointment

**Result** (in DB):
- ✅ `payment_status = 'paid_at_clinic'`
- ✅ `payment_method = 'cash'` or `'bank_transfer'`
- ✅ `paid_at = [staff entered time]`
- ✅ New Payment record created with method = staff entered, status = 'paid'
- ✅ Appointment status = 'confirmed'

---

### Scenario 5: Check-in Succeeds After Payment

**Setup:**
- Appointment already paid via counter payment modal

**Steps:**
1. Staff clicks "Check-in" button again
2. **Expected** ✅:
   - Success toast: "Đã check-in và cấp STT cho AP-XXXX"
   - Queue number assigned
   - Status updates accordingly
   - Appointment moves to "Đã check-in" row

---

### Scenario 6: Auto-Cancel After Deadline (Cronjob Test)

**Setup:**
1. Create appointment with **Online Payment**
2. Set `payment_hold_until` to **NOW - 5 minutes** (manually in DB or via backend)
3. Appointment status = 'confirmed', payment_status = 'unpaid'

**Steps:**
1. Wait for cronjob (runs every 5 minutes)
2. Check appointment status after cronjob runs
3. Check patient's email inbox

**Expected Result**:
- ✅ Appointment status = 'cancelled'
- ✅ Cancellation reason = 'AUTO_CANCEL_PAYMENT_DEADLINE' 
- ✅ **Patient receives email**:
  - Subject: "❌ Lịch hẹn AP-XXXX đã bị hủy - Quá hạn thanh toán"
  - Message: Explanation about payment deadline
  - Link to reschedule or contact clinic

---

### Scenario 7: Payment Not Required (Free Service)

**Setup:**
- Create appointment with service where price = 0 OR payment_method = 'none'

**Steps:**
1. Open Appointment Detail Page
2. Try to check-in

**Expected**:
- ✅ NO payment warning shown
- ✅ Check-in allowed immediately (no modal)
- ✅ Queue number assigned

---

## 📊 Testing Checklist

- [ ] Countdown timer displays and updates correctly
- [ ] Red warning banner appears < 10 minutes before deadline
- [ ] Check-in blocked for unpaid appointments
- [ ] Counter payment modal opens on blocked check-in
- [ ] Staff can enter payment details and submit
- [ ] Appointment status updates to 'paid_at_clinic'
- [ ] Payment record created/updated in DB
- [ ] Patient receives confirmation email
- [ ] Check-in succeeds after payment processed
- [ ] Auto-cancel works after deadline passes via cronjob
- [ ] Patient receives cancellation email
- [ ] Free services (payment_required = false) skip payment check

---

## 🔧 Manual Testing DB Adjustments

### Quick Setup: Simulate < 10 min to deadline

**Via Django/SQL Shell**:
```sql
UPDATE appointments 
SET payment_hold_until = DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
WHERE code = 'AP-XXXX' AND payment_status = 'unpaid';
```

**Or via Backend Script**:
```javascript
// Quick test in Node REPL
const appointment = await Appointment.findOne({ where: { code: 'AP-XXXX' } });
appointment.payment_hold_until = new Date(Date.now() - 5*60000); // 5 min ago
await appointment.save();
```

### Reset Before Next Test
```sql
UPDATE appointments 
SET payment_hold_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE) 
WHERE code = 'AP-XXXX';
```

---

## 📞 Support

If cronjob not running:
1. Check `server/jobs/paymentDeadlineJob.js` is imported in `app.js`
2. Verify: `console.log` messages in server logs when cronjob runs
3. Check cron execution: `node server/jobs/paymentDeadlineJob.js`

If email not sent:
1. Check `.env`: `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST` configured
2. Check `emailSender` service in `server/utils/emailSender.js`
3. Look for template: `payment_success_invoice.html`
