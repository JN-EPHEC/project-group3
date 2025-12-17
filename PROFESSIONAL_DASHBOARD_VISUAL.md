# Professional Dashboard - Visual Layout Reference

## 📱 Dashboard Layout Structure

```
╔══════════════════════════════════════════════════════╗
║  Dashboard Professionnel                              ║
║  Bonjour [FirstName]                                  ║
╠══════════════════════════════════════════════════════╣
║                                                        ║
║  ┌─────────┐  ┌─────────┐  ┌─────────┐              ║
║  │ 👥      │  │ 📅      │  │ ✉️      │              ║
║  │   5     │  │   12    │  │   3     │              ║
║  │Familles │  │Évènemnts│  │Non lus  │              ║
║  └─────────┘  └─────────┘  └─────────┘              ║
║                                                        ║
╠══════════════════════════════════════════════════════╣
║  Gestion des Clients              Tout voir →        ║
║  ┌────────────────────────────────────────────────┐  ║
║  │ 🏠  Famille Martin                             │  ║
║  │     ID: 12a4b5c6...                            │  ║
║  │     ─────────────────────────────────────────  │  ║
║  │     👤 Jean Martin   jean@example.com      >   │  ║
║  │     👤 Marie Martin  marie@example.com     >   │  ║
║  └────────────────────────────────────────────────┘  ║
║  ┌────────────────────────────────────────────────┐  ║
║  │ 🏠  Famille Dupont                             │  ║
║  │     ID: 98f7e6d5...                            │  ║
║  │     ─────────────────────────────────────────  │  ║
║  │     👤 Pierre Dupont pierre@example.com    >   │  ║
║  │     👤 Sophie Dupont sophie@example.com    >   │  ║
║  └────────────────────────────────────────────────┘  ║
║                                                        ║
╠══════════════════════════════════════════════════════╣
║  Prochains Évènements              Agenda →          ║
║  ┌────────────────────────────────────────────────┐  ║
║  │ ┌───┐  Rendez-vous médecin                  >  │  ║
║  │ │15 │  📍 Cabinet Dr. Smith                     │  ║
║  │ │DÉC│  🕒 14:00                                 │  ║
║  │ └───┘                                            │  ║
║  └────────────────────────────────────────────────┘  ║
║  ┌────────────────────────────────────────────────┐  ║
║  │ ┌───┐  Réunion parents                       >  │  ║
║  │ │18 │  📍 École Primaire                        │  ║
║  │ │DÉC│  🕒 16:30                                 │  ║
║  │ └───┘                                            │  ║
║  └────────────────────────────────────────────────┘  ║
║  ┌────────────────────────────────────────────────┐  ║
║  │ ┌───┐  Vacances d'hiver                      >  │  ║
║  │ │22 │  📍 Station de ski                        │  ║
║  │ │DÉC│  🕒 Toute la journée                      │  ║
║  │ └───┘                                            │  ║
║  └────────────────────────────────────────────────┘  ║
║         [ Voir plus ]                                ║
║                                                        ║
╠══════════════════════════════════════════════════════╣
║  Messagerie                         Messages →       ║
║  ┌────────────────────────────────────────────────┐  ║
║  │  👤  Jean Martin                           (2) │  ║
║  │      Bonjour, j'ai une question...             │  ║
║  └────────────────────────────────────────────────┘  ║
║  ┌────────────────────────────────────────────────┐  ║
║  │  👤  Sophie Dupont                         (1) │  ║
║  │      Pouvez-vous m'aider avec...               │  ║
║  └────────────────────────────────────────────────┘  ║
║  ┌────────────────────────────────────────────────┐  ║
║  │  👤  Pierre Dupont                         (3) │  ║
║  │      Je voudrais discuter du...                │  ║
║  └────────────────────────────────────────────────┘  ║
║                                                        ║
╚══════════════════════════════════════════════════════╝
┌──────────────────────────────────────────────────────┐
│ 🏠 Accueil  📅 Agenda  💬 Message  👤 Profil         │
└──────────────────────────────────────────────────────┘
```

## 🎨 Color Coding

### Primary Elements (Teal: #2E5C6E)
- Dashboard title "Dashboard Professionnel"
- Section titles
- Icon circles backgrounds (with 20% opacity)
- Icons inside circles
- Statistics numbers
- Date badges
- Unread badges
- "Voir plus/moins" text
- "Tout voir →" links
- Active tab indicator

### Card Backgrounds (Dark: #1F2223)
- Statistics cards
- Family cards
- Event cards
- Message cards
- Empty state cards

