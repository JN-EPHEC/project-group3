import { BORDER_RADIUS, FONT_SIZES, hs, rf, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs, wp } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily, signOut } from '../../constants/firebase';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [events, setEvents] = useState<Array<{ id: string; [key: string]: any }>>([]);
  const [messages, setMessages] = useState<Array<{ id: string; [key: string]: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
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
          where('familyId', '==', userFamily.id)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        
        const now = new Date();
        const fetchedEvents = eventsSnapshot.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter((event: any) => event.date?.toDate() >= now)
          .sort((a: any, b: any) => a.date?.toDate() - b.date?.toDate());
        
        setEvents(fetchedEvents);
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

          // Récupérer les membres de la famille
          const userFamily = await getUserFamily(uid);
          if (userFamily?.id) {
            const membersQuery = query(
              collection(db, 'users'),
              where('familyId', '==', userFamily.id)
            );
            const membersSnapshot = await getDocs(membersQuery);
            const members = membersSnapshot.docs
              .map(doc => ({ uid: doc.id, ...doc.data() }))
              .filter((member: any) => member.uid !== uid);
            
            setFamilyMembers(members);
          }

          if (userFamily?.id) {
            const conversationsQuery = query(
              collection(db, 'conversations'),
              where('familyId', '==', userFamily.id),
              where('participants', 'array-contains', uid),
              orderBy('lastMessageTime', 'desc')
            );
            const conversationsSnapshot = await getDocs(conversationsQuery);
            const conversations = conversationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const conversationsWithDetails = await Promise.all(
              conversations.map(async (conv) => {
                const otherUserId = conv.participants.find((p: string) => p !== uid);
                if (!otherUserId) return null;

                const userDocRef = doc(db, 'users', otherUserId);
                const userDocSnap = await getDoc(userDocRef);
                const otherUserName = userDocSnap.exists() ? userDocSnap.data().firstName : 'Utilisateur';

                const unreadCount = conv.unreadCount ? conv.unreadCount[uid] || 0 : 0;

                if (unreadCount > 0) {
                  return {
                    ...conv,
                    otherUserName,
                    otherUserId,
                    unreadCount
                  };
                }
                return null;
              })
            );
            
            setMessages(conversationsWithDetails.filter(c => c !== null) as any);
          } else {
            setMessages([]);
          }

        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else {
      router.replace('/(auth)/WelcomeScreen' as any);
    }
  }, [router, fetchEvents]);

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
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const displayedEvents = showAllEvents ? events : events.slice(0, 2);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.tint }]}>Accueil</Text>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={[styles.greeting, { color: colors.textTertiary }]}>Bonjour {firstName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Actions rapides</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={[styles.quickCard, { backgroundColor: colors.cardBackground }]} onPress={() => router.push('../create-event')}>
                <Text style={[styles.plusIcon, { color: '#B0D7FF' }]}>+</Text>
                <Text style={[styles.quickCardText, { color: colors.text }]}>Nouvel évènement</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.quickCard, { backgroundColor: colors.cardBackground }]} 
                onPress={handleNewMessage}
                disabled={familyMembers.length === 0}
              >
                <View style={styles.iconCircle}>
                  <Image source={require('../../ImageAndLogo/newmessage.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
                </View>
                <Text style={[styles.quickCardText, { color: colors.text }]}>Nouveau message</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Prochains évènements</Text>
            {displayedEvents.length > 0 ? (
              <>
                {displayedEvents.map((event: any) => (
                  <TouchableOpacity 
                    key={event.id} 
                    style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}
                    onPress={() => router.push({ pathname: '../event-details', params: { eventId: event.id } })}
                  >
                    <Text style={[styles.rowCardText, { color: colors.textSecondary }]}>{event.title}</Text>
                    <View style={styles.eventMetaRow}>
                      {event.location ? <Text style={[styles.eventLocation, { color: colors.tint }]}>{event.location}</Text> : null}
                      <Text style={[styles.rowCardDate, { color: colors.tint }]}>
                        {event.date?.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={[styles.eventTime, { color: colors.tint }]}>
                        {event.isAllDay 
                          ? 'Toute la journée' 
                          : event.startTime && event.endTime
                            ? `${event.startTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${event.endTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                            : event.date?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {events.length > 2 && (
                  <TouchableOpacity 
                    style={[styles.seeMoreButton, { backgroundColor: colors.secondaryCardBackground }]}
                    onPress={() => setShowAllEvents(!showAllEvents)}
                  >
                    <Text style={[styles.seeMoreText, { color: colors.tint }]}>
                      {showAllEvents ? 'Voir moins' : `Voir plus (${events.length - 2} autres)`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun évènement à venir</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Messages non lus</Text>
            {messages.length > 0 ? (
              messages.map((msg: any) => (
                <TouchableOpacity 
                  key={msg.id} 
                  style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push({ 
                    pathname: '/conversation', 
                    params: { 
                      conversationId: msg.id,
                      otherUserId: msg.otherUserId,
                      otherUserName: msg.otherUserName
                    } 
                  })}
                >
                  <View style={styles.messageContent}>
                    <View>
                      <Text style={[styles.messageSender, { color: colors.text }]}>{msg.otherUserName}</Text>
                      <Text style={[styles.rowCardText, { color: colors.textSecondary, marginTop: 4 }]}>{msg.lastMessage}</Text>
                    </View>
                    {msg.unreadCount > 0 && (
                       <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
                        <Text style={styles.unreadText}>{msg.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun message non lu</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Conseils du jour</Text>
            <View style={[styles.tipCard, { backgroundColor: colors.tipCardBackground }]}>
              <Text style={[styles.tipText, { color: colors.text }]}>
                La communication bienveillante avec votre ex-partenaire profite avant tout à votre enfant.
              </Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.large,
    paddingTop: 18,
    paddingBottom: SAFE_BOTTOM_SPACING,
  },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  welcomeSection: {
    marginBottom: V_SPACING.xlarge,
  },
  greeting: { fontSize: FONT_SIZES.regular },
  name: { fontSize: FONT_SIZES.xxlarge, fontWeight: '600', marginTop: V_SPACING.tiny },
  section: { marginBottom: V_SPACING.xxlarge },
  sectionTitle: { fontSize: FONT_SIZES.xlarge, fontWeight: '600', marginBottom: V_SPACING.regular },
  quickActionsRow: { flexDirection: 'row', gap: SPACING.medium },
  quickCard: { 
    flex: 1, 
    borderRadius: BORDER_RADIUS.small, 
    paddingVertical: vs(8), 
    paddingHorizontal: wp(1.6), 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowOffset: { width: 0, height: vs(2) }, 
    shadowRadius: hs(6), 
    elevation: 2 
  },
  plusIcon: {
    fontSize: rf(48),
    fontWeight: '300',
    lineHeight: vs(32),
    marginBottom: V_SPACING.tiny,
  },
  iconCircle: { 
    width: hs(32), 
    height: hs(32), 
    borderRadius: hs(8), 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: V_SPACING.tiny 
  },
  quickCardText: { 
    fontWeight: '500', 
    fontSize: FONT_SIZES.small 
  },
  rowCard: { borderRadius: BORDER_RADIUS.large, paddingVertical: V_SPACING.large, paddingHorizontal: SPACING.large, justifyContent: 'center', marginBottom: V_SPACING.medium, minHeight: vs(60), shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: vs(2) }, shadowRadius: hs(8), elevation: 2 },
  rowCardText: { fontSize: FONT_SIZES.regular, marginBottom: V_SPACING.small },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.medium,
  },
  rowCardDate: { fontSize: FONT_SIZES.small, fontWeight: '600' },
  eventLocation: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  emptyText: { textAlign: 'center', fontSize: FONT_SIZES.regular },
  tipCard: { borderRadius: BORDER_RADIUS.large, padding: SPACING.xlarge, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: vs(4) }, shadowRadius: hs(10), elevation: 2 },
  tipText: { fontSize: FONT_SIZES.regular, textAlign: 'center', lineHeight: vs(22) },
  seeMoreButton: {
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: V_SPACING.medium,
    paddingHorizontal: SPACING.regular,
    alignItems: 'center',
    marginTop: V_SPACING.small,
  },
  seeMoreText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  eventContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.tiny,
  },
  messageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageSender: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  unreadBadge: {
    width: hs(24),
    height: hs(24),
    borderRadius: hs(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.medium,
  },
  unreadText: {
    color: '#fff',
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
});