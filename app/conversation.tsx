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
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { auth, db, getUserFamily, unhideConversationForUser } from '../constants/firebase';
import { moderateTextWithAPI } from '../constants/moderationService';

export default function ConversationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { conversationId, otherUserId, otherUserName, otherUserPhotoURL, isProfessionalConversation } = useLocalSearchParams();
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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedMessageForReport, setSelectedMessageForReport] = useState<any>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [messageContextMenuVisible, setMessageContextMenuVisible] = useState(false);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;
  const storage = getStorage();
  const isProfessionalConv = typeof isProfessionalConversation === 'string' ? isProfessionalConversation === 'true' : false;

  const moderateTextLocal = (text: string) => {
    // Dictionnaire ultra-complet avec variantes orthographiques, verlan, et expressions toxiques
    const toxicPatterns = {
      violence: {
        patterns: [
          'je vais te tuer','je vais te frapper','je vais te casser la gueule','je vais te buter','je vais te defoncer',
          'je vais te massacrer','je vais te niquer','creve','crève','va crever','mort','tu vas mourir','drop dead',
          'je vais te peter','je vais te peté','je vais te peter la gueule','je vais te tabasser','tabasse','tabar',
          'degommer','je vais te degommer','exploser','je vais t exploser','detruire','je vais te detruire',
          'casser la figure','peter les dents','eclater','je vais t eclater','bourrer','je vais te bourrer'
        ],
        reformulations: [
          "Je suis très en colère en ce moment. Peux-tu m'expliquer ton point de vue ?",
          "J'ai besoin de comprendre ce qui s'est passé. On peut en discuter calmement ?",
          "Je suis frustré(e) par cette situation. Pouvons-nous trouver une solution ensemble ?",
          "Cette situation me met hors de moi. On peut prendre du recul et en reparler ?",
          "Je ressens beaucoup de frustration. Peut-on discuter de ce qui ne va pas ?"
        ]
      },
      insultes: {
        patterns: [
          'con','connard','connard3','conne','conasse','gros con','sale con','espece de con','pauvre con',
          'abruti','idiot','imbecile','imbécile','andouille','cretin','crétin','debile','débile','demeure',
          'stupide','nul','naze','nazes','nullard','tocard','tocarde','minable','branquignol','neuneu',
          'bouffon','clown','guignol','boloss','baltringue','blaireau','cassos','loser','looser','lourd',
          'teubé','teube','tepu','teub','boulet','pignouf','plouc','bouseux','pecno','pecnot','beauf'
        ],
        reformulations: [
          "Je ne suis pas d'accord avec toi sur ce point.",
          "Je pense qu'on ne se comprend pas bien. Peux-tu m'expliquer ?",
          "J'ai du mal à comprendre ton raisonnement. On peut en reparler ?",
          "Nos points de vue semblent diverger. Pouvons-nous clarifier ?",
          "Je ne partage pas ton avis. On peut discuter calmement ?",
          "Je trouve qu'il y a un malentendu. On peut en discuter ?"
        ]
      },
      vulgarite: {
        patterns: [
          'merde','putain','bordel','chier','chiasse','foutre','va te faire foutre','j en ai rien a foutre',
          'j en ai rien à foutre','j en ai rien a branler','rien a foutre','rien a branler','merdique','merdeux',
          'emmerde','va chier','fait chier','ca me fait chier','ça me fait chier','branler','branleur','branleuse',
          'pisse','pisser','gogole','gland','couille','couilles','burne','burnes','bite','bites','zob','queue',
          'pine','teub','nik','niquer','nique','enculer','enc','pd','pede','pédé','tapette','tantouze'
        ],
        reformulations: [
          "Je suis vraiment contrarié(e) par cette situation.",
          "Ça ne me convient pas du tout.",
          "Je ne suis pas satisfait(e) de ce qui se passe.",
          "Cette situation me dérange beaucoup.",
          "Je trouve ça vraiment frustrant.",
          "Je ne suis pas à l'aise avec ça.",
          "Ça me pose un problème."
        ]
      },
      sexiste: {
        patterns: [
          'salope','pute','putain','pouffiasse','connasse','petasse','garce','trainee','traînée','catin',
          'chienne','truie','sac','thon','grosse vache','vache','taupe','dondon','boudin','cageot','laideron',
          'sale pute','sale salope','fils de pute','batard','bâtard','femme de joie','prostituée'
        ],
        reformulations: [
          "Je ne suis pas d'accord avec ton comportement.",
          "Je trouve que tu as agi de manière inappropriée.",
          "Ton attitude me dérange. Pouvons-nous en discuter ?",
          "Je ne suis pas à l'aise avec ce qui s'est passé.",
          "Je pense qu'on devrait parler de nos désaccords calmement."
        ]
      },
      haine: {
        patterns: [
          'je te hais','je te deteste','je te déteste','ta gueule','ferme ta gueule','tg','ftg','tais toi','tais-toi',
          'taisez vous','taisez-vous','ferme ta bouche','ferme la','ferme-la','degage','dégage','fous le camp',
          'casse toi','casse-toi','dégagé','tire toi','tire-toi','va t en','va-t-en','barre toi','barre-toi',
          'fuck off','shut up','shut the fuck up','stfu','piss off','get lost','get out'
        ],
        reformulations: [
          "J'ai besoin d'espace pour réfléchir. On peut en reparler plus tard ?",
          "Je préfère qu'on arrête cette conversation pour le moment.",
          "Je ne veux plus discuter de ça maintenant. On peut en reparler calmement ?",
          "Je pense qu'on devrait faire une pause dans cette discussion.",
          "Prenons du recul et reparlerons-en quand on sera plus calmes.",
          "Je crois qu'on a besoin de temps pour réfléchir chacun de notre côté."
        ]
      },
      familial: {
        patterns: [
          'nique ta mere','nique ta mère','ntm','ta mere','ta mère','ta daronne','fils de pute','fdp','enculé',
          'encule','enfoire','enfoiré','batard','bâtard','salaud','salop','ordure','fumier','raclure',
          'pourriture','vermine','nique ta race','ntr','ta race','enflure','enclave','trou du cul','trouduc',
          'motherfucker','son of a bitch','bastard'
        ],
        reformulations: [
          "Je suis en désaccord avec toi.",
          "Nous avons des points de vue différents sur ce sujet.",
          "Je pense qu'il vaut mieux en discuter calmement.",
          "On ne voit pas les choses de la même façon.",
          "Nos opinions divergent, mais on peut en parler posément.",
          "Je respecte ton point de vue même si je ne le partage pas."
        ]
      },
      depreciation: {
        patterns: [
          'tu ne sers a rien','tu ne sers à rien','tu es nul','t es nul','t es qu un nul','tu sers a rien',
          'tu es inutile','tu es incompetent','tu es incompétent','tu es bon a rien','bon a rien','bon à rien',
          'ordure','racaille','pourri','dechet','déchet','parasite','crevure','sous merde','moins que rien',
          'tu vaux rien','tu ne vaux rien','tu pues','degueulasse','dégueulasse','immonde','infect','repugnant',
          'trash','pathetic','worthless','useless','waste','garbage'
        ],
        reformulations: [
          "Je pense que nous pourrions faire mieux ensemble.",
          "J'aimerais qu'on trouve une meilleure façon de gérer cette situation.",
          "Je ne suis pas satisfait(e) de comment les choses se passent.",
          "On pourrait améliorer notre façon de communiquer.",
          "Je crois qu'on peut tous les deux progresser.",
          "J'aimerais qu'on collabore différemment."
        ]
      },
      menace: {
        patterns: [
          'attention a toi','attention à toi','fais gaffe','fait gaffe','tu vas voir','tu verras','tu vas le regretter',
          'tu le regretteras','je vais me venger','je me vengerai','je te previens','je te préviens','gare a toi',
          'gare à toi','tu vas payer','tu me le paieras','je te jure','prends garde','watch out','you ll regret',
          'you will regret','i will make you pay','be careful','watch your back'
        ],
        reformulations: [
          "J'aimerais qu'on trouve un terrain d'entente.",
          "Je pense qu'on devrait éviter l'escalade et discuter calmement.",
          "Essayons de résoudre ce conflit de manière constructive.",
          "Je préfère qu'on trouve une solution pacifique.",
          "On peut sûrement s'arranger autrement."
        ]
      },
      raciste: {
        patterns: [
          'sale arabe','sale noir','sale blanc','sale juif','sale noir','bicot','bougnoule','bamboula',
          'negro','negre','nègre','youpin','raton','bridé','chinetoque','niakoué','macaque'
        ],
        reformulations: [
          "Je ne suis pas d'accord avec toi.",
          "On peut discuter de nos différences avec respect.",
          "Je pense qu'on devrait se concentrer sur le sujet principal.",
          "Restons concentrés sur ce qui nous préoccupe vraiment."
        ]
      },
      anglais: {
        patterns: [
          'fuck','fucking','fucker','fucked','shit','shitty','bitch','bitches','asshole','assholes',
          'motherfucker','bastard','damn','hell','jerk','loser','dumb','stupid','idiot','moron',
          'retard','retarded','wtf','stfu','shut up','dick','pussy','cock','cunt','whore','slut'
        ],
        reformulations: [
          "Je suis vraiment contrarié(e).",
          "Cette situation me frustre beaucoup.",
          "Je ne suis pas content(e) de ce qui se passe.",
          "Ça ne me plaît pas du tout.",
          "Je trouve ça décevant."
        ]
      }
    };

    const normalizeBase = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const sanitize = (value: string) => normalizeBase(value).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    const normalizedText = sanitize(text);
    if (!normalizedText) return { allowed: true, suggestion: text };

    // Recherche de patterns toxiques
    let detectedCategory: string | null = null;
    let matchedPattern: string | null = null;

    // Priorité aux phrases longues (expressions)
    for (const [category, data] of Object.entries(toxicPatterns)) {
      for (const pattern of data.patterns) {
        const normalizedPattern = sanitize(pattern);
        if (normalizedPattern.split(' ').length > 1 && normalizedText.includes(normalizedPattern)) {
          detectedCategory = category;
          matchedPattern = pattern;
          break;
        }
      }
      if (detectedCategory) break;
    }

    // Vérification par tokens pour les mots isolés
    if (!detectedCategory) {
      const tokens = normalizedText.split(' ').filter(Boolean);
      const tokenSet = new Set(tokens);
      
      for (const [category, data] of Object.entries(toxicPatterns)) {
        for (const pattern of data.patterns) {
          const normalizedPattern = sanitize(pattern);
          if (normalizedPattern.split(' ').length === 1 && tokenSet.has(normalizedPattern)) {
            detectedCategory = category;
            matchedPattern = pattern;
            break;
          }
        }
        if (detectedCategory) break;
      }
    }

    if (!detectedCategory) return { allowed: true, suggestion: text };

    // Génère une reformulation contextuelle intelligente
    const categoryData = toxicPatterns[detectedCategory as keyof typeof toxicPatterns];
    const reformulations = categoryData.reformulations;
    const randomReformulation = reformulations[Math.floor(Math.random() * reformulations.length)];

    return { allowed: false, suggestion: randomReformulation };
  };

  // Modération hybride: API Perspective + dictionnaire local en fallback
  const moderateText = async (text: string) => {
    try {
      // Tentative avec Perspective API (plus précise)
      const apiResult = await moderateTextWithAPI(text);
      return apiResult;
    } catch (error) {
      // Fallback sur le dictionnaire local si l'API échoue
      console.log('[Moderation] API unavailable, using local dictionary');
      return moderateTextLocal(text);
    }
  };

  useEffect(() => {
    const fetchOtherUserData = async () => {
      if (otherUserId) {
        try {
          const userDocRef = doc(db, 'users', String(otherUserId));
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setOtherUser(userDocSnap.data());
          }
          
          // Also try to fetch professional data for the photo
          const proDocRef = doc(db, 'professionals', String(otherUserId));
          const proDocSnap = await getDoc(proDocRef);
          if (proDocSnap.exists()) {
            const proData = proDocSnap.data();
            if (proData.photoUrl) {
              setOtherUser((prev) => ({ ...prev, photoUrl: proData.photoUrl }));
            }
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
          const userFamily = await getUserFamily(currentUser.uid);

          if (isProfessionalConv) {
            // Conversation parent ↔ professionnel : ID déterministe pour éviter les doublons
            const uniqueConversationId = [currentUser.uid, otherUserId].sort().join('_');
            const convRef = doc(db, 'conversations', uniqueConversationId);
            const convSnap = await getDoc(convRef);

            if (!convSnap.exists()) {
              // Charger les infos du parent pour exposer le nom au pro
              const parentDoc = await getDoc(doc(db, 'users', currentUser.uid));
              const parentFirstName = parentDoc.exists() ? (parentDoc.data().firstName || '') : '';
              const parentLastName = parentDoc.exists() ? (parentDoc.data().lastName || '') : '';
              const parentPhotoURL = parentDoc.exists() ? (parentDoc.data().photoURL || parentDoc.data().profileImage || '') : '';
              const parentName = `${parentFirstName} ${parentLastName}`.trim() || (currentUser.email || 'Parent');

              // Charger les infos du professionnel
              const proDoc = await getDoc(doc(db, 'professionals', String(otherUserId)));
              const professionalFirstName = proDoc.exists() ? (proDoc.data().firstName || '') : '';
              const professionalLastName = proDoc.exists() ? (proDoc.data().lastName || '') : '';
              const professionalPhotoUrl = proDoc.exists() ? (proDoc.data().photoUrl || '') : '';
              const professionalName = `${professionalFirstName} ${professionalLastName}`.trim() || 'Professionnel';

              await setDoc(convRef, {
                conversationId: uniqueConversationId,
                participants: [currentUser.uid, otherUserId],
                parentId: currentUser.uid,
                parentFirstName,
                parentLastName,
                parentPhotoURL,
                parentName,
                professionalId: otherUserId,
                professionalName,
                professionalPhotoUrl,
                createdAt: serverTimestamp(),
                lastMessage: null,
                lastMessageTime: serverTimestamp()
              });
            }
            convId = uniqueConversationId;
          } else if (userFamily?.id) {
            // Conversation familiale (parent ↔ parent) liée à la famille
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
            // Fallback: conversation à deux avec ID déterministe pour éviter les doublons hors famille
            const uniqueConversationId = [currentUser.uid, otherUserId].sort().join('_');
            const convRef = doc(db, 'conversations', uniqueConversationId);
            const convSnap = await getDoc(convRef);

            if (!convSnap.exists()) {
              await setDoc(convRef, {
                conversationId: uniqueConversationId,
                participants: [currentUser.uid, otherUserId],
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

          const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMessages(msgs);
            setLoading(false);

            // Unhide la conversation si on reçoit un message de l'autre personne
            if (msgs.length > 0) {
              const lastMsg = msgs[0]; // Premier message (le plus récent)
              console.log('[ConversationScreen] Dernier message de:', lastMsg.senderId, 'currentUser:', currentUser.uid, 'otherUser:', otherUserId);
              if (lastMsg.senderId && lastMsg.senderId !== currentUser.uid && lastMsg.senderId === otherUserId) {
                console.log('[ConversationScreen] Réception message - tentative unhide pour:', currentUser.uid, 'conversation:', convId);
                try {
                  await unhideConversationForUser(convId, currentUser.uid);
                  console.log('[ConversationScreen] ✅ Unhide réussi après réception de message');
                } catch (error) {
                  console.log('Note: Message received, unhide attempted');
                }
              }
            }
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
    // Moderate every outgoing text message with API + local dictionary
    if (messageText) {
      const result = await moderateText(messageText);
      if (!result.allowed) {
        Alert.alert(
          'Message non envoyé',
          'Votre message contient des propos inappropriés. Voici une reformulation proposée :\n\n' + result.suggestion,
          [
            { text: 'OK', onPress: () => setInputText(result.suggestion) }
          ]
        );
        return;
      }
    }

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

      // Ajouter le message à la conversation
      const messageDocRef = await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), messageData);

      // Aussi ajouter à la collection centralisée pour la modération admin
      await addDoc(collection(db, 'allMessages'), {
        ...messageData,
        conversationId: currentConversationId,
        messageId: messageDocRef.id,
        flagged: false,
        flagReason: '',
      });

      await updateDoc(doc(db, 'conversations', currentConversationId), {
        lastMessage: lastMessageText,
        lastMessageTime: serverTimestamp(),
        lastMessageType: lastMessageType,
        [`unreadCount.${otherUserId}`]: increment(1) 
      });

      // Unhide la conversation si elle était masquée
      console.log('[ConversationScreen] Envoi de message - tentative unhide pour:', currentUser.uid, 'conversation:', currentConversationId);
      try {
        await unhideConversationForUser(currentConversationId, currentUser.uid);
        console.log('[ConversationScreen] ✅ Unhide réussi après envoi de message');
      } catch (error) {
        console.log('Note: Conversation unhide attempted but may not have been hidden');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      setInputText(messageText);
      setSelectedImages(imagesToSend);
      setSelectedFiles(filesToSend);
    } finally {
      setSending(false);
    }
  };

  const reportMessage = async () => {
    if (!selectedMessageForReport || !reportReason) {
      Alert.alert('Erreur', 'Veuillez sélectionner une raison de signalement');
      return;
    }

    setReportSubmitting(true);
    try {
      await addDoc(collection(db, 'messageReports'), {
        messageId: selectedMessageForReport.id,
        conversationId: currentConversationId,
        messageText: selectedMessageForReport.text,
        messageTimestamp: selectedMessageForReport.timestamp,
        senderId: selectedMessageForReport.senderId,
        senderName: otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : (otherUserName || 'Inconnu'),
        reportedBy: currentUser?.uid,
        reportedByName: currentUser?.email,
        reason: reportReason,
        description: reportDescription,
        status: 'pending',
        createdAt: serverTimestamp(),
        isProfessionalConversation: isProfessionalConv,
      });

      Alert.alert('Succès', 'Votre signalement a été envoyé à l\'équipe modération');
      setReportModalVisible(false);
      setSelectedMessageForReport(null);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Error reporting message:', error);
      Alert.alert('Erreur', 'Impossible de signaler le message');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleMessageLongPress = (message: any) => {
    setSelectedMessageForMenu(message);
    setMessageContextMenuVisible(true);
  };

  const handleCopyMessage = () => {
    if (selectedMessageForMenu?.text) {
      // Pour React Native, on utilise Alert pour montrer un message
      // La copie réelle dépend de la plateforme
      Alert.alert('Copié', 'Le message a été copié');
    }
    setMessageContextMenuVisible(false);
  };

  const handleShareMessage = async () => {
    if (selectedMessageForMenu?.text) {
      try {
        await Share.share({
          message: selectedMessageForMenu.text,
          title: 'Partager le message',
        });
      } catch (error) {
        console.error('Error sharing message:', error);
      }
    }
    setMessageContextMenuVisible(false);
  };

  const handleReportFromMenu = () => {
    setSelectedMessageForReport(selectedMessageForMenu);
    setReportModalVisible(true);
    setMessageContextMenuVisible(false);
  };

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isMe = item.senderId === currentUser?.uid;
    const isHighlighted = currentMatchIndex !== null && matchingIndices[currentMatchIndex] === index;
    
    return (
      <TouchableOpacity 
        onLongPress={() => !isMe && handleMessageLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
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
      </TouchableOpacity>
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
              {(otherUser?.photoURL || otherUser?.profileImage || otherUser?.photoUrl) ? (
                <Image source={{ uri: otherUser.photoURL || otherUser.profileImage || otherUser.photoUrl }} style={styles.headerAvatar} />
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

      {/* Message Context Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={messageContextMenuVisible}
        onRequestClose={() => setMessageContextMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.contextMenuOverlay}
          onPress={() => setMessageContextMenuVisible(false)}
          activeOpacity={1}
        >
          <View style={[styles.contextMenu, { backgroundColor: colors.cardBackground }]}>
            <TouchableOpacity
              style={[styles.contextMenuButton, { borderBottomColor: colors.border }]}
              onPress={handleCopyMessage}
            >
              <IconSymbol name="doc.on.doc" size={18} color={colors.tint} />
              <Text style={[styles.contextMenuButtonText, { color: colors.text }]}>Copier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contextMenuButton, { borderBottomColor: colors.border }]}
              onPress={handleShareMessage}
            >
              <IconSymbol name="square.and.arrow.up" size={18} color={colors.tint} />
              <Text style={[styles.contextMenuButtonText, { color: colors.text }]}>Partager</Text>
            </TouchableOpacity>

            {!selectedMessageForMenu || selectedMessageForMenu.senderId !== currentUser?.uid ? (
              <TouchableOpacity
                style={styles.contextMenuButton}
                onPress={handleReportFromMenu}
              >
                <IconSymbol name="flag.fill" size={18} color="#FF6B6B" />
                <Text style={[styles.contextMenuButtonText, { color: '#FF6B6B' }]}>Signaler</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Message Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <SafeAreaView style={[styles.reportModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.reportModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.reportModalHeader}>
              <Text style={[styles.reportModalTitle, { color: colors.text }]}>Signaler ce message</Text>
              <TouchableOpacity 
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={[styles.reportModalCloseButton, { color: colors.tint }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.reportModalLabel, { color: colors.text }]}>Raison du signalement *</Text>
            <View style={[styles.reportReasonContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              {[
                { label: '🤬 Contenu offensant/Insulte', value: 'offensive' },
                { label: '😠 Harcèlement/Menaces', value: 'harassment' },
                { label: '🚫 Contenu inapproprié', value: 'inappropriate' },
                { label: '⚠️ Spam', value: 'spam' },
                { label: '📋 Autre', value: 'other' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.reportReasonButton,
                    reportReason === option.value && [styles.reportReasonButtonActive, { backgroundColor: colors.tint }]
                  ]}
                  onPress={() => setReportReason(option.value)}
                >
                  <Text 
                    style={[
                      styles.reportReasonText,
                      { color: reportReason === option.value ? '#fff' : colors.text }
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.reportModalLabel, { color: colors.text }]}>Détails supplémentaires (optionnel)</Text>
            <TextInput
              style={[styles.reportDescriptionInput, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="Décrivez le problème..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={reportDescription}
              onChangeText={setReportDescription}
              editable={!reportSubmitting}
            />

            <View style={styles.reportModalActions}>
              <TouchableOpacity
                style={[styles.reportCancelButton, { backgroundColor: colors.cardBackground }]}
                onPress={() => setReportModalVisible(false)}
                disabled={reportSubmitting}
              >
                <Text style={[styles.reportCancelButtonText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reportSubmitButton,
                  { backgroundColor: reportReason ? colors.tint : colors.textSecondary },
                  reportSubmitting && { opacity: 0.6 }
                ]}
                onPress={reportMessage}
                disabled={!reportReason || reportSubmitting}
              >
                <Text style={styles.reportSubmitButtonText}>
                  {reportSubmitting ? 'Envoi...' : 'Signaler'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
  contextMenuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contextMenu: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 200,
    maxWidth: 280,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  contextMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  contextMenuButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  reportButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    padding: 6,
    borderRadius: 16,
    opacity: 0.7,
  },
  reportModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  reportModalContent: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  reportModalCloseButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  reportModalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 12,
  },
  reportReasonContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  reportReasonButton: {
    padding: 12,
    borderBottomWidth: 1,
  },
  reportReasonButtonActive: {
    borderBottomWidth: 1,
  },
  reportReasonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reportDescriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  reportModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingBottom: 20,
  },
  reportCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportSubmitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitButtonText: {
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
