import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamilies } from '../../constants/firebase';
import { Colors } from '../../constants/theme';

export default function AgendaScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fetchEvents = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const uid = currentUser.uid;
    try {
      const userFamilies = await getUserFamilies(uid);
      if (userFamilies && userFamilies.length > 0) {
        const familyIds = userFamilies.map(f => f.id);
        const eventsQuery = query(
          collection(db, 'events'),
          where('familyId', 'in', familyIds),
          orderBy('date', 'asc')
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const fetchedEvents = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(fetchedEvents);
      } else {
        // Fallback for users who might not be in any family but have events
        const eventsQuery = query(
          collection(db, 'events'),
          where('userID', '==', uid),
          orderBy('date', 'asc')
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        setEvents(eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      const uid = currentUser.uid;

      const fetchData = async () => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setFirstName(userDocSnap.data().firstName || 'Utilisateur');
          }

          await fetchEvents();
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else {
      router.replace('/(auth)/WelcomeScreen');
    }
  }, [router, fetchEvents]);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Ajuster le jour de début pour commencer par lundi (1) au lieu de dimanche (0)
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days = [];
    
    // Previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const getEventsForSelectedDate = () => {
    return events.filter((event: any) => {
      if (!event.date?.toDate) return false;
      const eventDate = event.date.toDate();
      return (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  };

  const getEventCountForDate = (date: Date) => {
    const count = events.filter((event: any) => {
      if (!event.date?.toDate) return false;
      const eventDate = event.date.toDate();
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    }).length;
    return Math.min(count, 3); // Maximum 3 pastilles visibles
  };

  const hasEventsOnDate = (date: Date) => {
    return events.some((event: any) => {
      if (!event.date?.toDate) return false;
      const eventDate = event.date.toDate();
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const days = getDaysInMonth();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const selectedDateEvents = getEventsForSelectedDate();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Agenda partagé</Text>
            <View style={styles.headerButtons}>
              <View style={[styles.todayButton, { backgroundColor: colors.secondaryCardBackground }]}>
                <TouchableOpacity onPress={goToToday}>
                  <Text style={[styles.todayButtonText, { color: colors.text }]}>Aujourd'hui</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    router.push('/create-event');
                  }}
                >
                  <Text style={[styles.addButtonText, { color: colors.tint }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Calendar */}
          <View style={[styles.calendarContainer, { backgroundColor: colors.cardBackground }]}>
            {/* Month Navigation */}
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Text style={[styles.navButton, { color: colors.textSecondary }]}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={[styles.monthText, { color: colors.text }]}>
                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Text style={[styles.navButton, { color: colors.textSecondary }]}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            {/* Week Days */}
            <View style={styles.weekDaysRow}>
              {weekDays.map((day) => (
                <Text key={day} style={[styles.weekDayText, { color: colors.textTertiary }]}>{day}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {days.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    !day.isCurrentMonth && styles.otherMonthDay,
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <View style={[
                    styles.dayCircle,
                    isSelected(day.date) && { backgroundColor: colors.secondaryCardBackground },
                  ]}>
                    <Text style={[
                      styles.dayText,
                      { color: colors.text },
                      !day.isCurrentMonth && { color: colors.textTertiary, opacity: 0.3 },
                      isToday(day.date) && !isSelected(day.date) && { color: '#dd2e2eff', fontWeight: '700' },
                      isSelected(day.date) && { color: colors.tint, fontWeight: '700' },
                    ]}>
                      {day.date.getDate()}
                    </Text>
                    {getEventCountForDate(day.date) > 0 && (
                      <View style={styles.eventDotsContainer}>
                        {Array.from({ length: getEventCountForDate(day.date) }).map((_, i) => (
                          <View 
                            key={i} 
                            style={[
                              styles.eventDot,
                              { backgroundColor: ['#87CEEB', '#FF6B6B', '#4ECDC4'][i] }
                            ]} 
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected Date Events */}
          <View style={styles.eventsSection}>
            <Text style={[styles.eventsSectionTitle, { color: colors.textSecondary }]}>
              {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event: any) => (
                <TouchableOpacity 
                  key={event.id} 
                  style={[styles.eventCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push(`/event-details?eventId=${event.id}`)}
                >
                  <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                  <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                    {event.isAllDay ? 'Toute la journée' : event.date?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.noEventsText, { color: colors.textTertiary }]}>Aucun évènement à ce jour</Text>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  containerCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#87CEEB',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayButton: {
    backgroundColor: '#E7F7FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonText: {
    fontSize: 24,
    color: '#87CEEB',
    fontWeight: '300',
    lineHeight: 24,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    fontSize: 24,
    color: '#666',
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayCircle: {
    backgroundColor: '#E7F7FF',
  },
  selectedCircle: {
    backgroundColor: '#87CEEB',
  },
  dayText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: '#999',
  },
  todayText: {
    color: '#87CEEB',
    fontWeight: '700',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  eventsSection: {
    marginTop: 8,
  },
  eventsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  eventCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
  },
  noEventsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 15,
    marginTop: 24,
  },
  eventDotsContainer: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 3,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
