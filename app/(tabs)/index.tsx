import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, signOut } from '../../constants/firebase';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [events, setEvents] = useState<Array<{ id: string; [key: string]: any }>>([]);
  const [messages, setMessages] = useState<Array<{ id: string; [key: string]: any }>>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      const uid = currentUser.uid;

      const fetchData = async () => {
        try {
          // Fetch user's first name
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setFirstName(userDocSnap.data().firstName || 'Utilisateur');
          }

// Fetch upcoming events
          const eventsQuery = query(
            collection(db, 'events'),
            where('userID', '==', uid),
            where('date', '>=', new Date()),
            orderBy('date', 'asc'),
            limit(3)
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          setEvents(
            eventsSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as { id: string; [key: string]: any }[]
          );

          // Fetch recent messages
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
      router.replace('/(auth)/LoginScreen');
    }
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/LoginScreen');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.name}>{firstName || 'Maya'}</Text>
            </View>

            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
              <Image 
                source={require('../../ImageAndLogo/LogoWeKid.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Actions rapides</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#87CEEB' }]}>
                  <IconSymbol name="plus" size={24} color="#fff" />
                </View>
                <Text style={styles.quickCardText}>Nouvel évènement</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#87CEEB' }]}>
                  <IconSymbol name="message" size={24} color="#fff" />
                </View>
                <Text style={styles.quickCardText}>Nouveau message</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Upcoming Events */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Prochains évènements</Text>
            {events.length > 0 ? (
              events.map((event: any) => (
                <View key={event.id} style={styles.rowCard}>
                  <Text style={styles.rowCardText}>{event.title}</Text>
                </View>
              ))
            ) : (
              <View style={styles.rowCard}>
                <Text style={styles.emptyText}>Aucun évènement à venir</Text>
              </View>
            )}
          </View>

          {/* Recent Messages */}
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

          {/* Tip of the day */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Conseils du jour</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>
                La communication bienveillante avec votre ex-partenaires profite avant tout à votre enfant.
              </Text>
            </View>
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
  greeting: {
    fontSize: 14,
    color: '#9AA6B2',
  },
  name: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111',
    marginTop: 4,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickCardText: {
    fontWeight: '600',
    color: '#000',
    fontSize: 16,
  },
  rowCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 60,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  rowCardText: {
    color: '#666',
    fontSize: 15,
  },
  emptyText: {
    color: '#B0B0B0',
    textAlign: 'center',
    fontSize: 15,
  },
  tipCard: {
    backgroundColor: '#FFFACD',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  tipText: {
    color: '#000',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});