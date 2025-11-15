import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily, storage } from '../constants/firebase';

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId, otherUserId, otherUserName } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    typeof conversationId === 'string' ? conversationId : null
  );
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || !otherUserId) return;

    const initConversation = async () => {
      try {
        const userFamily = await getUserFamily(currentUser.uid);
        if (!userFamily?.id) return;

        let convId = currentConversationId;

        if (!convId) {
          // Chercher une conversation existante
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
            // Créer une nouvelle conversation
            const newConvRef = await addDoc(collection(db, 'conversations'), {
              familyId: userFamily.id,
              participants: [currentUser.uid, otherUserId],
              createdAt: serverTimestamp(),
              lastMessage: '',
              lastMessageTime: serverTimestamp(),
              unreadCount: {
                [currentUser.uid]: 0,
                [otherUserId]: 0
              }
            });
            convId = newConvRef.id;
          }
          
          setCurrentConversationId(convId);
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

            // Marquer comme lu
            if (msgs.length > 0 && convId) {
              updateDoc(doc(db, 'conversations', convId), {
                [`unreadCount.${currentUser.uid}`]: 0
              });
            }
          });

          return () => unsubscribe();
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setLoading(false);
      }
    };

    initConversation();
  }, [currentUser, otherUserId, currentConversationId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentConversationId || !currentUser) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), {
        text: messageText,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        type: 'text'
      });

      await updateDoc(doc(db, 'conversations', currentConversationId), {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastMessageType: 'text',
        [`unreadCount.${otherUserId}`]: 1
      });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Désolé, nous avons besoin des permissions pour accéder à vos photos !');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && currentConversationId && currentUser) {
      setSending(true);
      try {
        const imageUri = result.assets[0].uri;
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        const filename = `conversations/${currentConversationId}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), {
          imageUrl: downloadURL,
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
          type: 'image'
        });

        await updateDoc(doc(db, 'conversations', currentConversationId), {
          lastMessage: 'Photo',
          lastMessageTime: serverTimestamp(),
          lastMessageType: 'image',
          [`unreadCount.${otherUserId}`]: 1
        });
      } catch (error) {
        console.error('Error uploading image:', error);
      } finally {
        setSending(false);
      }
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUser?.uid;
    
    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
        {item.type === 'image' ? (
          <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
        ) : (
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
        )}
        <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
          {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: 'none' }} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#87CEEB" />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => {
                console.log('Back button pressed');
                router.back();
              }} 
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>
                  {otherUserName?.toString()[0]?.toUpperCase() || 'C'}
                </Text>
              </View>
              <Text style={styles.headerName}>{otherUserName || 'Co-parent'}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          {/* Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={handlePickImage} disabled={sending}>
              <IconSymbol name="photo" size={24} color="#87CEEB" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]} 
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              <IconSymbol name="paperplane.fill" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  headerSpacer: {
    width: 44,
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
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
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
});
