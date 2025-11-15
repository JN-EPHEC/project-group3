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
  const colorScheme = useColorScheme();

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

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/LoginScreen' as any);
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

  const displayedEvents = showAllEvents ? events : events.slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Accueil</Text>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.name}>{firstName || 'Maya'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Actions rapides</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickCard} onPress={() => router.push('../create-event')}>
                <View style={styles.iconCircle}>
                  <Image source={require('../../ImageAndLogo/newevent.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
                </View>
                <Text style={styles.quickCardText}>Nouvel évènement</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickCard}>
                <View style={styles.iconCircle}>
                  <Image source={require('../../ImageAndLogo/newmessage.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
                </View>
                <Text style={styles.quickCardText}>Nouveau message</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Prochains évènements</Text>
            {displayedEvents.length > 0 ? (
              <>
                {displayedEvents.map((event: any) => (
                  <TouchableOpacity 
                    key={event.id} 
                    style={styles.rowCard}
                    onPress={() => router.push({ pathname: '../event-details', params: { eventId: event.id } })}
                  >
                    <Text style={styles.rowCardText}>{event.title}</Text>
                    <View style={styles.eventMetaRow}>
                      <Text style={styles.rowCardDate}>
                        {event.date?.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.eventTime}>
                        {event.isAllDay ? 'Toute la journée' : event.date?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {events.length > 2 && (
                  <TouchableOpacity 
                    style={styles.seeMoreButton}
                    onPress={() => setShowAllEvents(!showAllEvents)}
                  >
                    <Text style={styles.seeMoreText}>
                      {showAllEvents ? 'Voir moins' : `Voir plus (${events.length - 2} autres)`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.rowCard}>
                <Text style={styles.emptyText}>Aucun évènement à venir</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Messages récents</Text>
            {messages.length > 0 ? (
              messages.map((msg: any) => (
                <View key={msg.id} style={styles.rowCard}>
                  <Text style={styles.rowCardText}>{msg.lastMessage}</Text>
                </View>
              ))
            ) : (
              <View style={styles.rowCard}>
                <Text style={styles.emptyText}>Aucun message récent</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Conseils du jour</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
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
    color: '#87CEEB',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  greeting: { fontSize: 14, color: '#9AA6B2' },
  name: { fontSize: 24, fontWeight: '600', color: '#111', marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  quickActionsRow: { flexDirection: 'row', gap: 12 },
  quickCard: { 
    flex: 1, 
    backgroundColor: '#E8E8E8', 
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
    color: '#000', 
    fontSize: 12 
  },
  rowCard: { backgroundColor: '#E8E8E8', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 20, justifyContent: 'center', marginBottom: 12, minHeight: 60, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  rowCardText: { color: '#666', fontSize: 15, marginBottom: 8 },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCardDate: { color: '#87CEEB', fontSize: 13, fontWeight: '600' },
  eventTime: {
    color: '#87CEEB',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: { color: '#B0B0B0', textAlign: 'center', fontSize: 15 },
  tipCard: { backgroundColor: '#FFFACD', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
  tipText: { color: '#000', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  seeMoreButton: {
    backgroundColor: '#E7F7FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  seeMoreText: {
    color: '#87CEEB',
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