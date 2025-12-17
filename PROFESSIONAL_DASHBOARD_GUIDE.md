# Professional Dashboard - Implementation Guide

## Overview
The Professional Dashboard provides a comprehensive interface for professionals (mediators, lawyers, etc.) to manage their client families, monitor events, and handle communication with parents in the co-parenting application.

## Design System

### Color Palette
Following the existing dark theme:
- **Primary Accent**: `#2E5C6E` (Teal/Blue) - Used for primary actions, icons, and highlights
- **Secondary Accent**: `rgb(255, 206, 176)` - Used for secondary elements
- **Background**: Dark grey/black (`#151718` in dark mode)
- **Card Background**: `#1F2223` in dark mode
- **Text Colors**: 
  - Primary: `#ECEDEE`
  - Secondary: `#B0B0B0`
  - Tertiary: `#808080`

### Visual Consistency
The Professional Dashboard strictly follows the design principles from the Parent Dashboard:
- Dark theme with teal accents
- Rounded card styling with subtle shadows
- Bottom navigation with blur effect
- Consistent spacing and typography

## Architecture

### Multi-Family Support
The application supports a **multi-family architecture** where:
- A single Parent user can be linked to multiple `family_id`s
- Parents manage their family associations (Join/Leave) in their Profile section
- The Professional interface visualizes these relationships but does NOT handle Join/Leave logic
- Professionals can see all families they're associated with and their respective parents

### Data Structure

```typescript
interface ClientFamily {
  familyId: string;
  familyName: string;
  parents: Array<{
    uid: string;
    firstName: string;
    lastName?: string;
    email: string;
  }>;
  lastActivity?: Date;
}
```

## Key Modules

### 1. Overview Module
Located at the top of the dashboard with three statistics cards:

- **Families Count**: Total number of client families
- **Events Count**: Upcoming events across all families
- **Unread Messages**: Total unread messages from all clients

**Features:**
- Quick glance at key metrics
- Visual icons with teal accent circles
- Real-time updates via Firestore listeners

### 2. Client Management Module
Displays parents grouped by family:

**Features:**
- Family cards showing:
  - Family name
  - Family ID (first 8 characters)
  - List of parents with:
    - Avatar with initials
    - Full name
    - Email address
- Click on any parent to start a conversation
- "Tout voir" link to navigate to full messaging interface

**Business Logic:**
- Fetches all families associated with the professional
- Groups parents by their family memberships
- Filters to show only users with 'parent' role
- Displays up to 4 families on the dashboard (configurable)

### 3. Upcoming Events Module
Shows a chronological list of upcoming events:

**Features:**
- Calendar badge with day and month
- Event title and details
- Location (if available)
- Time information (all-day or specific times)
- Click to view event details
- "Voir plus/moins" toggle for expanded view

**Data Source:**
- Queries events from all associated families
- Filters to show only future events
- Sorted by date (ascending)
- Shows 3 events by default, expandable to all

### 4. Messaging/Inbox Module
Receives and displays messages from Parents initiated via the "Aide" tab:

**Features:**
- Avatar with sender's initial
- Sender name
- Message preview (truncated)
- Unread badge with count
- Click to open full conversation
- Shows top 3 unread conversations

**Communication Flow:**
1. Parent contacts professional via "Aide" tab (existing feature)
2. Message appears in Professional's Inbox
3. Professional can reply via the conversation interface
4. No new tabs added to Parent interface (constraint respected)

## File Structure

```
app/
├── (pro-tabs)/
│   ├── _layout.tsx          # Tab navigation layout for professionals
│   ├── index.tsx             # Professional Dashboard (main home screen)
│   ├── Message.tsx           # Full messaging interface
│   ├── Agenda.tsx            # Calendar view
│   └── profil.tsx            # Professional profile settings
├── (tabs)/
│   └── Aide.tsx              # Parent's Help tab (contact professionals)
└── conversation.tsx          # Shared conversation screen
```

## Firebase Integration

### Collections Used

1. **users** - User profiles
   ```javascript
   {
     uid: string,
     firstName: string,
     lastName: string,
     email: string,
     roles: ['parent' | 'professional'],
     familyIds: string[]  // Array of family IDs user belongs to
   }
   ```

2. **families** - Family groups
   ```javascript
   {
     id: string,
     name: string,
     members: string[],  // Array of user UIDs
     createdAt: Timestamp
   }
   ```

3. **events** - Calendar events
   ```javascript
   {
     id: string,
     familyId: string,
     title: string,
     date: Timestamp,
     startTime?: Timestamp,
     endTime?: Timestamp,
     location?: string,
     isAllDay: boolean
   }
   ```

4. **conversations** - Messages
   ```javascript
   {
     id: string,
     familyId: string,
     participants: string[],  // Array of 2 user UIDs
     lastMessage: string,
     lastMessageTime: Timestamp,
     unreadCount: {
       [userId]: number
     }
   }
   ```

### Real-time Listeners

The dashboard uses Firestore `onSnapshot` listeners for real-time updates:

```typescript
// Listen to families
const unsubUser = onSnapshot(doc(db, 'users', uid), (doc) => {
  // Update user data
});

// Listen to events
const eventsQuery = query(
  collection(db, 'events'),
  where('familyId', 'in', familyIds),
  orderBy('date', 'asc')
);
const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
  // Update events
});

// Listen to conversations
const conversationsQuery = query(
  collection(db, 'conversations'),
  where('familyId', 'in', familyIds),
  where('participants', 'array-contains', uid),
  orderBy('lastMessageTime', 'desc')
);
const unsubConversations = onSnapshot(conversationsQuery, (snapshot) => {
  // Update messages
});
```

