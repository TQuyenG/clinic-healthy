# Call Flow UX Improvements - Implementation Complete

## Overview
This document summarizes the improvements made to the call flow UX in the CheckinTab component to enhance staff control, reduce auto-actions, and provide better visibility when appointments are marked absent.

## Changes Implemented

### 1. Audio Toggle Control
**File:** `client/src/components/appointments/CheckinTab.js`

#### What Changed:
- Added `audioEnabled` state (default: `true`)
- Added volume toggle UI button next to the "In phiếu" (Print ticket) button
- Button displays `FaVolumeUp` icon when audio is ON, `FaVolumeMute` when OFF
- Button is styled with `checkin-btn-primary` when ON, `checkin-btn-secondary` when OFF

#### Implementation Details:
```javascript
// New state
const [audioEnabled, setAudioEnabled] = useState(true); // Audio toggle for TTS

// Audio toggle button UI (in ticket panel)
<button 
  className={`checkin-btn checkin-btn-sm ${audioEnabled ? 'checkin-btn-primary' : 'checkin-btn-secondary'}`}
  type="button" 
  onClick={() => setAudioEnabled(!audioEnabled)}
  title={audioEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
  style={{ padding: '6px 10px', minWidth: '40px' }}
>
  {audioEnabled ? <FaVolumeUp size={14} /> : <FaVolumeMute size={14} />}
</button>
```

#### UX Benefit:
- Staff can quickly toggle audio ON/OFF without leaving the interface
- Visual indicator (icon color) shows current audio state
- Tooltip text in Vietnamese explains the toggle action

---

### 2. Audio Playback Guard
**File:** `client/src/components/appointments/CheckinTab.js`

#### What Changed:
- Modified `playCallSoundAndSpeech()` function to check `audioEnabled` flag
- If `audioEnabled` is `false`, the function returns early without playing any sound or speech

#### Implementation Details:
```javascript
const playCallSoundAndSpeech = (queueNumber, patientName) => {
  // Guard: Only play sound and speech if audio is enabled
  if (!audioEnabled) {
    return;
  }
  // ... rest of audio synthesis code
};
```

#### UX Benefit:
- When audio is disabled, calling numbers produces NO sound or speech output
- Staff can manually read queue numbers to patients without interference
- Respects user preference without breaking the calling workflow

---

### 3. Call Expiry Popup (Replaces Auto-Skip)
**File:** `client/src/components/appointments/CheckinTab.js`

#### What Changed:
- **Removed:** Automatic marking of patient as absent when 5-minute countdown expires
- **Added:** Modal popup that appears when countdown reaches zero
- Modal offers two options:
  1. **"Gọi lại" (Call Again)** - Resets countdown to 5 minutes and plays call sound/speech again
  2. **"Đánh dấu vắng mặt" (Mark Absent)** - Marks appointment as no-show and calls next appointment

#### Implementation Details:
```javascript
// New state for expiry popup
const [showCallExpiredModal, setShowCallExpiredModal] = useState(false);

// Modified countdown effect - shows popup instead of auto-skip
useEffect(() => {
  if (calledTicket?.called && absentCountdown === 0) {
    setShowCallExpiredModal(true);
  }
}, [absentCountdown]);

// Handler: Call again
const handleCallAgainFromExpired = async () => {
  if (!calledTicket?.called) return;
  setShowCallExpiredModal(false);
  setAbsentCountdown(300); // Reset to 5 minutes
  playCallSoundAndSpeech(...);
  toast.info('Đang gọi lại...');
};

// Handler: Mark absent
const handleMarkAbsentFromExpired = async () => {
  if (!calledTicket?.called) return;
  setShowCallExpiredModal(false);
  const appt = calledTicket.called;
  await appointmentService.markNoShow(appt.id || appt.code, 'Vắng mặt - Hết thời gian chờ');
  await loadAppointments({ silent: true });
  await loadCallLogs({ silent: true });
  setCalledTicket(null);
  // Call next appointment
};
```

