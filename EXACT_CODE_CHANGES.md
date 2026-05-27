# Exact Code Changes Made

## File 1: ScheduleManagementPage.js

### Change 1: Added Import (Line 6)
**Before:**
```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import Select from 'react-select';
```

**After:**
```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Select from 'react-select';
```

**Change:** Added `useNavigate` import from react-router-dom

---

### Change 2: Initialize useNavigate Hook (Line 78)
**Before:**
```javascript
const ScheduleManagementPage = () => {
  const [user, setUser] = useState(null);
```

**After:**
```javascript
const ScheduleManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
```

**Change:** Added `const navigate = useNavigate();` at component start

---

### Change 3: Updated onEventClick Handler (Lines 1088-1109)
**Before:**
```javascript
                onEventClick={(event) => toast.info(`Sự kiện: ${event.id || event.reason}`)}
```

**After:**
```javascript
                onEventClick={(event) => {
                  // Nếu là sự kiện lịch hẹn, điều hướng tới AppointmentManagementPage với bộ lọc
                  if (event.type === 'appointment' && event.id) {
                    navigate('/quan-ly-lich-hen', {
                      state: {
                        filters: {
                          doctor_id: event.doctor_id,
                          appointment_date: event.appointment_date,
                          appointment_start_time: event.appointment_start_time
                        }
                      }
                    });
                  } else {
                    // Các sự kiện khác chỉ hiển thị toast
                    toast.info(`Sự kiện: ${event.id || event.reason}`);
                  }
                }}
```

**Change:** Added conditional logic to navigate for appointment events or show toast for others

---

## File 2: AppointmentManagementPage.js

### Change: Updated useEffect for Filter Handling (Lines 147-158)
**Before:**
```javascript
  useEffect(() => {
    const allowedStatuses = new Set(['all', 'pending', 'confirmed', 'upcoming', 'waiting_pay', 'waiting_exam', 'in_progress', 'completed', 'passed', 'cancelled']);
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const nextFilters = {};

    if (status && allowedStatuses.has(status)) {
      nextFilters.status = status;
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      nextFilters.date = date;
    }

    if (Object.keys(nextFilters).length > 0) {
      setFilters((previousFilters) => ({
        ...previousFilters,
        ...nextFilters
      }));
    }
  }, [location.search]);
```

**After:**
```javascript
  useEffect(() => {
    const allowedStatuses = new Set(['all', 'pending', 'confirmed', 'upcoming', 'waiting_pay', 'waiting_exam', 'in_progress', 'completed', 'passed', 'cancelled']);
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const nextFilters = {};

    if (status && allowedStatuses.has(status)) {
      nextFilters.status = status;
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      nextFilters.date = date;
    }

    // Xử lý filters từ navigation state (từ CalendarView click)
    if (location.state?.filters) {
      const stateFilters = location.state.filters;
      if (stateFilters.doctor_id) {
        setSelectedDoctorId(stateFilters.doctor_id);
      }
      if (stateFilters.appointment_date && /^\d{4}-\d{2}-\d{2}$/.test(stateFilters.appointment_date)) {
        nextFilters.date = stateFilters.appointment_date;
      }
    }

    if (Object.keys(nextFilters).length > 0) {
      setFilters((previousFilters) => ({
        ...previousFilters,
        ...nextFilters
      }));
    }
  }, [location.search, location.state]);
```

**Changes:**
1. Added check for `location.state?.filters`
2. Extract `doctor_id` and call `setSelectedDoctorId()`
3. Extract `appointment_date` and add to filters
4. Added `location.state` to dependency array

---

## File 3: CalendarView.js

### Change: Updated onClick Handler (Line 537)
**Before:**
```javascript
              onClick={() => onEventClick && onEventClick(event.raw)}
```

**After:**
```javascript
              onClick={() => onEventClick && onEventClick({ ...event.raw, type: event.type })}
```

**Change:** 
- Spread event.raw to include all original properties
- Add event.type so parent handler can check if it's an appointment
- Ensures type property is available for conditional logic in ScheduleManagementPage

---

## Summary of Changes

**Total Lines Changed:** 3 files
- ScheduleManagementPage.js: 1 import + 1 hook init + 19-line handler = ~21 lines
- AppointmentManagementPage.js: 10 lines added + 1 dependency added = ~11 lines
- CalendarView.js: 1 line modified = ~1 line

**Total:** 33 lines of code (additions/modifications)

**No Deletions:** All changes are additive or replacements at specific locations

**Backward Compatibility:** ✅ Fully maintained
- Existing URL-based filters still work
- Non-appointment events still show toast
- Month view unaffected
- Other event types unaffected

---

## Testing the Implementation

### Quick Test 1: Verify Import
```javascript
// In browser DevTools, in ScheduleManagementPage
console.log(typeof navigate); // Should print: "function"
```

### Quick Test 2: Verify Navigation State
```javascript
// In AppointmentManagementPage after clicking appointment
console.log(location.state); // Should show: { filters: { doctor_id: X, appointment_date: "YYYY-MM-DD", ... } }
```

### Quick Test 3: Verify Event Type
```javascript
// In calendar event click handler
console.log(event.type); // Should print: "appointment" for appointments, "schedule"/"overtime" etc for others
```

### To Run Full Test:
1. Navigate to Schedule Management Page
2. Switch to Calendar Week View
3. Look for appointment events (light pink/red color)
4. Click on an appointment
5. Should navigate to `/quan-ly-lich-hen`
6. Doctor dropdown should show the appointment's doctor
7. Date filter should show only appointments from that date