### Text Colors
- **Primary Text (#ECEDEE)**: Titles, names, main content
- **Secondary Text (#B0B0B0)**: Subtitles, metadata, labels
- **Tertiary Text (#808080)**: Descriptions, helper text

### Background
- **Main Background (#151718)**: Screen background
- **Card Background (#1F2223)**: All cards and containers

## 📐 Component Dimensions

### Statistics Cards
```
Width: Flex 1 (33% with gaps)
Height: Auto (padding + content)
Padding: 16px
Border Radius: 16px
Gap between cards: 12px
Icon Circle: 48x48px
Number: Font size 28px, weight 700
Label: Font size 12px, weight 500
```

### Family Cards
```
Width: Full width (minus container padding)
Padding: 16px
Border Radius: 16px
Margin Bottom: 12px
Family Icon Circle: 40x40px
Parent Avatar: 36x36px
Parent Row Gap: 12px
Border Bottom: 1px solid rgba(255,255,255,0.1)
```

### Event Cards
```
Width: Full width
Padding: 16px
Border Radius: 16px
Margin Bottom: 12px
Date Badge: 56x56px, border radius 12px
Event Title: Font size 16px, weight 600
Meta Text: Font size 12px
Icon Size: 14px
```

### Message Cards
```
Width: Full width
Padding: 16px
Border Radius: 16px
Margin Bottom: 12px
Avatar: 44x44px, border radius 22px
Sender Name: Font size 16px, weight 600
Message Preview: Font size 12px, 1 line
Unread Badge: Min 24px width, 24px height, border radius 12px
```

## 🎯 Interactive Elements

### Clickable Areas
1. **Parent Rows** → Opens conversation with that parent
2. **Event Cards** → Navigates to event details page
3. **Message Cards** → Opens conversation with sender
4. **"Tout voir" Links** → Navigates to full section view
5. **"Voir plus/moins" Button** → Toggles event list expansion
6. **Tab Bar Items** → Switches between dashboard sections

### Hover/Press States
All touchable elements have:
- Opacity change on press (default React Native behavior)
- Visual feedback via HapticTab for bottom navigation
- Shadow elevation for cards (subtle 3D effect)

## 📱 Responsive Behavior

### Spacing System
```typescript
SPACING = {
  tiny: 4px,
  small: 8px,
  medium: 12px,
  regular: 16px,
  large: 20px,
  xlarge: 24px,
  xxlarge: 32px
}

V_SPACING = {  // Vertical spacing
  tiny: 4px,
  small: 6px,
  medium: 8px,
  regular: 12px,
  large: 16px,
  xlarge: 24px,
  xxlarge: 32px
}
```

### Adaptive Sizes
- `hs()` - Horizontal scale (width-based)
- `vs()` - Vertical scale (height-based)
- `wp()` - Width percentage
- All measurements scale based on screen size

## 🔄 State Indicators

### Loading State
```
┌────────────────────────────────┐
│                                 │
│        ⟳ Loading...            │
│                                 │
└────────────────────────────────┘
```

### Empty States
```
┌────────────────────────────────┐
│         📭 Icon                │
│                                 │
│   Aucune famille cliente       │
│   pour le moment                │
└────────────────────────────────┘
```

### Unread Indicator
```
┌─────────────────────────────┐
│  👤 Jean Martin        (2)  │  ← Blue badge with count
│      Message preview...     │
└─────────────────────────────┘
```

## 🎬 Animation & Transitions

### Subtle Animations (Platform Default)
- Card press feedback (opacity)
- Navigation transitions (slide)
- Tab switching (fade)
- List rendering (stagger - if implemented)

### Static Elements (No Animation)
- Statistics numbers
- Text content
- Icons
- Badges

## 📊 Data Display Priorities

### What's Shown Immediately
1. **Statistics** - Always visible at top
2. **First 4 families** - With all their parents
3. **First 3 events** - Upcoming only
4. **First 3 unread messages** - Highest priority

### What's Hidden/Collapsed
- Additional families (beyond 4) → "Tout voir"
- Additional events (beyond 3) → "Voir plus"
- All read messages → Only unread shown on dashboard
- Historical events → Only future events

## 🔍 Empty State Messages

### No Families
```
Icon: person.2 (48px, secondary color)
Text: "Aucune famille cliente pour le moment"
```

### No Events
```
Icon: calendar (48px, secondary color)
Text: "Aucun évènement à venir"
```

### No Messages
```
Icon: envelope (48px, secondary color)
Text: "Aucun message non lu"
```

## 🎨 Icon Reference

All icons use SF Symbols (`IconSymbol` component):

### Statistics
- `person.2.fill` - Families count
- `calendar.badge.clock` - Events count
- `envelope.badge.fill` - Messages count

### Family/Client
- `house.fill` - Family icon
- User initial in circle - Parent avatar

### Events
- Calendar date badge (custom design)
- `location.fill` - Location
- `clock.fill` - Time
- `chevron.right` - Navigation indicator

### Messages
- User initial in circle - Sender avatar
- Badge with number - Unread count

### Navigation
- `chevron.right` - Forward navigation (18-20px)

## 🎯 Design Principles Applied

1. **Consistency**: All cards follow same shadow, border radius, padding
2. **Hierarchy**: Clear visual hierarchy (stats → clients → events → messages)
3. **Scannability**: Icons and badges help quick scanning
4. **Affordance**: Chevrons indicate tappable items
5. **Feedback**: Visual feedback on all interactions
6. **Accessibility**: Adequate touch targets (min 44x44px)
7. **Dark Mode**: Consistent dark theme throughout
8. **Professional**: Clean, organized, business-like appearance

---

**Visual Reference Version**: 1.0.0
**Last Updated**: December 17, 2025
