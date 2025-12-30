import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs, wp } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamilies, hideConversationForUser } from '../../constants/firebase';

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
  const [professionalProfiles, setProfessionalProfiles] = useState<Record<string, any>>({});
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/(auth)/LoginScreen');
      return;
    }
    setUser(currentUser);
    const uid = currentUser.uid;

    const unsubUser = onSnapshot(doc(db, 'users', uid), (doc) => {
      if (doc.exists()) {
        setFirstName(doc.data().firstName || 'Utilisateur');
      }
    });

    let unsubConversations = () => {};
    let unsubMembers = () => {};

    const setupListeners = async () => {
        setLoading(true);
        try {
            const userFamilies = await getUserFamilies(uid);
            if (userFamilies && userFamilies.length > 0) {
                const allMemberIds = userFamilies.flatMap((f: any) => f.members || []);
                const uniqueMemberIds = [...new Set(allMemberIds)].filter(id => id !== uid);

                if (uniqueMemberIds.length > 0) {
                    const membersQuery = query(collection(db, 'users'), where('__name__', 'in', uniqueMemberIds));
                    unsubMembers = onSnapshot(membersQuery, (snapshot) => {
                        const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
                        setFamilyMembers(members);
                    });
                } else {
                    setFamilyMembers([]);
                }
                
                const familyIds = userFamilies.map(f => f.id);
                
                // Charger les conversations familiales et les conversations avec professionnels
                let unsubscribers = [];
                
                // 1. Conversations familiales UNIQUEMENT (sans professionalId pour éviter mélange avec rôle pro)
                const familyConversationsQuery = query(
                    collection(db, 'conversations'),
                    where('familyId', 'in', familyIds),
                    where('participants', 'array-contains', uid),
                    orderBy('lastMessageTime', 'desc')
                );
                
                // 2. Conversations avec professionnels (propres à cet utilisateur)
                const professionalConversationsQuery = query(
                    collection(db, 'conversations'),
                    where('participants', 'array-contains', uid),
                    where('professionalId', '!=', null),
                    orderBy('lastMessageTime', 'desc')
                );
                
                let familyConvs: any[] = [];
                let professionalConvs: any[] = [];

                const fetchProfessionalProfiles = async (convs: any[]) => {
                  const professionalIds = new Set<string>();
                  convs.forEach((conv) => {
                    if (conv.professionalId) {
                      professionalIds.add(conv.professionalId);
                    }
                  });

                  if (professionalIds.size === 0) {
                    setProfessionalProfiles({});
                    return;
                  }

                  const allIds = Array.from(professionalIds);
                  const profiles: Record<string, any> = {};
                  
                  for (const proId of allIds) {
                    try {
                      const proDocRef = doc(db, 'professionals', proId);
                      const proDocSnap = await import('firebase/firestore').then(m => m.getDoc(proDocRef));
                      if (proDocSnap.exists()) {
                        profiles[proId] = proDocSnap.data();
                      }
                    } catch (err) {
                      console.error(`Error fetching professional ${proId}:`, err);
                    }
                  }
                  
                  setProfessionalProfiles(profiles);
                };
                
                const unsubFamily = onSnapshot(familyConversationsQuery, (snapshot) => {
                    const rawFamilyConvs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    console.log('[MessageScreen] Conversations familiales brutes:', rawFamilyConvs.length);
                    
                    familyConvs = rawFamilyConvs
                        // FILTRE: exclure les conversations avec un professionalId dans l'interface parent
                        .filter(conv => !conv.professionalId)
                        // FILTRE: exclure les conversations masquées par cet utilisateur
                        .filter(conv => {
                            const isHidden = conv.hiddenFor && conv.hiddenFor.includes(uid);
                            if (isHidden) {
                                console.log('[MessageScreen] Conversation masquée:', conv.id, 'hiddenFor:', conv.hiddenFor);
                            }
                            return !isHidden;
                        });
                    console.log('[MessageScreen] Conversations familiales filtrées:', familyConvs.length);
                    // Combiner et mettre à jour
                    const allConvs = [...familyConvs, ...professionalConvs];
                    setConversations(allConvs);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching family conversations:", error);
                    // Continuer avec les conversations existantes
                    const allConvs = [...familyConvs, ...professionalConvs];
                    if (allConvs.length > 0) {
                        setConversations(allConvs);
                    }
                });
                
                const unsubProfessional = onSnapshot(professionalConversationsQuery, async (snapshot) => {
                    const rawProfessionalConvs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    console.log('[MessageScreen] Conversations professionnelles brutes:', rawProfessionalConvs.length);
                    
                    professionalConvs = rawProfessionalConvs
                        // FILTRE: exclure les conversations masquées par cet utilisateur
                        .filter(conv => {
                            const isHidden = conv.hiddenFor && conv.hiddenFor.includes(uid);
                            if (isHidden) {
                                console.log('[MessageScreen] Conversation masquée (pro):', conv.id, 'hiddenFor:', conv.hiddenFor);
                            }
                            return !isHidden;
                        });
                    console.log('[MessageScreen] Conversations professionnelles filtrées:', professionalConvs.length);
                    // Combiner et mettre à jour
                    const allConvs = [...familyConvs, ...professionalConvs];
                    setConversations(allConvs);
                    setLoading(false);
                    // Fetch professional profiles
                    await fetchProfessionalProfiles(professionalConvs);
                }, (error) => {
                    console.error("Error fetching professional conversations:", error);
                    // Continuer avec les conversations existantes
                    const allConvs = [...familyConvs, ...professionalConvs];
                    if (allConvs.length > 0) {
                        setConversations(allConvs);
                    }
                });
                
                unsubConversations = () => {
                    unsubFamily();
                    unsubProfessional();
                };
            } else {
                setLoading(false);
                setFamilyMembers([]);
                setConversations([]);
            }
        } catch (error) {
            console.error("Error setting up listeners:", error);
            setLoading(false);
        }
    };

    setupListeners();

    return () => {
      unsubUser();
      unsubConversations();
      unsubMembers();
    };
  }, [router]);

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
      // Dans cette vue, on doit pouvoir choisir n'importe quel membre de la famille pour démarrer une conversation
      // On synchronise donc directement avec la liste des membres disponibles (hors soi-même déjà filtré en amont)
      setMembersWithoutConversation(familyMembers);
    }
  }, [familyMembers, user]);

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

  const handleDeleteConversation = (conversationId: string, displayName: string) => {
    Alert.alert(
      'Supprimer la conversation',
      `Êtes-vous sûr de vouloir supprimer la conversation avec ${displayName}? Cette action ne peut pas être annulée.`,
      [
        {
          text: 'Annuler',
          onPress: () => {},
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              if (!user?.uid) return;
              await hideConversationForUser(conversationId, user.uid);
              // La conversation sera automatiquement filtrée par les listeners
              Alert.alert('Succès', 'La conversation a été supprimée de votre vue');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la conversation');
            }
          },
          style: 'destructive'
        }
      ]
    );
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
                      {familyMembers.length > 0 && (
                        <TouchableOpacity 
                          style={[styles.addButton, { backgroundColor: colors.primaryButton }]}
                          onPress={handleNewMessage}
                        >
                          <Text style={styles.addButtonText}>+</Text>
                        </TouchableOpacity>
                      )}
                    </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {conversations.length > 0 ? (
            conversations.map((conv: any) => {
              // Vérifier si c'est une conversation avec un professionnel
              const isProfessionalConversation = conv.professionalId;
              
              let otherParticipant: string | undefined;
              let displayName: string;
              let displayImage: string | undefined;
              
              if (isProfessionalConversation) {
                // Conversation avec professionnel
                displayName = conv.professionalName || 'Professionnel';
                // Chercher la photo du professionnel dans les profils chargés ou dans la conversation
                const proProfile = professionalProfiles[conv.professionalId || ''];
                displayImage = proProfile?.photoUrl || conv.professionalPhotoUrl || conv.professionalPhotoURL;
              } else {
                // Conversation familiale
                otherParticipant = conv.participants?.find((p: string) => p !== user?.uid);
                const otherUserData = familyMembers.find((m: any) => m.uid === otherParticipant);
                displayName = `${otherUserData?.firstName || 'Co-parent'} ${otherUserData?.lastName || ''}`;
                displayImage = otherUserData?.photoURL || otherUserData?.profileImage;
              }
              
              return (
                <TouchableOpacity 
                  key={conv.id} 
                  style={[styles.conversationCard, { borderBottomColor: colors.border }]}
                  onPress={() => router.push({
                    pathname: '/conversation',
                    params: {
                      conversationId: conv.id,
                      otherUserId: isProfessionalConversation ? conv.professionalId : otherParticipant,
                      otherUserName: displayName,
                      otherUserPhotoURL: displayImage,
                      isProfessionalConversation: isProfessionalConversation
                    }
                  })}
                >
                  {displayImage ? (
                    <Image source={{ uri: displayImage }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarCircle, { backgroundColor: colors.tint }]}>
                      <Text style={styles.avatarText}>
                        {(displayName?.[0] || 'C').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.conversationDetails}>
                    <View style={styles.conversationHeader}>
                      <Text style={[styles.conversationName, { color: colors.text }]}>
                        {displayName}
                      </Text>
                      <View style={styles.rightSection}>
                        <Text style={[styles.messageTime, { color: colors.textTertiary }]}>
                          {formatTime(conv.lastMessageTime)}
                        </Text>
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDeleteConversation(conv.id, displayName)}
                        >
                          <IconSymbol name="trash" size={18} color="#FF6B6B" />
                        </TouchableOpacity>
                      </View>
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
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  messageTime: {
    fontSize: FONT_SIZES.small,
  },
  deleteButton: {
    padding: SPACING.tiny,
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
