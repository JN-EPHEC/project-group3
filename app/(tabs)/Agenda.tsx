import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

export default function AgendaScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [events, setEvents] = useState([]);
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
      router.replace('/(auth)/LoginScreen');
    }
  }, [router]);

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
              <Text style={styles.greeting}>Agenda</Text>
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

          {/* Add Event Button */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.addButton}>
              <IconSymbol name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Ajouter un évènement</Text>
            </TouchableOpacity>
          </View>

          {/* Events List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Tous les évènements</Text>
            {events.length > 0 ? (
              events.map((event: any) => (
                <TouchableOpacity key={event.id} style={styles.eventCard}>
                  <View style={styles.eventDateCircle}>
                    <Text style={styles.eventDateText}>
                      {new Date(event.date?.toDate()).getDate()}
                    </Text>
                    <Text style={styles.eventMonthText}>
                      {new Date(event.date?.toDate()).toLocaleDateString('fr-FR', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(event.date?.toDate()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.rowCard}>
                <Text style={styles.emptyText}>Aucun évènement programmé</Text>
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
  addButton: {
    backgroundColor: '#87CEEB',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  eventCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  eventDateCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  eventDateText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  eventMonthText: {
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
  },
  eventDetails: {
    flex: 1,
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
  rowCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    minHeight: 60,
  },
  emptyText: {
    color: '#B0B0B0',
    textAlign: 'center',
    fontSize: 15,
  },
});
