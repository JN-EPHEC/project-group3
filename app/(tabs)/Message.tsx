import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily } from '../../constants/firebase';

export default function MessageScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const colorScheme = useColorScheme();

  const fetchConversations = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const uid = currentUser.uid;
    try {
      // Récupérer la famille de l'utilisateur
      const userFamily = await getUserFamily(uid);
      
      if (userFamily?.id) {
        // Récupérer tous les membres de la famille
        const membersQuery = query(
          collection(db, 'users'),
          where('familyId', '==', userFamily.id)
        );
        const membersSnapshot = await getDocs(membersQuery);
        const members = membersSnapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() }))
          .filter((member: any) => member.uid !== uid);
        
        setFamilyMembers(members);

        // Récupérer les conversations
        const messagesQuery = query(
          collection(db, 'conversations'),
          where('familyId', '==', userFamily.id),
          where('participants', 'array-contains', uid),
          orderBy('lastMessageTime', 'desc')
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const convs = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setConversations(convs);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
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

          await fetchConversations();
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
  }, [router, fetchConversations]);

  const handleNewMessage = () => {
    if (familyMembers.length === 0) {
      return;
    }
    // S'il n'y a qu'un seul membre, ouvrir directement la conversation
    const otherMember = familyMembers[0];
    router.push({
      pathname: '/conversation',
      params: {
        otherUserId: otherMember.uid,
        otherUserName: `${otherMember.firstName} ${otherMember.lastName || ''}`
      }
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <View style={styles.headerButtons}>
            {familyMembers.length > 0 && (
              <TouchableOpacity 
                style={styles.newMessageButton}
                onPress={handleNewMessage}
              >
                <Text style={styles.newMessageButtonText}>Nouveau</Text>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Conversations List */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {conversations.length > 0 ? (
            conversations.map((conv: any) => {
              const otherParticipant = conv.participants?.find((p: string) => p !== user?.uid);
              const otherUserData = familyMembers.find((m: any) => m.uid === otherParticipant);
              
              return (
                <TouchableOpacity 
                  key={conv.id} 
                  style={styles.conversationCard}
                  onPress={() => router.push({
                    pathname: '/conversation',
                    params: {
                      conversationId: conv.id,
                      otherUserId: otherParticipant,
                      otherUserName: `${otherUserData?.firstName || 'Co-parent'} ${otherUserData?.lastName || ''}`
                    }
                  })}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {(otherUserData?.firstName?.[0] || 'C').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.conversationDetails}>
                    <View style={styles.conversationHeader}>
                      <Text style={styles.conversationName}>
                        {otherUserData?.firstName || 'Co-parent'} {otherUserData?.lastName || ''}
                      </Text>
                      <Text style={styles.messageTime}>
                        {formatTime(conv.lastMessageTime)}
                      </Text>
                    </View>
                    <View style={styles.lastMessageContainer}>
                      {conv.lastMessageType === 'image' ? (
                        <View style={styles.imageMessagePreview}>
                          <IconSymbol name="photo" size={16} color="#666" />
                          <Text style={styles.lastMessage}>Photo</Text>
                        </View>
                      ) : (
                        <Text style={styles.lastMessage} numberOfLines={1}>
                          {conv.lastMessage || 'Aucun message'}
                        </Text>
                      )}
                      {conv.unreadCount?.[user?.uid || ''] > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
                            {conv.unreadCount[user?.uid || '']}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <IconSymbol name="message" size={64} color="#B0B0B0" />
              <Text style={styles.emptyText}>Aucune conversation</Text>
              <Text style={styles.emptySubtext}>
                {familyMembers.length > 0 
                  ? 'Commencez une conversation avec votre co-parent'
                  : 'Aucun autre membre dans votre famille'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#87CEEB',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newMessageButton: {
    backgroundColor: '#E7F7FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newMessageButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonText: {
    fontSize: 24,
    color: '#87CEEB',
    fontWeight: '300',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  conversationDetails: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  imageMessagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#87CEEB',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
});
