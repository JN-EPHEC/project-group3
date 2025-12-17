import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamilies, signOut } from '../../constants/firebase';

const PRO_COLOR = '#2E5C6E'; // Teal/Blue accent color matching parent design
const PRO_SECONDARY = 'rgb(255, 206, 176)'; // Secondary accent

interface ClientFamily {
  familyId: string;
  familyName: string;
  parents: Array<{ uid: string; firstName: string; lastName?: string; email: string }>;
  lastActivity?: Date;
}

interface FamilyMember {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: string[];
  [key: string]: any;
}

interface EventData {
  id: string;
  title?: string;
  date?: any;
  startTime?: any;
  endTime?: any;
  location?: string;
  isAllDay?: boolean;
  familyId?: string;
  [key: string]: any;
}

interface ConversationData {
  id: string;
  participants?: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount?: { [key: string]: number };
  familyId?: string;
  [key: string]: any;
}

interface MessageData {
  id: string;
  otherUserName: string;
  otherUserId: string;
  unreadCount: number;
  lastMessage?: string;
  [key: string]: any;
}

export default function ProHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [events, setEvents] = useState<EventData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [clientFamilies, setClientFamilies] = useState<ClientFamily[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/(auth)/WelcomeScreen');
      return;
    }
    setUser(currentUser);
    const uid = currentUser.uid;

    const unsubUser = onSnapshot(doc(db, 'users', uid), (doc) => {
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
        } finally {
            setLoading(false);
        }
    };
    fetchFamilies();

    return () => unsubUser();
  }, [router]);

  useEffect(() => {
    if (families.length === 0) return;

    const familyIds = families.map(f => f.id);
    const eventsQuery = query(
        collection(db, 'events'),
        where('familyId', 'in', familyIds),
        orderBy('date', 'asc')
    );
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
        const now = new Date();
        const fetchedEvents: EventData[] = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as EventData))
            .filter((event) => event.date?.toDate() >= now)
            .sort((a, b) => (a.date?.toDate() || 0) - (b.date?.toDate() || 0));
        setEvents(fetchedEvents);
    });

    return () => unsubEvents();
  }, [families]);

  // Fetch client families grouped by family
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || families.length === 0) {
        setFamilyMembers([]);
        setMessages([]);
        setClientFamilies([]);
        return;
    };
    const uid = currentUser.uid;
    
    const allMemberIds = families.flatMap(f => f.members || []);
    const uniqueMemberIds = [...new Set(allMemberIds)].filter(id => id !== uid);
    
    let unsubMembers = () => {};
    if (uniqueMemberIds.length > 0) {
        const membersQuery = query(collection(db, 'users'), where('__name__', 'in', uniqueMemberIds));
        unsubMembers = onSnapshot(membersQuery, async (snapshot) => {
            const members: FamilyMember[] = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            setFamilyMembers(members);

            // Group members by family for client management view
            const familiesGrouped: ClientFamily[] = families.map(family => {
              const familyParents = members.filter((m: FamilyMember) => 
                family.members?.includes(m.uid) && 
                m.roles?.includes('parent')
              );
              
              return {
                familyId: family.id,
                familyName: family.name || `Famille ${family.id.substring(0, 8)}`,
                parents: familyParents.map((p: FamilyMember) => ({
                  uid: p.uid,
                  firstName: p.firstName || 'Prénom',
                  lastName: p.lastName || '',
                  email: p.email || ''
                }))
              };
            }).filter(f => f.parents.length > 0);

            setClientFamilies(familiesGrouped);
        });
    } else {
        setFamilyMembers([]);
        setClientFamilies([]);
    }

    const familyIds = families.map(f => f.id);
    const conversationsQuery = query(
        collection(db, 'conversations'),
        where('familyId', 'in', familyIds),
        where('participants', 'array-contains', uid),
        orderBy('lastMessageTime', 'desc')
    );
    const unsubConversations = onSnapshot(conversationsQuery, (snapshot) => {
        const conversations: ConversationData[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let totalUnread = 0;
        Promise.all(
            conversations.map(async (conv): Promise<MessageData | null> => {
              const otherUserId = conv.participants?.find((p: string) => p !== uid);
              if (!otherUserId) return null;

              const userDocRef = doc(db, 'users', otherUserId);
              const userDocSnap = await getDoc(userDocRef);
              const otherUserName = userDocSnap.exists() ? userDocSnap.data().firstName : 'Utilisateur';
              const unreadCount = conv.unreadCount ? conv.unreadCount[uid] || 0 : 0;

              totalUnread += unreadCount;

              if (unreadCount > 0) {
                return { 
                  id: conv.id,
                  otherUserName, 
                  otherUserId, 
                  unreadCount,
                  lastMessage: conv.lastMessage || ''
                };
              }
              return null;
            })
        ).then(conversationsWithDetails => {
            setMessages(conversationsWithDetails.filter((c): c is MessageData => c !== null));
            setUnreadCount(totalUnread);
        });
    });

    return () => {
        unsubMembers();
        unsubConversations();
    }
  }, [families]);

  const handleNewMessage = () => {
    if (familyMembers.length === 0) {
      return;
    }
    const otherMember = familyMembers[0];
    router.push({
      pathname: '/conversation',
      params: {
        otherUserId: otherMember.uid,
        otherUserName: `${otherMember.firstName} ${otherMember.lastName || ''}`
      }
    });
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/LoginScreen' as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={PRO_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  const displayedEvents = showAllEvents ? events : events.slice(0, 3);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: PRO_COLOR }]}>Dashboard Professionnel</Text>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>Bonjour {firstName}</Text>
            </View>
          </View>

          {/* Overview Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconCircle, { backgroundColor: PRO_COLOR + '20' }]}>
                <IconSymbol name="person.2.fill" size={24} color={PRO_COLOR} />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{clientFamilies.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Familles</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconCircle, { backgroundColor: PRO_COLOR + '20' }]}>
                <IconSymbol name="calendar.badge.clock" size={24} color={PRO_COLOR} />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{events.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Évènements</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconCircle, { backgroundColor: PRO_COLOR + '20' }]}>
                <IconSymbol name="envelope.badge.fill" size={24} color={PRO_COLOR} />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>{unreadCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Non lus</Text>
            </View>
          </View>

          {/* Client Management Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: PRO_COLOR }]}>Gestion des Clients</Text>
              <TouchableOpacity onPress={() => router.push('/Message')}>
                <Text style={[styles.viewAllLink, { color: PRO_COLOR }]}>Tout voir →</Text>
              </TouchableOpacity>
            </View>

            {clientFamilies.length > 0 ? (
              clientFamilies.slice(0, 4).map((family) => (
                <View 
                  key={family.familyId}
                  style={[styles.familyCard, { backgroundColor: colors.cardBackground }]}
                >
                  <View style={styles.familyHeader}>
                    <View style={[styles.familyIconCircle, { backgroundColor: PRO_COLOR + '15' }]}>
                      <IconSymbol name="house.fill" size={20} color={PRO_COLOR} />
                    </View>
                    <View style={styles.familyInfo}>
                      <Text style={[styles.familyName, { color: colors.text }]}>{family.familyName}</Text>
                      <Text style={[styles.familyId, { color: colors.textSecondary }]}>
                        ID: {family.familyId.substring(0, 8)}...
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.parentsContainer}>
                    {family.parents.map((parent, idx) => (
                      <TouchableOpacity
                        key={parent.uid}
                        style={styles.parentRow}
                        onPress={() => router.push({
                          pathname: '/conversation',
                          params: {
                            otherUserId: parent.uid,
                            otherUserName: `${parent.firstName} ${parent.lastName}`
                          }
                        })}
                      >
                        <View style={[styles.parentAvatar, { backgroundColor: PRO_COLOR + '30' }]}>
                          <Text style={[styles.parentInitial, { color: PRO_COLOR }]}>
                            {parent.firstName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.parentDetails}>
                          <Text style={[styles.parentName, { color: colors.text }]}>
                            {parent.firstName} {parent.lastName}
                          </Text>
                          <Text style={[styles.parentEmail, { color: colors.textSecondary }]}>
                            {parent.email}
                          </Text>
                        </View>
                        <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
                <IconSymbol name="person.2" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucune famille cliente pour le moment
                </Text>
              </View>
            )}
          </View>

          {/* Upcoming Events Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: PRO_COLOR }]}>Prochains Évènements</Text>
              <TouchableOpacity onPress={() => router.push('/Agenda')}>
                <Text style={[styles.viewAllLink, { color: PRO_COLOR }]}>Agenda →</Text>
              </TouchableOpacity>
            </View>

            {displayedEvents.length > 0 ? (
              <>
                {displayedEvents.map((event: any) => (
                  <TouchableOpacity 
                    key={event.id} 
                    style={[styles.eventCard, { backgroundColor: colors.cardBackground }]}
                    onPress={() => router.push({ pathname: '../event-details', params: { eventId: event.id } })}
                  >
                    <View style={[styles.eventDateBadge, { backgroundColor: PRO_COLOR + '20' }]}>
                      <Text style={[styles.eventDay, { color: PRO_COLOR }]}>
                        {event.date?.toDate().getDate()}
                      </Text>
                      <Text style={[styles.eventMonth, { color: PRO_COLOR }]}>
                        {event.date?.toDate().toLocaleDateString('fr-FR', { month: 'short' })}
                      </Text>
                    </View>
                    <View style={styles.eventDetails}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                      <View style={styles.eventMeta}>
                        {event.location && (
                          <View style={styles.eventMetaItem}>
                            <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                            <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>
                              {event.location}
                            </Text>
                          </View>
                        )}
                        <View style={styles.eventMetaItem}>
                          <IconSymbol name="clock.fill" size={14} color={colors.textSecondary} />
                          <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>
                            {event.isAllDay 
                              ? 'Toute la journée' 
                              : event.startTime?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                            }
                          </Text>
                        </View>
                      </View>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
                {events.length > 3 && (
                  <TouchableOpacity 
                    style={[styles.seeMoreButton, { backgroundColor: colors.secondaryCardBackground }]}
                    onPress={() => setShowAllEvents(!showAllEvents)}
                  >
                    <Text style={[styles.seeMoreText, { color: PRO_COLOR }]}>
                      {showAllEvents ? 'Voir moins' : 'Voir plus'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
                <IconSymbol name="calendar" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun évènement à venir
                </Text>
              </View>
            )}
          </View>

          {/* Inbox/Requests Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: PRO_COLOR }]}>Messagerie</Text>
              <TouchableOpacity onPress={() => router.push('/Message')}>
                <Text style={[styles.viewAllLink, { color: PRO_COLOR }]}>Messages →</Text>
              </TouchableOpacity>
            </View>

            {messages.length > 0 ? (
              messages.slice(0, 3).map((msg: any) => (
                <TouchableOpacity 
                  key={msg.id} 
                  style={[styles.messageCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push({ 
                    pathname: '/conversation', 
                    params: { 
                      conversationId: msg.id,
                      otherUserId: msg.otherUserId,
                      otherUserName: msg.otherUserName
                    } 
                  })}
                >
                  <View style={[styles.messageAvatar, { backgroundColor: PRO_COLOR + '30' }]}>
                    <Text style={[styles.messageInitial, { color: PRO_COLOR }]}>
                      {msg.otherUserName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.messageInfo}>
                    <Text style={[styles.messageSender, { color: colors.text }]}>{msg.otherUserName}</Text>
                    <Text 
                      style={[styles.messagePreview, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {msg.lastMessage}
                    </Text>
                  </View>
                  {msg.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: PRO_COLOR }]}>
                      <Text style={styles.unreadText}>{msg.unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
                <IconSymbol name="envelope" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun message non lu
                </Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1 
  },
  scrollView: { 
    flex: 1 
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.large,
    paddingTop: V_SPACING.large,
    paddingBottom: SAFE_BOTTOM_SPACING + 80,
  },
  containerCentered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: {
    marginBottom: V_SPACING.xlarge,
  },
  title: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '700',
    marginBottom: V_SPACING.tiny,
  },
  greeting: { 
    fontSize: FONT_SIZES.medium,
    marginTop: V_SPACING.tiny,
  },

  // Stats Cards
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: V_SPACING.xlarge,
    gap: SPACING.medium,
  },
  statCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.large,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: vs(4) },
    shadowRadius: hs(12),
    elevation: 3,
  },
  statIconCircle: {
    width: hs(48),
    height: hs(48),
    borderRadius: hs(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: V_SPACING.medium,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: '700',
    marginBottom: V_SPACING.tiny,
  },
  statLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '500',
  },

  // Section Styles
  section: { 
    marginBottom: V_SPACING.xxlarge 
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.regular,
  },
  sectionTitle: { 
    fontSize: FONT_SIZES.xlarge, 
    fontWeight: '700',
  },
  viewAllLink: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },

  // Family/Client Cards
  familyCard: {
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.large,
    marginBottom: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: V_SPACING.regular,
    paddingBottom: V_SPACING.regular,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  familyIconCircle: {
    width: hs(40),
    height: hs(40),
    borderRadius: hs(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.medium,
  },
  familyInfo: {
    flex: 1,
  },
  familyName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginBottom: V_SPACING.tiny,
  },
  familyId: {
    fontSize: FONT_SIZES.small,
  },
  parentsContainer: {
    gap: V_SPACING.medium,
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.medium,
  },
  parentAvatar: {
    width: hs(36),
    height: hs(36),
    borderRadius: hs(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  parentInitial: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  parentDetails: {
    flex: 1,
  },
  parentName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginBottom: V_SPACING.tiny,
  },
  parentEmail: {
    fontSize: FONT_SIZES.small,
  },

  // Event Cards
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.large,
    marginBottom: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  eventDateBadge: {
    width: hs(56),
    height: hs(56),
    borderRadius: BORDER_RADIUS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.large,
  },
  eventDay: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '700',
  },
  eventMonth: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginBottom: V_SPACING.small,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: SPACING.large,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
  },
  eventMetaText: {
    fontSize: FONT_SIZES.small,
  },

  // Message Cards
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.large,
    marginBottom: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  messageAvatar: {
    width: hs(44),
    height: hs(44),
    borderRadius: hs(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.medium,
  },
  messageInitial: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  messageInfo: {
    flex: 1,
  },
  messageSender: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginBottom: V_SPACING.tiny,
  },
  messagePreview: {
    fontSize: FONT_SIZES.small,
  },
  unreadBadge: {
    minWidth: hs(24),
    height: hs(24),
    borderRadius: hs(12),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
  },
  unreadText: {
    color: '#fff',
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
  },

  // Empty States
  emptyCard: {
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.xxlarge,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: vs(150),
  },
  emptyText: { 
    textAlign: 'center', 
    fontSize: FONT_SIZES.medium,
    marginTop: V_SPACING.medium,
  },

  // See More Button
  seeMoreButton: {
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: V_SPACING.medium,
    paddingHorizontal: SPACING.regular,
    alignItems: 'center',
    marginTop: V_SPACING.small,
  },
  seeMoreText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
});
