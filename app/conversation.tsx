import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { auth, db, getUserFamily } from '../constants/firebase';

export default function ConversationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { conversationId, otherUserId, otherUserName, otherUserPhotoURL } = useLocalSearchParams();
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    typeof conversationId === 'string' ? conversationId : null
  );
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [matchingIndices, setMatchingIndices] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;
  const storage = getStorage();

  useEffect(() => {
    const fetchOtherUserData = async () => {
      if (otherUserId) {
        try {
          const userDocRef = doc(db, 'users', String(otherUserId));
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setOtherUser(userDocSnap.data());
          }
        } catch (error) {
            console.error("Failed to fetch other user data:", error)
        }
      }
    };
    fetchOtherUserData();
  }, [otherUserId]);

  useEffect(() => {
    if (!currentUser || !otherUserId) return;

    const initConversation = async () => {
      try {
        let convId = currentConversationId;

        if (!convId) {
          // Cas 1: Conversation familiale (avec familyId)
          const userFamily = await getUserFamily(currentUser.uid);
          
          if (userFamily?.id) {
            const convQuery = query(
              collection(db, 'conversations'),
              where('familyId', '==', userFamily.id),
              where('participants', 'array-contains', currentUser.uid)
            );
            const convSnapshot = await getDocs(convQuery);
            
            const existingConv = convSnapshot.docs.find(doc => {
              const data = doc.data();
              return data.participants?.includes(otherUserId);
            });

            if (existingConv) {
              convId = existingConv.id;
            } else {
              // Créer une nouvelle conversation familiale
              const newConvRef = await addDoc(collection(db, 'conversations'), {
                familyId: userFamily.id,
                participants: [currentUser.uid, otherUserId],
                createdAt: serverTimestamp(),
                lastMessage: '',
                lastMessageTime: serverTimestamp(),
                unreadCount: {
                  [currentUser.uid]: 0,
                  [String(otherUserId)]: 0
                }
              });
              convId = newConvRef.id;
            }
          } else {
            // Cas 2: Conversation avec professionnel (sans familyId, avec professionalId)
            // Un parent ne doit avoir QU'UNE seule conversation avec un professionnel
            // Créer un ID de conversation unique et déterministe basé sur les deux IDs
            const uniqueConversationId = [currentUser.uid, otherUserId].sort().join('_');
            const convRef = doc(db, 'conversations', uniqueConversationId);
            const convSnap = await getDoc(convRef);

            if (!convSnap.exists()) {
              // Créer la conversation avec l'ID déterministe
              await setDoc(convRef, {
                conversationId: uniqueConversationId,
                participants: [currentUser.uid, otherUserId],
                parentId: currentUser.uid,
                professionalId: otherUserId,
                createdAt: serverTimestamp(),
                lastMessage: null,
                lastMessageTime: serverTimestamp()
              });
            }
            convId = uniqueConversationId;
          }
          
          if (convId) {
            setCurrentConversationId(convId);
          }
        }

        // Écouter les messages
        if (convId) {
          const messagesQuery = query(
            collection(db, 'conversations', convId, 'messages'),
            orderBy('timestamp', 'desc')
          );

          const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMessages(msgs);
            setLoading(false);
          });

          return () => unsubscribe();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setLoading(false);
      }
    };

    initConversation();
  }, [currentUser, otherUserId, currentConversationId]);

  // Marquer les messages comme lus uniquement après le chargement complet et l'affichage
  useEffect(() => {
    if (!currentUser || !currentConversationId || loading || messages.length === 0) {
      return;
    }

    // Attendre que la FlatList soit rendue avant de marquer comme lu
    const timeoutId = setTimeout(async () => {
      try {
        // Filtrer uniquement les messages reçus (pas les miens) qui ne sont pas encore lus
        const unreadMessages = messages.filter(msg => {
          const isFromOther = msg.senderId && msg.senderId !== currentUser.uid;
          const isNotRead = msg.status !== 'read';
          return isFromOther && isNotRead;
        });
        
        if (unreadMessages.length > 0) {
          // Marquer chaque message comme lu
          const updatePromises = unreadMessages.map(msg => 
            updateDoc(doc(db, 'conversations', currentConversationId, 'messages', msg.id), {
              status: 'read',
              readAt: serverTimestamp()
            })
          );
          
          await Promise.all(updatePromises);
          
          // Réinitialiser le compteur de messages non lus
          await updateDoc(doc(db, 'conversations', currentConversationId), {
            [`unreadCount.${currentUser.uid}`]: 0
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }, 1000); // Délai de 1 seconde pour s'assurer que l'utilisateur voit l'écran

    return () => clearTimeout(timeoutId);
  }, [currentUser, currentConversationId, loading, messages]);



  const executeSearch = () => {
    const query = searchQuery.trim();
    setActiveSearchQuery(query);

    if (query === '') {
        setMatchingIndices([]);
        setCurrentMatchIndex(null);
        return;
    }

    const lowercasedQuery = query.toLowerCase();
    const indices = messages.reduce((acc, message, index) => {
        if (message.text && message.text.toLowerCase().includes(lowercasedQuery)) {
            acc.push(index);
        }
        return acc;
    }, [] as number[]);

    const reversedIndices = indices.reverse();
    setMatchingIndices(reversedIndices);

    if (reversedIndices.length > 0) {
        setCurrentMatchIndex(0);
        flatListRef.current?.scrollToIndex({ index: reversedIndices[0], animated: true, viewPosition: 0.5 });
    } else {
        setCurrentMatchIndex(null);
        Alert.alert('Aucun résultat', 'Aucun message ne correspond à votre recherche.');
    }
  };

  const navigateToNextMatch = () => {
      if (currentMatchIndex === null || matchingIndices.length === 0) return;
      const nextIndex = (currentMatchIndex + 1) % matchingIndices.length;
      setCurrentMatchIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: matchingIndices[nextIndex], animated: true, viewPosition: 0.5 });
  };

  const navigateToPreviousMatch = () => {
      if (currentMatchIndex === null || matchingIndices.length === 0) return;
      const prevIndex = (currentMatchIndex - 1 + matchingIndices.length) % matchingIndices.length;
      setCurrentMatchIndex(prevIndex);
      flatListRef.current?.scrollToIndex({ index: matchingIndices[prevIndex], animated: true, viewPosition: 0.5 });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Désolé, nous avons besoin des permissions pour accéder à vos photos !');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImages(prevImages => [...prevImages, ...result.assets.map(a => a.uri)]);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        setSelectedFiles(prevFiles => [...prevFiles, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const removeSelectedImage = (uri: string) => {
    setSelectedImages(prevImages => prevImages.filter(imageUri => imageUri !== uri));
  };

  const removeSelectedFile = (uri: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file.uri !== uri));
  };
  
  const handleDownloadImage = async (uri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Désolé, nous avons besoin des permissions pour enregistrer l\'image !');
        return;
      }

      const fileUri = FileSystem.documentDirectory + `${Date.now()}.jpg`;
      const { uri: downloadedUri } = await FileSystem.downloadAsync(uri, fileUri);

      await MediaLibrary.saveToLibraryAsync(downloadedUri);
      Alert.alert('Image enregistrée', 'L\'image a été enregistrée dans votre galerie.');
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du téléchargement de l\'image.');
    }
  };

  const handleOpenFile = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load file", err));
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || !currentConversationId || !currentUser) return;

    const messageText = inputText.trim();
    const imagesToSend = [...selectedImages];
    const filesToSend = [...selectedFiles];
    
    setInputText('');
    setSelectedImages([]);
    setSelectedFiles([]);
    setSending(true);

    try {
      const imageUrls: string[] = [];
      if (imagesToSend.length > 0) {
        for (const imageUri of imagesToSend) {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          
          const filename = `conversations/${currentConversationId}/${Date.now()}.jpg`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);
          imageUrls.push(downloadURL);
        }
      }

      const fileUrls: {url: string, name: string, type: string}[] = [];
      if (filesToSend.length > 0) {
        for (const file of filesToSend) {
          let blob;
          if (file.file) {
            blob = file.file;
          } else {
            const response = await fetch(file.uri);
            blob = await response.blob();
          }
          
          const filename = `conversations/${currentConversationId}/files/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);
          fileUrls.push({
            url: downloadURL,
            name: file.name,
            type: file.mimeType || 'application/octet-stream'
          });
        }
      }

      const messageData: any = {
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        status: 'delivered',
      };

      let lastMessageText = '';
      let lastMessageType = '';

      if (imageUrls.length > 0) {
        messageData.imageUrls = imageUrls;
        messageData.type = 'image';
        lastMessageText = `📷 ${imageUrls.length} Photo(s)`;
        lastMessageType = 'image';
      }

      if (fileUrls.length > 0) {
        messageData.fileUrls = fileUrls;
        if (!messageData.type) {
          messageData.type = 'file';
          lastMessageText = `📎 ${fileUrls.length} Fichier(s)`;
          lastMessageType = 'file';
        } else {
          // If we have both images and files
          lastMessageText += ` + 📎 ${fileUrls.length} Fichier(s)`;
        }
      }
      
      if (messageText) {
        messageData.text = messageText;
        // If there's also an image, the type is already 'image', which is fine.
        // If not, it's 'text'
        if (!messageData.type) {
          messageData.type = 'text';
          lastMessageText = messageText;
          lastMessageType = 'text';
        }
      }

      await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), messageData);

      await updateDoc(doc(db, 'conversations', currentConversationId), {
        lastMessage: lastMessageText,
        lastMessageTime: serverTimestamp(),
        lastMessageType: lastMessageType,
        [`unreadCount.${otherUserId}`]: increment(1) 
      });

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isMe = item.senderId === currentUser?.uid;
    const isHighlighted = currentMatchIndex !== null && matchingIndices[currentMatchIndex] === index;
    
    return (
      <View style={[
        styles.messageContainer, 
        isMe ? { backgroundColor: colors.tint, borderBottomRightRadius: 4, alignSelf: 'flex-end' } : { backgroundColor: colors.cardBackground, borderBottomLeftRadius: 4, alignSelf: 'flex-start' },
        isHighlighted && styles.highlightedMessage
      ]}>
        {item.imageUrls && item.imageUrls.length > 0 && (
          <View style={styles.messageImagesContainer}>
            {item.imageUrls.map((url: string, index: number) => (
              <TouchableOpacity key={index} onPress={() => setFullScreenImage(url)}>
                <Image source={{ uri: url }} style={styles.messageImage} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {item.fileUrls && item.fileUrls.length > 0 && (
          <View style={styles.messageFilesContainer}>
            {item.fileUrls.map((file: any, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.fileAttachment, isMe ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : { backgroundColor: 'rgba(0,0,0,0.05)' }]}
                onPress={() => handleOpenFile(file.url)}
              >
                <IconSymbol name="note.text" size={20} color={isMe ? '#fff' : colors.text} />
                <Text style={[styles.fileName, isMe ? { color: '#fff' } : { color: colors.text }]} numberOfLines={1}>
                  {file.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {item.text && (
          <Text style={[styles.messageText, isMe ? { color: '#fff' } : { color: colors.text }]}>
            {item.text}
          </Text>
        )}
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isMe ? { color: 'rgba(255, 255, 255, 0.7)' } : { color: colors.textSecondary }]}>
            {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
          {isMe && (
            <View style={styles.statusContainer}>
              {item.status === 'sent' && (
                <Text style={styles.statusIcon}>✓</Text>
              )}
              {item.status === 'delivered' && (
                <Text style={styles.statusIcon}>✓✓</Text>
              )}
              {item.status === 'read' && (
                <Text style={styles.statusIconRead}>✓✓</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: 'none' }} />
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              onPress={() => {
                console.log('Back button pressed');
                router.back();
              }} 
              style={styles.backButton}
            >
              <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              {(otherUser?.photoURL || otherUser?.profileImage) ? (
                <Image source={{ uri: otherUser.photoURL || otherUser.profileImage }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, { backgroundColor: colors.tint }]}>
                  <Text style={styles.headerAvatarText}>
                    {((otherUser?.firstName?.[0] || otherUserName?.toString()[0]) || 'C').toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.headerName, { color: colors.text }]}>
                {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : (otherUserName || 'Co-parent')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSearchVisible(!searchVisible);
                if (searchVisible) {
                  setSearchQuery('');
                  setActiveSearchQuery('');
                  setMatchingIndices([]);
                  setCurrentMatchIndex(null);
                }
              }}
              style={styles.searchButton}
            >
              <IconSymbol name="magnifyingglass" size={24} color={colors.tint} />
            </TouchableOpacity>
          </View>

          {searchVisible && (
            <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                placeholder="Rechercher..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={executeSearch}
              />
              <TouchableOpacity onPress={executeSearch} style={styles.searchActionButton}>
                <IconSymbol name="magnifyingglass" size={22} color={colors.tint} />
              </TouchableOpacity>
              {activeSearchQuery && matchingIndices.length > 0 && (
                <>
                  <Text style={[styles.searchCounter, { color: colors.textSecondary }]}>
                    {currentMatchIndex !== null ? currentMatchIndex + 1 : 0}/{matchingIndices.length}
                  </Text>
                  <TouchableOpacity onPress={navigateToPreviousMatch} style={styles.searchNavButton}>
                    <IconSymbol name="chevron.up" size={22} color={colors.tint} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={navigateToNextMatch} style={styles.searchNavButton}>
                    <IconSymbol name="chevron.down" size={22} color={colors.tint} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item, index }) => renderMessage({ item, index })}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          {/* Image Preview */}
          {selectedImages.length > 0 && (
            <View style={[styles.previewContainer, { borderTopColor: colors.border }]}>
              <FlatList
                data={selectedImages}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <View style={styles.previewImageContainer}>
                    <Image source={{ uri: item }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeSelectedImage(item)}
                    >
                      <Text style={styles.removeImageButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}

          {/* File Preview */}
          {selectedFiles.length > 0 && (
            <View style={[styles.previewContainer, { borderTopColor: colors.border }]}>
              <FlatList
                data={selectedFiles}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => item.uri + index}
                renderItem={({ item }) => (
                  <View style={styles.previewFileContainer}>
                    <View style={[styles.previewFileIcon, { backgroundColor: colors.secondaryCardBackground }]}>
                      <IconSymbol name="note.text" size={24} color={colors.tint} />
                    </View>
                    <Text style={[styles.previewFileName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeSelectedFile(item.uri)}
                    >
                      <Text style={styles.removeImageButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}

          {/* Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.imageButton} onPress={handlePickImage} disabled={sending}>
              <IconSymbol name="photo" size={24} color={colors.tint} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={handlePickDocument} disabled={sending}>
              <IconSymbol name="paperclip" size={24} color={colors.tint} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
              placeholder="Message..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity 
              style={[styles.sendButton, { backgroundColor: colors.tint }, (!inputText.trim() && selectedImages.length === 0 && selectedFiles.length === 0 || sending) && styles.sendButtonDisabled]} 
              onPress={handleSendMessage}
              disabled={(!inputText.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || sending}
            >
              <IconSymbol name="paperplane.fill" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={!!fullScreenImage}
          onRequestClose={() => setFullScreenImage(null)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setFullScreenImage(null)}
            >
              <Text style={styles.modalCloseButtonText}>×</Text>
            </TouchableOpacity>
            
            <Image 
              source={{ uri: fullScreenImage }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            
            <TouchableOpacity 
              style={styles.downloadButton} 
              onPress={() => handleDownloadImage(fullScreenImage)}
            >
              <IconSymbol name="arrow.down.to.line" size={24} color="#fff" />
              <Text style={styles.downloadButtonText}>Télécharger</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0',
  },
  backButton: { 
    paddingRight: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 32,
    color: '#87CEEB',
    fontWeight: '300',
  },
  headerInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    maxWidth: '75%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#87CEEB',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#111',
  },
  messageImagesContainer: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  messageTime: {
    fontSize: 11,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    marginTop: 4,
  },
  statusContainer: {
    marginLeft: 4,
  },
  statusIcon: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  statusIconRead: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  imageButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  previewContainer: {
    padding: 8,
    borderTopWidth: 1,
  },
  previewImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 20,
  },
  previewFileContainer: {
    width: 100,
    marginRight: 8,
    alignItems: 'center',
    position: 'relative',
  },
  previewFileIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewFileName: {
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
  messageFilesContainer: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 4,
    width: '100%',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  fileName: {
    fontSize: 14,
    flex: 1,
  },
  // Styles for Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 35,
    fontWeight: '300',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  downloadButton: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    gap: 12,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  highlightedMessage: {
    borderColor: '#FFD700', // Gold color for highlight
    borderWidth: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  searchButton: {
    padding: 8,
  },
  searchActionButton: {
    padding: 6,
  },
  searchNavButton: {
    padding: 6,
  },
  searchCounter: {
    fontSize: 14,
    paddingHorizontal: 8,
  },
});
