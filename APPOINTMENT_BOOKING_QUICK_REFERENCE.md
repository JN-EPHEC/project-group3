# Appointment Booking System - Quick Reference

## For Parents

### How to Request an Appointment

1. **Navigate to Help Tab** (Aide)
   - Select professional type: Avocat or Psychologue
   - Browse available professionals

2. **View Professional Profile**
   - Scroll through professional details
   - See available time slots displayed as colored chips

3. **Click "Rendez-vous" Button**
   - Booking modal opens
   - Professional's name shows at top

4. **Select Day**
   - Scroll through day tabs (Lun, Mar, Mer, etc.)
   - Only open days are clickable
   - Selected day highlights in #FFCEB0
   - Shows "Ouvert" (Open) or "Fermé" (Closed)

5. **Choose Time Slot**
   - Available slots display as chips
   - Click to select preferred time
   - Selected slot highlights in #FFCEB0

6. **Confirm Appointment**
   - Review confirmation card showing:
     - Professional name
     - Selected day
     - Selected time (HH:MM - HH:MM format)
   - Click "Confirmer" button
   - Success message appears

7. **Next Steps**
   - Appointment request sent to professional
   - Professional will accept or reject
   - Can message professional via Message tab while waiting

---

## For Professionals

### Managing Appointment Requests

1. **Navigate to Agenda Tab**
   - Tap "Agenda" at top

2. **Switch to Appointments View**
   - Tap "Rendez-vous" tab
   - See badge with pending requests count (red badge)

3. **View Pending Requests**
   - Each pending request shows:
     - Parent name
     - Requested day
     - Requested time slot
     - Date request was received
   - Requests organized in reverse chronological order

4. **Respond to Request**
   - Tap appointment card
   - Modal opens with full details:
     - Parent name
     - Parent email
     - Requested date/time
   - Two action buttons:
     - **Confirmer** (Green): Accept appointment
     - **Refuser** (Red): Decline appointment
   - Modal closes after action
   - Success notification appears

5. **View Confirmed Appointments**
   - Scroll below pending section
   - "Rendez-vous confirmés" shows all accepted appointments
   - Read-only display (cannot modify from here)

6. **Follow Up**
   - Optional: Message parent about appointment details
   - Use Message tab to communicate
   - Both parent and professional can message about the appointment

---

## Status Meanings

- **Pending** (⏳): Parent requested, awaiting professional response
- **Confirmed** (✅): Professional accepted appointment
- **Rejected** (❌): Professional declined appointment (hidden from view)

---

## Available Time Format

Appointments use professional's availability schedule:
- **Day**: Monday through Sunday (labeled in French: Lun-Dim)
- **Time**: 12 hourly slots from 08:00 to 20:00
- **Format**: Start time - End time (e.g., "09:00 - 10:00")

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't see any time slots | Professional may have marked all day as closed |
| Day tabs appear grayed out | That day is not available (closed) |
| Appointment won't save | Check internet connection, try again |
| Don't see pending requests | No appointment requests yet (wait for parents) |
| Appointment disappeared | Status changed by professional (confirm/reject) |

---

## Key Information

- **Appointment Duration**: Fixed 1-hour slots (08:00-09:00, 09:00-10:00, etc.)
- **Days Covered**: Full week (Monday-Sunday)
- **Request Limit**: No limit - parents can request multiple appointments
- **Confirmation Required**: Professional must explicitly confirm each request
- **Cancellation**: Not yet implemented (planned for future)

---

## Related Features

- **Messaging**: Message tab allows parent-professional communication
- **Profiles**: View complete professional details including credentials
- **Availability**: Professional can edit hours in profile settings
- **Contact Info**: Professional contact shows phone, email, address

---

## System Status

✅ Complete and production-ready
- Real-time updates via Firebase
- Offline support (pending syncs when back online)
- Error handling and user feedback
- Responsive design (mobile-first)
