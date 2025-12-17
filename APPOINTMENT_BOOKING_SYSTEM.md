# Appointment Booking System - Implementation Guide

## Overview
Complete appointment booking system implemented for the co-parenting app, allowing parents to request appointments with professionals and professionals to manage requests.

## Features Implemented

### 1. **Parent-Side Booking Interface** (app/(tabs)/Aide.tsx)

#### Booking Modal
- **Access**: Click "Rendez-vous" button on any professional's profile
- **Flow**:
  1. Modal opens showing professional name and appointment request interface
  2. Parent selects a day from 7-day selector (Mon-Sun)
  3. Only open days are selectable (disabled days appear grayed out)
  4. Available time slots display as clickable chips for selected day
  5. Selected slot highlights with #FFCEB0 color
  6. Confirmation card shows selected date, time, and professional name
  7. "Confirmer" button creates appointment document in Firebase

#### State Management
```typescript
// New state variables added to AideScreen
const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
const [selectedProfessionalForBooking, setSelectedProfessionalForBooking] = useState<Professional | null>(null);
const [selectedDayForBooking, setSelectedDayForBooking] = useState<keyof AvailabilitySchedule | null>(null);
const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<TimeSlot | null>(null);
const [bookingLoading, setBookingLoading] = useState(false);
```

#### Key Functions
- `handleBookAppointment()`: Opens booking modal with professional's availability
- `handleConfirmBooking()`: Creates appointment document in Firebase with:
  - userId (parent)
  - professionalId
  - selectedDay (e.g., "monday", "tuesday")
  - selectedTimeSlot (e.g., {start: "09:00", end: "10:00", available: true})
  - status: "pending"
  - createdAt: serverTimestamp()
- `getAvailableSlotsForDay()`: Filters available slots for selected day

### 2. **Professional-Side Management** (app/(pro-tabs)/Agenda.tsx)

#### Tab Navigation
- Two-tab interface: "Agenda" and "Rendez-vous"
- Pending appointments badge shows count of requests needing action
- Easy toggle between event management and appointment management

#### Appointments Tab Features

**Pending Appointments Section**
- Red badge shows number of pending requests
- Click any appointment to view full details and respond
- Displays:
  - Parent name
  - Requested day (e.g., "Monday")
  - Requested time slot (e.g., "09:00 - 10:00")
  - Date appointment was received

**Confirmed Appointments Section**
- Shows all confirmed appointments
- Read-only view (cannot modify)
- Visual distinction from pending requests

#### Appointment Detail Modal
- Professional views full appointment request details
- Shows parent name, email, requested date/time
- Two action buttons for pending appointments:
  - **Confirm** (green #FFCEB0): Sets status to "confirmed"
  - **Reject** (red #FF6B6B): Sets status to "rejected"
- Modal closes after action with success confirmation

#### State Management
```typescript
interface Appointment {
  id: string;
  userId: string;
  professionalId: string;
  professionalName: string;
  selectedDay: string;
  selectedTimeSlot: TimeSlot;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: any;
  parentName?: string;
  parentEmail?: string;
}

// State variables
const [appointments, setAppointments] = useState<Appointment[]>([]);
const [showAppointments, setShowAppointments] = useState(false);
const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
```

#### Key Functions
- `handleAcceptAppointment()`: Updates appointment status to "confirmed"
- `handleRejectAppointment()`: Updates appointment status to "rejected"
- Real-time loading via onSnapshot listener on appointments collection

## Firebase Structure

### Appointments Collection
```javascript
{
  id: "appointment_doc_id",
  userId: "parent_user_id",
  professionalId: "professional_user_id",
  professionalName: "Dr. Jean Dupont",
  professionalType: "avocat|psychologue",
  selectedDay: "monday",
  selectedTimeSlot: {
    start: "09:00",
    end: "10:00",
    available: true
  },
  status: "pending|confirmed|rejected",
  createdAt: Timestamp,
  confirmedAt: Timestamp (optional, when confirmed),
  rejectedAt: Timestamp (optional, when rejected),
  parentName: "Parent Name",
  parentEmail: "parent@email.com"
}
```

## User Experience Flow

### Parent Journey
1. Navigate to Aide tab → Find professional → Expand profile
2. Click "Rendez-vous" button
3. Select preferred day from tabs
4. Choose time slot from available options
5. Review confirmation card
6. Click "Confirmer" to send request
7. See success message
8. Conversation with professional can start in Message tab

### Professional Journey
1. Navigate to Agenda tab → Click "Rendez-vous" tab
2. See badge showing number of pending requests
3. Click appointment to view details
4. Review parent's requested day/time
5. Click "Confirmer" to accept or "Refuser" to decline
6. Appointment appears in "Rendez-vous confirmés" section if accepted
7. Can optionally contact parent via Message tab

## Design System Integration

### Colors Used
- Primary Brand: #FFCEB0 (Professional accent)
- Danger: #FF6B6B (Reject button)
- Active States: 2px border with #FFCEB0
- Component backgrounds: colors.cardBackground, colors.secondaryCardBackground

### Responsive Design
- Uses adaptive spacing (SPACING, V_SPACING, hs, vs)
- Font sizes adapt to device (FONT_SIZES)
- Touch targets min hs(44) (iOS/Android standard)

## Integration Points

### With Existing Features
- **Contact System**: "Contacter" button creates conversations in Message tab
- **Availability System**: Displays professional's structured time slots with status
- **Professional Profiles**: Shows all professional information with booking option
- **Message Tab**: Professionals can message parents about appointments

### Future Enhancements
- Appointment notifications for professionals
- Calendar integration showing confirmed appointments
- Rescheduling capabilities
- Automatic reminders before appointments
- Video call integration
- Appointment history and analytics

## Testing Checklist

- [ ] Parent can open booking modal
- [ ] Parent can select day (disabled days not selectable)
- [ ] Parent can select time slot
- [ ] Confirmation card shows correct information
- [ ] Appointment saves to Firebase with correct status: "pending"
- [ ] Professional receives real-time update of new requests
- [ ] Professional can view appointment details in modal
- [ ] Professional can confirm appointment (status updates to "confirmed")
- [ ] Professional can reject appointment (status updates to "rejected")
- [ ] Appointments badge updates in real-time
- [ ] UI reflects correct states for pending/confirmed appointments

## Code Files Modified

1. **app/(tabs)/Aide.tsx**
   - Added Modal import
   - Added Alert import
   - Added booking modal state variables
   - Implemented complete handleBookAppointment flow
   - Added getAvailableSlotsForDay helper
   - Implemented BookingModal UI with day/slot selection

2. **app/(pro-tabs)/Agenda.tsx**
   - Added imports: updateDoc, serverTimestamp, Alert
   - Added Appointment interface
   - Added appointment state variables
   - Implemented useEffect for real-time appointments loading
   - Added handleAcceptAppointment and handleRejectAppointment functions
   - Added tab navigation (Agenda/Rendez-vous)
   - Implemented appointments display sections
   - Added appointment detail modal
   - Added new styles for appointment cards

## API Compatibility

- Firebase 9+ (modular SDK)
- React Native compatible
- Expo compatible
- Cross-platform (iOS/Android)
