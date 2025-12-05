import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily } from '../../constants/firebase';

export default function AgendaScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('mois');
  const [showViewOptions, setShowViewOptions] = useState(false);
  const flatListRef = React.useRef<FlatList>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fetchEvents = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const uid = currentUser.uid;
    try {
      const userFamily = await getUserFamily(uid);
      if (userFamily?.id) {
        const eventsQuery = query(
          collection(db, 'events'),
          where('familyId', '==', userFamily.id),
          orderBy('date', 'asc')
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const fetchedEvents = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(fetchedEvents);
      } else {
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
    
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  const getDaysInWeek = () => {
    const startOfWeek = new Date(currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      days.push({ date: weekDay, isCurrentMonth: weekDay.getMonth() === currentMonth.getMonth() });
    }
    return days;
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const changeWeek = (offset: number) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + offset * 7);
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setCurrentWeek(today);
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
    return events.filter((event: any) => {
      if (!event.date?.toDate) return false;
      const eventDate = event.date.toDate();
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    }).slice(0, 3);
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
  
  const groupEventsByDay = () => {
    const groupedEvents: { [key: string]: any[] } = {};
    events.forEach(event => {
      if (!event.date?.toDate) return;
      const eventDate = event.date.toDate().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!groupedEvents[eventDate]) {
        groupedEvents[eventDate] = [];
      }
      groupedEvents[eventDate].push(event);
    });
    return groupedEvents;
  };

  useEffect(() => {
    if (viewMode === 'liste') {
      const groupedEvents = groupEventsByDay();
      const eventDates = Object.keys(groupedEvents);
      const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const index = eventDates.findIndex(date => date === today);
      if (index !== -1) {
        flatListRef.current?.scrollToIndex({ index, animated: true });
      }
    }
  }, [viewMode]);

  const renderListView = () => {
    const groupedEvents = groupEventsByDay();
    const eventDates = Object.keys(groupedEvents);

    if (eventDates.length === 0) {
      return <Text style={[styles.noEventsText, { color: colors.textTertiary }]}>Aucun évènement à venir</Text>;
    }

    return (
      <FlatList
        ref={flatListRef}
        data={eventDates}
        keyExtractor={item => item}
        renderItem={({ item: date }) => (
          <View style={styles.dayGroup}>
            <Text style={[styles.dayGroupTitle, { color: colors.textSecondary }]}>{date}</Text>
            {groupedEvents[date].map(event => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => router.push(`/event-details?eventId=${event.id}`)}
              >
                <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                  {event.isAllDay
                    ? 'Toute la journée'
                    : event.startTime && event.endTime
                      ? `${event.startTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${event.endTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                      : event.date?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        onScrollToIndexFailed={info => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />
    );
  };

  const renderWeeklyView = () => {
    const weekDays = getDaysInWeek();
    return (
      <>
        <View style={[styles.calendarContainer, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={() => changeWeek(-1)}>
              <Text style={[styles.navButton, { color: colors.textSecondary }]}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: colors.text }]}>
              {currentWeek.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => changeWeek(1)}>
              <Text style={[styles.navButton, { color: colors.textSecondary }]}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekDaysRow}>
            {weekDays.map(({ date }) => (
              <TouchableOpacity key={date.toString()} onPress={() => setSelectedDate(date)}>
                <View style={[styles.dayCircle, isSelected(date) && { backgroundColor: colors.secondaryCardBackground }]}>
                  <Text style={[styles.weekDayText, { color: colors.textTertiary }]}>{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</Text>
                  <Text style={[styles.dayText, { color: colors.text }, isToday(date) && { color: '#dd2e2eff', fontWeight: '700' }, isSelected(date) && { color: colors.tint, fontWeight: '700' }]}>
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.eventsSection}>
          <Text style={[styles.eventsSectionTitle, { color: colors.textSecondary }]}>
            {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          {getEventsForSelectedDate().length > 0 ? (
            getEventsForSelectedDate().map((event: any) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => router.push(`/event-details?eventId=${event.id}`)}
              >
                <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                  {event.isAllDay
                    ? 'Toute la journée'
                    : event.startTime && event.endTime
                      ? `${event.startTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${event.endTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                      : event.date?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  }
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.noEventsText, { color: colors.textTertiary }]}>Aucun évènement à ce jour</Text>
          )}
        </View>
      </>
    );
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
            <Text style={[styles.title, { color: colors.tint }]}>Agenda partagé</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={[styles.todayButton, { backgroundColor: colors.secondaryCardBackground }]} onPress={goToToday}>
                <Text style={[styles.todayButtonText, { color: colors.tint }]}>Aujourd'hui</Text>
              </TouchableOpacity>
              <View>
                <TouchableOpacity
                  style={styles.viewModeButton}
                  onPress={() => setShowViewOptions(true)}
                >
                  <Text style={[styles.viewModeButtonText, { color: colors.tint }]}>{viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</Text>
                  <Text style={{ color: colors.tint }}>▼</Text>
                </TouchableOpacity>
                <Modal
                  transparent={true}
                  visible={showViewOptions}
                  onRequestClose={() => setShowViewOptions(false)}
                >
                  <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowViewOptions(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                      {['Mois', 'Semaine', 'Liste'].map(view => (
                        <TouchableOpacity
                          key={view}
                          style={styles.modalOption}
                          onPress={() => {
                            setViewMode(view.toLowerCase());
                            setShowViewOptions(false);
                          }}
                        >
                          <Text style={{ color: colors.text }}>{view}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primaryButton }]}
                onPress={() => {
                  router.push('/create-event');
                }}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'mois' && (
            <>
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
                        {getEventCountForDate(day.date).length > 0 && (
                          <View style={styles.eventDotsContainer}>
                            {getEventCountForDate(day.date).map((event: any, i: number) => (
                              <View
                                key={i}
                                style={[
                                  styles.eventDot,
                                  { backgroundColor: event.category?.color || colors.tint }
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
                        {event.isAllDay
                          ? 'Toute la journée'
                          : event.startTime && event.endTime
                            ? `${event.startTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${event.endTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                            : event.date?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        }
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.noEventsText, { color: colors.textTertiary }]}>Aucun évènement à ce jour</Text>
                )}
              </View>
            </>
          )}

          {viewMode === 'liste' && renderListView()}
          {viewMode === 'semaine' && renderWeeklyView()}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
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
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 20,
  },
  calendarContainer: {
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
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
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
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  eventCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
  },
  noEventsText: {
    textAlign: 'center',
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
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 120,
    paddingRight: 20,
  },
  modalContent: {
    borderRadius: 10,
    padding: 10,
    width: 150,
  },
  modalOption: {
    paddingVertical: 10,
  },
  listViewContainer: {
    paddingBottom: 50,
  },
  dayGroup: {
    marginBottom: 20,
  },
  dayGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
});