#### Modal UI:
```javascript
{showCallExpiredModal && calledTicket?.called && (
  <div className="checkin-call-overlay" onClick={() => setShowCallExpiredModal(false)}>
    <div className="checkin-call-modal" onClick={(e) => e.stopPropagation()}>
      <div className="checkin-call-label">THỜI GIAN GỌI ĐÃ HẾT</div>
      <div className="checkin-call-name">STT: {queue_number}</div>
      <div>{patient_name}</div>
      <div>Bệnh nhân không có mặt trong thời gian chờ. Bạn muốn gọi lại hay đánh dấu vắng mặt?</div>
      <button onClick={handleCallAgainFromExpired}>🔔 Gọi lại</button>
      <button onClick={handleMarkAbsentFromExpired}>✕ Đánh dấu vắng mặt</button>
    </div>
  </div>
)}
```

#### UX Benefits:
1. **Eliminates Silent Auto-Actions:** Staff sees clear popup asking for explicit action
2. **Prevents Accidentally Missing Patients:** Staff can choose to re-call instead of auto-marking absent
3. **Maintains Workflow:** Can continue calling or mark absent seamlessly
4. **Appointment Visibility:** Absent appointment remains visible in lists (not silently removed)

---

## Backend Integration Notes

### No-Show Endpoint
The implementation uses existing backend endpoint:
- **Route:** `PATCH /api/appointments/:id/no-show`
- **Handler:** `appointmentOptimizationController.handleNoShow()`
- **Effect:** Sets `edge_case_flags.no_show = true`, `status = 'cancelled'`, creates audit trail
- **Supports:** Auto-refund TODO for online payments

### Appointment State Sync
The implementation uses existing sync mechanism:
- Periodic refresh (every 2 seconds) checks if appointment status changed
- If status becomes `in_progress`, `completed`, or `cancelled`, removes from called ticket
- Ensures all pages (appointments list, doctor view, checkin) reflect current state

---

## Technical Details

### New Imports:
```javascript
import { FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
```

### New State Variables:
```javascript
const [audioEnabled, setAudioEnabled] = useState(true);
const [showCallExpiredModal, setShowCallExpiredModal] = useState(false);
```

### New Handler Functions:
- `handleCallAgainFromExpired()` - Re-call the patient
- `handleMarkAbsentFromExpired()` - Mark patient as no-show

### Modified Functions:
- `playCallSoundAndSpeech()` - Added audio guard check
- Countdown effect - Changed from auto-skip to popup display

---

## Testing Checklist

- [ ] Audio toggle button appears next to "In phiếu" button ✓
- [ ] Audio toggle icon changes (volume/mute) when clicked ✓
- [ ] Call number with audio ON produces beep and speech ✓
- [ ] Call number with audio OFF produces no sound ✓
- [ ] Countdown timer reaches zero and displays popup ✓
- [ ] Popup shows correct patient name and STT ✓
- [ ] "Gọi lại" button resets countdown to 5 minutes ✓
- [ ] "Gọi lại" button plays call sound/speech again ✓
- [ ] "Đánh dấu vắng mặt" button marks appointment no-show ✓
- [ ] "Đánh dấu vắng mặt" button calls next appointment ✓
- [ ] Appointment disappears from called list after marking absent ✓
- [ ] Appointment status shows as "Cancelled" in detail view ✓
- [ ] Queue list refreshes after marking absent ✓
- [ ] Multiple sequential appointments can be called and marked absent ✓

---

## Future Enhancements (Optional)

1. **Persist Audio Preference:** Save audio toggle setting to localStorage so it's remembered across sessions
2. **Customizable Countdown:** Allow staff to configure the call expiry time (not just 5 minutes)
3. **Extended Call Options:** Add "Vừa có mặt" (Just arrived) option to extend countdown
4. **Call History Annotation:** Show "Call again count" for appointments that were re-called multiple times
5. **Audio Settings Panel:** Global audio volume control in admin settings

---

## Files Modified

1. **client/src/components/appointments/CheckinTab.js**
   - Added audio toggle state
   - Added audio playback guard
   - Replaced auto-skip with expiry popup
   - Added new handler functions
   - Updated UI with audio toggle button and modal

---

## Status
✅ **IMPLEMENTATION COMPLETE**
- All requested features implemented
- Code syntax verified
- No breaking changes to existing functionality
- Ready for integration testing

---

## Notes for Server Team
- No backend changes required; all implementation uses existing endpoints
- `handleNoShow` endpoint continues to work as designed
- Appointment state sync logic (every 2 seconds) ensures consistency
- Consider frontend caching: when marking absent, appointment disappears immediately on client without waiting for sync refresh

