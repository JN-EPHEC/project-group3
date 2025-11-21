import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
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

          const messagesQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', uid),
            orderBy('lastMessageTimestamp', 'desc'),
            limit(3)
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          setMessages(
            messagesSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as { id: string; [key: string]: any }[]
          );

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
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Messages récents</Text>
            {messages.length > 0 ? (
              messages.map((msg: any) => (
                <View key={msg.id} style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.rowCardText, { color: colors.textSecondary }]}>{msg.lastMessage}</Text>
                </View>
              ))
            ) : (
              <View style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun message récent</Text>
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
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
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
    marginBottom: 24,
  },
  greeting: { fontSize: 14 },
  name: { fontSize: 24, fontWeight: '600', marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  quickActionsRow: { flexDirection: 'row', gap: 12 },
  quickCard: { 
    flex: 1, 
    borderRadius: 8, 
    paddingVertical: 8, 
    paddingHorizontal: 6, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowRadius: 6, 
    elevation: 2 
  },
  plusIcon: {
    fontSize: 48,
    fontWeight: '300',
    lineHeight: 32,
    marginBottom: 6,
  },
  iconCircle: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  quickCardText: { 
    fontWeight: '500', 
    fontSize: 12 
  },
  rowCard: { borderRadius: 20, paddingVertical: 20, paddingHorizontal: 20, justifyContent: 'center', marginBottom: 12, minHeight: 60, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  rowCardText: { fontSize: 15, marginBottom: 8 },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCardDate: { fontSize: 13, fontWeight: '600' },
  eventTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: { textAlign: 'center', fontSize: 15 },
  tipCard: { borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
  tipText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  seeMoreButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
});