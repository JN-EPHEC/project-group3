import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs, wp } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { auth, db, getUserFamily } from '../../constants/firebase';

export default function MessageScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [membersWithoutConversation, setMembersWithoutConversation] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fetchConversations = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const uid = currentUser.uid;
    try {
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

        const messagesQuery = query(
          collection(db, 'conversations'),
          where('familyId', '==', userFamily.id),
          where('participants', 'array-contains', uid),
          orderBy('lastMessageTime', 'desc')
        );
        
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const convs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setConversations(convs);
        });

        return unsubscribe;
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = fetchConversations();
      return () => {
        if (unsubscribe && typeof unsubscribe.then === 'function') {
          unsubscribe.then((unsub: any) => unsub && unsub());
        }
      };
    }, [fetchConversations])
  );

  useEffect(() => {
    if (user?.uid) {
      const total = conversations.reduce((sum, conv) => {
        return sum + (conv.unreadCount?.[user.uid] || 0);
      }, 0);
      setTotalUnreadCount(total);
    }
  }, [conversations, user]);

  useEffect(() => {
    if (user?.uid) {
      const membersWithConversation = new Set(
        conversations.map(conv => conv.participants.find((p: string) => p !== user.uid)).filter(Boolean)
      );
      const membersWithout = familyMembers.filter(member => !membersWithConversation.has(member.uid));
      setMembersWithoutConversation(membersWithout);
    }
  }, [conversations, familyMembers, user]);

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
    setIsModalVisible(true);
  };

  const onSelectMember = (member: any) => {
    setIsModalVisible(false);
    router.push({
      pathname: '/conversation',
      params: {
        otherUserId: member.uid,
        otherUserName: `${member.firstName} ${member.lastName || ''}`
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.tint }]}>Messages</Text>
          <View style={styles.headerButtons}>
                      {membersWithoutConversation.length > 0 && (
                        <TouchableOpacity 
                          style={[styles.addButton, { backgroundColor: colors.primaryButton }]}
                          onPress={handleNewMessage}
                        >
                          <Text style={styles.addButtonText}>+</Text>
                        </TouchableOpacity>
                      )}          </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {conversations.length > 0 ? (
            conversations.map((conv: any) => {
              const otherParticipant = conv.participants?.find((p: string) => p !== user?.uid);
              const otherUserData = familyMembers.find((m: any) => m.uid === otherParticipant);
              
              return (
                <TouchableOpacity 
                  key={conv.id} 
                  style={[styles.conversationCard, { borderBottomColor: colors.border }]}
                  onPress={() => router.push({
                    pathname: '/conversation',
                    params: {
                      conversationId: conv.id,
                      otherUserId: otherParticipant,
                      otherUserName: `${otherUserData?.firstName || 'Co-parent'} ${otherUserData?.lastName || ''}`,
                      otherUserPhotoURL: otherUserData?.photoURL || otherUserData?.profileImage
                    }
                  })}
                >
                  {(otherUserData?.photoURL || otherUserData?.profileImage) ? (
                    <Image source={{ uri: otherUserData.photoURL || otherUserData.profileImage }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarCircle, { backgroundColor: colors.tint }]}>
                      <Text style={styles.avatarText}>
                        {(otherUserData?.firstName?.[0] || 'C').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.conversationDetails}>
                    <View style={styles.conversationHeader}>
                      <Text style={[styles.conversationName, { color: colors.text }]}>
                        {otherUserData?.firstName || 'Co-parent'} {otherUserData?.lastName || ''}
                      </Text>
                      <Text style={[styles.messageTime, { color: colors.textTertiary }]}>
                        {formatTime(conv.lastMessageTime)}
                      </Text>
                    </View>
                    <View style={styles.lastMessageContainer}>
                      {conv.lastMessageType === 'image' ? (
                        <View style={styles.imageMessagePreview}>
                          <IconSymbol name="photo" size={16} color={colors.textSecondary} />
                          <Text style={[styles.lastMessage, { color: colors.textSecondary }]}>Photo</Text>
                        </View>
                      ) : (
                        <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                          {conv.lastMessage || 'Aucun message'}
                        </Text>
                      )}
                      {conv.unreadCount?.[user?.uid || ''] > 0 && (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
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
              <IconSymbol name="message" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune conversation</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {familyMembers.length > 0 
                  ? 'Commencez une conversation avec votre co-parent'
                  : 'Aucun autre membre dans votre famille'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Démarrer une conversation</Text>
            <ScrollView>
              {membersWithoutConversation.map((member) => (
                <TouchableOpacity
                  key={member.uid}
                  style={styles.memberItem}
                  onPress={() => onSelectMember(member)}
                >
                  {member.photoURL || member.profileImage ? (
                    <Image source={{ uri: member.photoURL || member.profileImage }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarCircle, { backgroundColor: colors.tint, marginRight: SPACING.regular, }]}>
                      <Text style={styles.avatarText}>
                        {(member.firstName?.[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.firstName} {member.lastName || ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
              <Text style={{ color: colors.tint }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.large,
    paddingTop: V_SPACING.large,
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
    marginBottom: V_SPACING.large,
  },
  title: {
    fontSize: FONT_SIZES.huge,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    paddingHorizontal: SPACING.medium,
    paddingTop: vs(6),
    paddingBottom: vs(10),
    borderRadius: BORDER_RADIUS.large,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: FONT_SIZES.xxlarge,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: vs(20),
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: SAFE_BOTTOM_SPACING,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: V_SPACING.medium,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: hs(56),
    height: hs(56),
    borderRadius: hs(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.medium,
  },
  avatarImage: {
    width: hs(56),
    height: hs(56),
    borderRadius: hs(28),
    marginRight: SPACING.medium,
  },
  avatarText: {
    fontSize: FONT_SIZES.xlarge,
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
    marginBottom: V_SPACING.tiny,
  },
  conversationName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: FONT_SIZES.small,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: FONT_SIZES.regular,
    flex: 1,
  },
  imageMessagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
    flex: 1,
  },
  unreadBadge: {
    borderRadius: hs(10),
    minWidth: hs(20),
    height: hs(20),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.tiny,
    marginLeft: SPACING.small,
  },
  unreadText: {
    color: '#fff',
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(80),
  },
  emptyText: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    marginTop: V_SPACING.regular,
    marginBottom: V_SPACING.small,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.regular,
    textAlign: 'center',
    paddingHorizontal: wp(10.7),
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: BORDER_RADIUS.large,
    borderTopRightRadius: BORDER_RADIUS.large,
    padding: SPACING.large,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '700',
    marginBottom: V_SPACING.large,
    textAlign: 'center',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: V_SPACING.medium,
  },
  memberName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: V_SPACING.large,
    alignItems: 'center',
  }
});