## Navigation

### Routes
- `/` - Professional Dashboard home (index.tsx)
- `/Agenda` - Calendar view
- `/Message` - Full messaging interface
- `/conversation?otherUserId={id}&otherUserName={name}` - Individual conversation
- `/event-details?eventId={id}` - Event details
- `/profil` - Professional profile

### Deep Linking
All cards are clickable and navigate to relevant detail pages:
- Parent rows → Open conversation with that parent
- Event cards → Event details page
- Message cards → Conversation with sender

## Responsive Design

The dashboard uses the existing responsive utilities from `@/constants/responsive`:

```typescript
import { 
  BORDER_RADIUS, 
  FONT_SIZES, 
  SPACING, 
  V_SPACING, 
  hs,  // Horizontal scale
  vs,  // Vertical scale
  wp   // Width percentage
} from '@/constants/responsive';
```

These ensure consistent sizing across different screen sizes and orientations.

## State Management

The component uses React hooks for state:

```typescript
const [user, setUser] = useState<User | null>(null);
const [firstName, setFirstName] = useState('');
const [events, setEvents] = useState([]);
const [messages, setMessages] = useState([]);
const [families, setFamilies] = useState([]);
const [clientFamilies, setClientFamilies] = useState<ClientFamily[]>([]);
const [unreadCount, setUnreadCount] = useState(0);
const [loading, setLoading] = useState(true);
```

All state updates are driven by Firestore listeners for real-time synchronization.

## Key Features

### ✅ Implemented
1. **Overview Dashboard** with statistics
2. **Client Management** grouped by family
3. **Upcoming Events** with calendar view
4. **Messaging Integration** with Parents' "Aide" tab
5. **Dark theme** with teal accents
6. **Real-time updates** via Firestore
7. **Multi-family support**
8. **Responsive design**

### 🎯 Future Enhancements
1. Search/filter clients
2. Export reports
3. Appointment scheduling
4. Document sharing
5. Notes on client families
6. Notification preferences
7. Analytics dashboard

## Usage Example

### For Professionals
1. Login as a professional user
2. Dashboard shows all client families
3. View upcoming events across all families
4. Check inbox for messages from parents
5. Click on any parent to start/continue conversation
6. Navigate to Agenda for full calendar view
7. Access profile for settings

### For Parents (Existing Flow)
1. Parent uses "Aide" tab to contact professional
2. Message sent to professional's inbox
3. Professional receives notification
4. Professional can view and reply from Dashboard or Message tab
5. Conversation appears in both Parent's and Professional's message lists

## Testing Checklist

- [ ] Dashboard loads correctly for professional users
- [ ] Statistics cards show accurate counts
- [ ] Client families display with correct parent information
- [ ] Events show upcoming events only, sorted correctly
- [ ] Clicking parent opens conversation
- [ ] Unread message badges show correct counts
- [ ] Navigation to detail pages works
- [ ] Real-time updates occur when data changes
- [ ] Multi-family scenarios work correctly
- [ ] Dark theme styling is consistent
- [ ] Responsive on different screen sizes

## Troubleshooting

### Issue: No families showing
- **Solution**: Ensure professional user has `familyIds` array populated in their user document
- **Check**: Verify families have `members` array including the professional's UID

### Issue: Events not appearing
- **Solution**: Check that events have correct `familyId` matching professional's families
- **Check**: Ensure `date` field is a Firestore Timestamp

### Issue: Messages not showing
- **Solution**: Verify conversations have correct `participants` array and `familyId`
- **Check**: Ensure `unreadCount` object has professional's UID as key

## Code Maintenance

### Adding New Features
1. Add new state variables if needed
2. Create Firestore listeners in `useEffect`
3. Design UI components following existing card patterns
4. Use existing color scheme and spacing constants
5. Add navigation handlers
6. Test with real-time data updates

### Modifying Existing Features
1. Check impact on real-time listeners
2. Update TypeScript interfaces if data structure changes
3. Maintain visual consistency with design system
4. Test navigation flows
5. Update this documentation

## Security Considerations

- All queries filter by `familyId` to ensure professionals only see their assigned families
- Conversations require `participants` array check
- Firebase Security Rules should enforce:
  ```javascript
  // Only professionals can read families they're members of
  match /families/{familyId} {
    allow read: if request.auth.uid in resource.data.members;
  }
  
  // Only participants can read conversations
  match /conversations/{conversationId} {
    allow read: if request.auth.uid in resource.data.participants;
  }
  ```

## Performance Optimization

1. **Pagination**: Currently showing limited items (3-4) per section
2. **Listener Management**: All listeners properly unsubscribed on unmount
3. **Conditional Queries**: Only fetch data when families exist
4. **Memoization**: Consider using `useMemo` for expensive computations
5. **Image Optimization**: Using icon symbols instead of heavy images

## Support

For questions or issues:
- Check Firebase console for data structure
- Verify user roles are correctly set
- Ensure family memberships are properly configured
- Review Firestore query logs for errors

---

**Last Updated**: December 17, 2025
**Version**: 1.0.0
**Author**: Senior Frontend Developer & UI/UX Designer
