import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

export default function MessageScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

          const messagesQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', uid),
            orderBy('lastMessageTimestamp', 'desc')
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          setConversations(messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
            <Text style={styles.title}>Messages</Text>
          </View>

          {/* New Message Button */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.newMessageButton}>
              <IconSymbol name="plus" size={20} color="#fff" />
              <Text style={styles.newMessageText}>Nouveau message</Text>
            </TouchableOpacity>
          </View>

          {/* Conversations List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Conversations</Text>
            {conversations.length > 0 ? (
              conversations.map((conv: any) => (
                <TouchableOpacity key={conv.id} style={styles.conversationCard}>
                  <View style={styles.avatarCircle}>
                    <IconSymbol name="person.fill" size={24} color="#87CEEB" />
                  </View>
                  <View style={styles.conversationDetails}>
                    <Text style={styles.conversationName}>
                      {conv.otherParentName || 'Co-parent'}
                    </Text>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {conv.lastMessage || 'Aucun message'}
                    </Text>
                  </View>
                  <View style={styles.conversationMeta}>
                    <Text style={styles.messageTime}>
                      {conv.lastMessageTimestamp?.toDate ? 
                        new Date(conv.lastMessageTimestamp.toDate()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
                        : ''}
                    </Text>
                    {conv.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{conv.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <IconSymbol name="message" size={48} color="#B0B0B0" />
                <Text style={styles.emptyText}>Aucune conversation</Text>
                <Text style={styles.emptySubtext}>
                  Commencez une conversation avec votre co-parent
                </Text>
              </View>
            )}
          </View>

          {/* Quick Tips */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Conseils de communication</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>
                💡 Restez courtois et factuel dans vos échanges. Une bonne communication facilite la co-parentalité.
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#87CEEB',
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
  newMessageButton: {
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
  newMessageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  conversationCard: {
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
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E7F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  conversationDetails: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  unreadBadge: {
    backgroundColor: '#87CEEB',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
