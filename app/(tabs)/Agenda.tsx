import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

export default function AgendaScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const colorScheme = useColorScheme();

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

          const eventsQuery = query(
            collection(db, 'events'),
            where('userID', '==', uid),
            orderBy('date', 'asc')
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          setEvents(eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
  }, [router]);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const days = getDaysInMonth();
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const selectedDateEvents = getEventsForSelectedDate();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Agenda partagé</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
                <Text style={styles.todayButtonText}>Aujourd'hui</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.calendarContainer}>
            {/* Month Navigation */}
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Text style={styles.navButton}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Text style={styles.navButton}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            {/* Week Days */}
            <View style={styles.weekDaysRow}>
              {weekDays.map((day) => (
                <Text key={day} style={styles.weekDayText}>{day}</Text>
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
                    isToday(day.date) && styles.todayCircle,
                    isSelected(day.date) && styles.selectedCircle,
                  ]}>
                    <Text style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.otherMonthText,
                      isToday(day.date) && styles.todayText,
                      isSelected(day.date) && styles.selectedText,
                    ]}>
                      {day.date.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected Date Events */}
          <View style={styles.eventsSection}>
            <Text style={styles.eventsSectionTitle}>
              {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event: any) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {event.date?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noEventsText}>Aucun évènement à ce jour</Text>
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
    gap: 12,
    alignItems: 'center',
  },
  todayButton: {
    backgroundColor: '#E7F7FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  todayButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
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
    color: '#111',
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
});
