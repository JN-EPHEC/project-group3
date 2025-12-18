import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs, wp } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamilies } from '../../constants/firebase';

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
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('all');
  const flatListRef = React.useRef<FlatList>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const formatDateWithCapitalizedMonth = (date: Date, options: Intl.DateTimeFormatOptions) => {
    const parts = new Intl.DateTimeFormat('fr-FR', options).formatToParts(date);
    let result = '';
    for (const part of parts) {
      if (part.type === 'month') {
        result += part.value.charAt(0).toUpperCase() + part.value.slice(1);
      } else {
        result += part.value;
      }
    }
    return result;
  };
  
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/(auth)/WelcomeScreen');
      return;
    }
    setUser(currentUser);
    const uid = currentUser.uid;

    const userDocRef = doc(db, 'users', uid);
    const unsubUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setFirstName(doc.data().firstName || 'Utilisateur');
        }
    });

    const fetchFamilies = async () => {
        try {
            const userFamilies = await getUserFamilies(uid);
            const familiesWithData = await Promise.all(userFamilies.map(async (family) => {
                const familyDoc = await getDoc(doc(db, 'families', family.id));
                return familyDoc.exists() ? { ...family, ...familyDoc.data() } : family;
            }));
            setFamilies(familiesWithData);
        } catch (error) {
            console.error("Error fetching families:", error);
        }
    }
    fetchFamilies();

    return () => unsubUser();
  }, [router]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const uid = currentUser.uid;
    
    if (families.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    // Charger les événements personnels (rendez-vous avec professionnels)
    const personalEventsQuery = query(
      collection(db, 'events'),
      where('userId', '==', uid),
      orderBy('date', 'asc')
    );

    const unsubPersonal = onSnapshot(personalEventsQuery, (querySnapshot) => {
      const personalEvents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Charger aussi les événements familiaux
      let familyEventsQuery;
      if (selectedFamilyId === 'all') {
        const familyIds = families.map(f => f.id);
        if (familyIds.length > 0) {
          familyEventsQuery = query(
            collection(db, 'events'),
            where('familyId', 'in', familyIds),
            orderBy('date', 'asc')
          );
        }
      } else {
        familyEventsQuery = query(
          collection(db, 'events'),
          where('familyId', '==', selectedFamilyId),
          orderBy('date', 'asc')
        );
      }

      if (!familyEventsQuery) {
        setEvents(personalEvents);
        setLoading(false);
        return;
      }

      const unsubFamily = onSnapshot(familyEventsQuery, (familySnapshot) => {
        const familyEvents = familySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Combiner les événements personnels et familiaux (sans doublons)
        const allEvents = [...personalEvents, ...familyEvents];
        const uniqueEvents = allEvents.filter((event, index, self) => 
          index === self.findIndex(e => e.id === event.id)
        );
        
        setEvents(uniqueEvents);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching family events:", error);
        setEvents(personalEvents);
        setLoading(false);
      });

      unsubscribers.push(unsubFamily);
    }, (error) => {
      console.error("Error fetching personal events:", error);
      setLoading(false);
    });

    unsubscribers.push(unsubPersonal);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [families, selectedFamilyId]);

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
      const eventDate = formatDateWithCapitalizedMonth(event.date.toDate(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
                {event.location && <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>{event.location}</Text>}
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
              {formatDateWithCapitalizedMonth(currentWeek, { month: 'long', year: 'numeric' })}
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
            {formatDateWithCapitalizedMonth(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          {getEventsForSelectedDate().length > 0 ? (
            getEventsForSelectedDate().map((event: any) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => router.push(`/event-details?eventId=${event.id}`)}
              >
                <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                {event.location && <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>{event.location}</Text>}
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
            <Text style={[styles.title, { color: colors.tint }]}>Agenda</Text>
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
                <IconSymbol name="plus" size={hs(20)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.familySelectorContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                    style={[styles.familyChip, {backgroundColor: selectedFamilyId === 'all' ? colors.tint : colors.secondaryCardBackground}]}
                    onPress={() => setSelectedFamilyId('all')}
                >
                    <Text style={[styles.familyChipText, {color: selectedFamilyId === 'all' ? '#fff' : colors.text}]}>Toutes</Text>
                </TouchableOpacity>
                {families.map((family) => (
                    <TouchableOpacity
                        key={family.id}
                        style={[styles.familyChip, {backgroundColor: selectedFamilyId === family.id ? colors.tint : colors.secondaryCardBackground}]}
                        onPress={() => setSelectedFamilyId(family.id)}
                    >
                        <Text style={[styles.familyChipText, {color: selectedFamilyId === family.id ? '#fff' : colors.text}]}>{family.name || `Famille`}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
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
                    {formatDateWithCapitalizedMonth(currentMonth, { month: 'long', year: 'numeric' })}
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
                  {formatDateWithCapitalizedMonth(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>

                {selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map((event: any) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[styles.eventCard, { backgroundColor: colors.cardBackground }]}
                      onPress={() => router.push(`/event-details?eventId=${event.id}`)}
                    >
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                      {event.location && <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>{event.location}</Text>}
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
    paddingHorizontal: SPACING.large,
    paddingTop: V_SPACING.large,
    paddingBottom: SAFE_BOTTOM_SPACING,
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
    marginBottom: V_SPACING.xlarge,
    gap: SPACING.small,
  },
  title: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    flex: 0,
    flexShrink: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(6),
    flexShrink: 0,
  },
  familySelectorContainer: {
    marginBottom: V_SPACING.large,
  },
  familyChip: {
    paddingHorizontal: SPACING.large,
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.large,
    marginRight: SPACING.small,
  },
  familyChipText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  todayButton: {
    paddingHorizontal: hs(10),
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.medium,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  addButton: {
    width: hs(34),
    height: hs(34),
    borderRadius: hs(17),
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.regular,
    marginBottom: V_SPACING.xlarge,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.large,
  },
  navButton: {
    fontSize: FONT_SIZES.xxlarge,
    paddingHorizontal: SPACING.regular,
  },
  monthText: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: V_SPACING.medium,
  },
  weekDayText: {
    width: hs(40),
    textAlign: 'center',
    fontSize: FONT_SIZES.small,
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
    padding: vs(4),
  },
  dayCircle: {
    width: hs(36),
    height: hs(36),
    borderRadius: hs(18),
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
    fontSize: FONT_SIZES.regular,
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
    marginTop: V_SPACING.small,
  },
  eventsSectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    marginBottom: V_SPACING.regular,
    textTransform: 'capitalize',
  },
  eventCard: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    marginBottom: V_SPACING.medium,
  },
  eventTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginBottom: V_SPACING.tiny,
  },
  eventLocation: {
    fontSize: FONT_SIZES.regular,
    marginBottom: vs(2),
  },
  eventTime: {
    fontSize: FONT_SIZES.regular,
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: FONT_SIZES.regular,
    marginTop: V_SPACING.xlarge,
  },
  eventDotsContainer: {
    position: 'absolute',
    bottom: vs(2),
    flexDirection: 'row',
    gap: hs(3),
  },
  eventDot: {
    width: hs(4),
    height: hs(4),
    borderRadius: hs(2),
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: hs(10),
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.medium,
  },
  viewModeButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginRight: hs(3),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: vs(120),
    paddingRight: wp(5.3),
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.small,
    padding: SPACING.small,
    width: hs(150),
  },
  modalOption: {
    paddingVertical: vs(10),
  },
  listViewContainer: {
    paddingBottom: vs(50),
  },
  dayGroup: {
    marginBottom: V_SPACING.large,
  },
  dayGroupTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    marginBottom: V_SPACING.small,
    textTransform: 'capitalize',
  },
});