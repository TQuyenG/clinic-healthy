# Calendar-to-Appointment Management Integration Test Guide

## Overview
This document outlines the implementation of clickable calendar events that navigate to the Appointment Management Page with pre-applied filters.

## Implementation Summary

### 1. Calendar Event Color Coding
**Status:** ✅ Complete (already implemented in CSS)

| Event Type | Color | CSS Class |
|-----------|-------|-----------|
| Schedule (Fixed) | Light Blue | `.week-calendar-view__event--schedule` |
| Schedule (Flexible) | Light Blue | `.week-calendar-view__event--flexible` |
| Appointment | Light Pink/Red | `.week-calendar-view__event--appointment` |
| Overtime | Amber/Orange | `.week-calendar-view__event--overtime` |
| Leave | Yellow | `.week-calendar-view__event--leave` |

**How it works:**
- Events are assigned a `type` property during processing (CalendarView.js, line 442)
- The type determines which CSS class is applied
- CSS classes in CalendarView.css define the visual styling

### 2. Calendar Event Positioning
**Status:** ✅ Complete (time-axis positioning via calculateOverlaps)

- Events are positioned absolutely with:
  - `top`: Percentage of day (calculated from start_time)
  - `height`: Duration-based percentage
  - `left`, `width`: Column-based when overlapping (handled by calculateOverlaps)
- Implements Google Calendar-like layout

### 3. Clickable Navigation Implementation
**Status:** ✅ Complete

#### Files Modified:
1. **ScheduleManagementPage.js**
   - Added: `import { useNavigate } from 'react-router-dom'`
   - Added: `const navigate = useNavigate();` in component
   - Updated: `onEventClick` handler (lines 1088-1109)
   - Behavior: Detects appointment events and navigates with filters

2. **CalendarView.js**
   - Updated: onClick handler to include event type (line 537)
   - Pass: `{ ...event.raw, type: event.type }` to onEventClick
   - Ensures: `event.type` is accessible in parent handler

3. **AppointmentManagementPage.js**
   - Updated: useEffect to read location.state.filters (lines 147-157)
   - Added: Dependency on location.state (line 158)
   - Behavior: Auto-applies doctor and date filters on navigation

### 4. Navigation Flow

```
User clicks appointment event in Calendar
  ↓
CalendarView.onEventClick triggers
  ↓
ScheduleManagementPage.onEventClick checks event.type === 'appointment'
  ↓
navigate('/quan-ly-lich-hen', { state: { filters: { ... } } })
  ↓
AppointmentManagementPage receives state
  ↓
useEffect detects location.state.filters
  ↓
Sets selectedDoctorId and date filters
  ↓
Appointments table renders filtered results
```

### 5. Data Structure

**Event object passed to onEventClick:**
```javascript
{
  // Original appointment fields
  id: <appointment_id>,
  doctor_id: <doctor_id>,
  appointment_date: 'YYYY-MM-DD',
  appointment_start_time: 'HH:MM',
  appointment_end_time: 'HH:MM',
  guest_name: 'Patient Name',
  service_id: <service_id>,
  status: 'confirmed',
  
  // Added by CalendarView
  type: 'appointment'
}
```

**Navigation state structure:**
```javascript
{
  state: {
    filters: {
      doctor_id: <doctor_id>,
      appointment_date: 'YYYY-MM-DD',
      appointment_start_time: 'HH:MM'
    }
  }
}
```

## Testing Procedure

### Test 1: Color Coding Verification
1. Navigate to Schedule Management Page
2. Switch to Calendar (Week View)
3. Observe appointment events are colored light pink/red
4. Observe other events (schedule, overtime, leave) have correct colors
5. Expected Result: Different event types display in distinct colors

### Test 2: Event Positioning
1. Navigate to a day with multiple events
2. Observe appointments are positioned vertically by time
3. Observe overlapping events stack horizontally
4. Expected Result: Events positioned like Google Calendar (not just columns)

### Test 3: Appointment Navigation
1. In Calendar view, locate an appointment event
2. Click on the appointment event
3. Should navigate to Appointment Management Page
4. Expected Result: Page loads without errors

### Test 4: Filter Application
1. After clicking appointment (Test 3):
2. Check if the Appointment Management Page has:
   - Doctor pre-selected in dropdown
   - Date filter applied (showing only appointments on that date)
3. Expected Result: Appointments filtered to match clicked event

### Test 5: Other Event Types
1. Click on schedule, overtime, or leave events
2. Should show toast notification
3. Should NOT navigate to Appointment Page
4. Expected Result: Toast displays with event ID/reason

### Test 6: Monthly View Compatibility
1. Switch CalendarView to Month view
2. No changes expected (month view unaffected)
3. Expected Result: Month view works normally

## Debugging Checklist

If implementation doesn't work:

- [ ] Verify CalendarView.js line 537 includes: `onClick={() => onEventClick && onEventClick({ ...event.raw, type: event.type })}`
- [ ] Verify ScheduleManagementPage.js has useNavigate import
- [ ] Verify onEventClick handler checks `event.type === 'appointment'`
- [ ] Verify useNavigate hook is initialized in ScheduleManagementPage
- [ ] Verify AppointmentManagementPage.js has location.state check (line 147-157)
- [ ] Verify useEffect dependencies include `location.state`
- [ ] Check browser console for navigation errors
- [ ] Verify data fields exist: `event.doctor_id`, `event.appointment_date`, `event.appointment_start_time`

## Known Limitations

1. Month view shows only indicators (no clickable events)
2. Only appointment events navigate; other events show toast
3. Filters apply only to doctor_id and date (time filter not used in appointments list view)

## Future Enhancements

1. Add time-based filtering to AppointmentManagementPage
2. Add month view appointment click support
3. Add appointment detail modal from calendar
4. Add keyboard shortcuts for appointment navigation
