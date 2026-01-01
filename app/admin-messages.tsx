import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Stack, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import { db } from '../constants/firebase';

const auth = getAuth();

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    text?: string;
    imageUrls?: string[];
    fileUrls?: any[];
    timestamp: any;
    status: string;
    flagged?: boolean;
    flagReason?: string;
}

export default function AdminMessageModerationScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'flagged' | 'images' | 'files'>('all');
    const [searchText, setSearchText] = useState('');
    const [flagModalVisible, setFlagModalVisible] = useState(false);
    const [flagReason, setFlagReason] = useState('');
    const [actionInProgress, setActionInProgress] = useState(false);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    router.replace('/(auth)/LoginScreen');
                    return;
                }

                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                const isAdminUser = userDoc.exists() && userDoc.data()?.isAdmin === true;

                if (!isAdminUser) {
                    router.replace('/(tabs)');
                    return;
                }

                setIsAdmin(isAdminUser);
            } catch (error) {
                console.error('Error checking admin status:', error);
                router.replace('/(tabs)');
            }
        };

        checkAdminStatus();
    }, []);

    useEffect(() => {
        if (!isAdmin) return;

        let baseQuery = query(
            collection(db, 'allMessages'),
            orderBy('timestamp', 'desc'),
            limit(1000)
        );

        let unsubscribe: any;

        const fetchMessages = async () => {
            try {
                const snapshot = await getDocs(baseQuery);
                let messagesData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                } as Message));

                // Appliquer les filtres
                if (filterType === 'flagged') {
                    messagesData = messagesData.filter((m) => m.flagged === true);
                } else if (filterType === 'images') {
                    messagesData = messagesData.filter((m) => m.imageUrls && m.imageUrls.length > 0);
                } else if (filterType === 'files') {
                    messagesData = messagesData.filter((m) => m.fileUrls && m.fileUrls.length > 0);
                }

                // Appliquer la recherche
                if (searchText.trim()) {
                    messagesData = messagesData.filter((m) =>
                        m.text?.toLowerCase().includes(searchText.toLowerCase()) ||
                        m.senderName?.toLowerCase().includes(searchText.toLowerCase())
                    );
                }

                setMessages(messagesData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching messages:', error);
                setLoading(false);
            }
        };

        fetchMessages();
    }, [isAdmin, filterType, searchText]);

    const handleFlagMessage = async () => {
        if (!selectedMessage || !flagReason) {
            Alert.alert('Erreur', 'Veuillez entrer une raison');
            return;
        }

        setActionInProgress(true);
        try {
            await updateDoc(
                doc(db, 'allMessages', selectedMessage.id),
                {
                    flagged: true,
                    flagReason: flagReason,
                    flaggedAt: new Date(),
                    flaggedBy: auth.currentUser?.uid,
                }
            );

            Alert.alert('Succès', 'Message signalé pour examen');
            setFlagModalVisible(false);
            setFlagReason('');
            setDetailsModalVisible(false);

            // Mettre à jour l'état local
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === selectedMessage.id
                        ? { ...m, flagged: true, flagReason }
                        : m
                )
            );
        } catch (error) {
            console.error('Error flagging message:', error);
            Alert.alert('Erreur', 'Impossible de signaler le message');
        } finally {
            setActionInProgress(false);
        }
    };

    const handleDeleteMessage = async () => {
        if (!selectedMessage) return;

        Alert.alert(
            'Confirmation',
            'Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        setActionInProgress(true);
                        try {
                            await deleteDoc(doc(db, 'allMessages', selectedMessage.id));

                            // Aussi supprimer de la conversation
                            if (selectedMessage.conversationId) {
                                await deleteDoc(
                                    doc(
                                        db,
                                        'conversations',
                                        selectedMessage.conversationId,
                                        'messages',
                                        selectedMessage.id
                                    )
                                );
                            }

                            Alert.alert('Succès', 'Message supprimé');
                            setDetailsModalVisible(false);
                            setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
                        } catch (error) {
                            console.error('Error deleting message:', error);
                            Alert.alert('Erreur', 'Impossible de supprimer le message');
                        } finally {
                            setActionInProgress(false);
                        }
                    },
                },
            ]
        );
    };

    const handleUnflagMessage = async () => {
        if (!selectedMessage) return;

        setActionInProgress(true);
        try {
            await updateDoc(doc(db, 'allMessages', selectedMessage.id), {
                flagged: false,
                flagReason: '',
            });

            Alert.alert('Succès', 'Message désignalé');
            setDetailsModalVisible(false);

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === selectedMessage.id
                        ? { ...m, flagged: false, flagReason: '' }
                        : m
                )
            );
        } catch (error) {
            console.error('Error unflagging message:', error);
            Alert.alert('Erreur', 'Impossible de désignaler le message');
        } finally {
            setActionInProgress(false);
        }
    };

    const renderMessageItem = ({ item }: { item: Message }) => (
        <TouchableOpacity
            style={[
                styles.messageCard,
                {
                    backgroundColor: item.flagged ? '#FFE5E5' : colors.cardBackground,
                    borderColor: item.flagged ? '#FF6B6B' : colors.border,
                },
            ]}
            onPress={() => {
                setSelectedMessage(item);
                setDetailsModalVisible(true);
            }}
        >
            <View style={styles.messageCardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.senderName, { color: colors.text }]}>
                        {item.senderName || 'Utilisateur inconnu'}
                    </Text>
                    <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                        {item.timestamp?.toDate
                            ? new Date(item.timestamp.toDate()).toLocaleString('fr-FR')
                            : 'Date inconnue'}
                    </Text>
                </View>
                {item.flagged && (
                    <View style={styles.flaggedBadge}>
                        <IconSymbol name="flag.fill" size={16} color="#FF6B6B" />
                    </View>
                )}
            </View>

            <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={2}>
                {item.text || '(Message sans texte)'}
            </Text>

            {item.imageUrls && item.imageUrls.length > 0 && (
                <View style={styles.mediaIndicator}>
                    <IconSymbol name="photo.fill" size={14} color={colors.tint} />
                    <Text style={[styles.mediaText, { color: colors.tint }]}>
                        {item.imageUrls.length} image(s)
                    </Text>
                </View>
            )}

            {item.fileUrls && item.fileUrls.length > 0 && (
                <View style={styles.mediaIndicator}>
                    <IconSymbol name="paperclip" size={14} color={colors.tint} />
                    <Text style={[styles.mediaText, { color: colors.tint }]}>
                        {item.fileUrls.length} fichier(s)
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <IconSymbol name="checkmark.circle" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
                Aucun message trouvé
            </Text>
        </View>
    );

    if (!isAdmin || loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    Modération des messages
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Rechercher un message..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                        <IconSymbol name="xmark.circle.fill" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContentContainer}
            >
                {[
                    { key: 'all' as const, label: '📨 Tous les messages' },
                    { key: 'flagged' as const, label: '🚩 Signalés' },
                    { key: 'images' as const, label: '📷 Avec images' },
                    { key: 'files' as const, label: '📎 Avec fichiers' },
                ].map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        style={{
                            ...styles.filterButton,
                            backgroundColor: filterType === filter.key ? colors.tint : colors.cardBackground,
                        } as any}
                        onPress={() => setFilterType(filter.key)}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                { color: filterType === filter.key ? '#fff' : colors.text },
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={renderEmptyState}
            />

            {/* Message Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={detailsModalVisible}
                onRequestClose={() => setDetailsModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                                <Text style={[styles.modalCloseButton, { color: colors.tint }]}>
                                    ← Retour
                                </Text>
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Détails du message
                            </Text>
                            <View style={styles.modalHeaderSpacer} />
                        </View>

                        {selectedMessage && (
                            <ScrollView
                                contentContainerStyle={styles.modalScrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {selectedMessage.flagged && (
                                    <View
                                        style={[
                                            styles.detailSection,
                                            { backgroundColor: '#FFE5E5', borderColor: '#FF6B6B' },
                                        ]}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF6B6B" />
                                            <Text style={[styles.detailLabel, { color: '#FF6B6B', marginLeft: 8 }]}>
                                                ⚠️ Message signalé
                                            </Text>
                                        </View>
                                        {selectedMessage.flagReason && (
                                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                                Raison: {selectedMessage.flagReason}
                                            </Text>
                                        )}
                                    </View>
                                )}

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                        Auteur
                                    </Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {selectedMessage.senderName || 'Inconnu'}
                                    </Text>
                                    <Text style={[styles.detailSmallText, { color: colors.textSecondary }]}>
                                        ID: {selectedMessage.senderId}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                        Contenu
                                    </Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {selectedMessage.text || '(Aucun texte)'}
                                    </Text>
                                </View>

                                {selectedMessage.imageUrls && selectedMessage.imageUrls.length > 0 && (
                                    <View
                                        style={[
                                            styles.detailSection,
                                            { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                        ]}
                                    >
                                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                            Images ({selectedMessage.imageUrls.length})
                                        </Text>
                                        {selectedMessage.imageUrls.map((url, idx) => (
                                            <Text
                                                key={idx}
                                                style={[styles.detailSmallText, { color: colors.tint }]}
                                                numberOfLines={1}
                                            >
                                                {idx + 1}. {url.substring(0, 50)}...
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                {selectedMessage.fileUrls && selectedMessage.fileUrls.length > 0 && (
                                    <View
                                        style={[
                                            styles.detailSection,
                                            { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                        ]}
                                    >
                                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                            Fichiers ({selectedMessage.fileUrls.length})
                                        </Text>
                                        {selectedMessage.fileUrls.map((file, idx) => (
                                            <Text
                                                key={idx}
                                                style={[styles.detailSmallText, { color: colors.text }]}
                                            >
                                                {idx + 1}. {file.name}
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                        Date
                                    </Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {selectedMessage.timestamp?.toDate
                                            ? new Date(selectedMessage.timestamp.toDate()).toLocaleString('fr-FR')
                                            : 'Date inconnue'}
                                    </Text>
                                </View>

                                <Text style={[styles.detailLabel, { color: colors.textSecondary, marginTop: 24 }]}>
                                    Actions
                                </Text>

                                {!selectedMessage.flagged ? (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                                        onPress={() => setFlagModalVisible(true)}
                                        disabled={actionInProgress}
                                    >
                                        <Text style={styles.actionButtonText}>🚩 Signaler le message</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                                        onPress={handleUnflagMessage}
                                        disabled={actionInProgress}
                                    >
                                        <Text style={styles.actionButtonText}>✓ Désignaler</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#f44336' }]}
                                    onPress={handleDeleteMessage}
                                    disabled={actionInProgress}
                                >
                                    <Text style={styles.actionButtonText}>🗑️ Supprimer le message</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.closeButton]}
                                    onPress={() => setDetailsModalVisible(false)}
                                >
                                    <Text style={[styles.closeButtonText, { color: colors.tint }]}>
                                        Fermer
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Flag Reason Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={flagModalVisible}
                onRequestClose={() => setFlagModalVisible(false)}
            >
                <SafeAreaView style={[styles.flagModalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.flagModalContent, { backgroundColor: colors.background }]}>
                        <Text style={[styles.flagModalTitle, { color: colors.text }]}>
                            Raison du signalement
                        </Text>

                        <TextInput
                            style={[
                                styles.flagReasonInput,
                                { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border },
                            ]}
                            placeholder="Entrez la raison du signalement..."
                            placeholderTextColor={colors.textSecondary}
                            value={flagReason}
                            onChangeText={setFlagReason}
                            multiline
                            numberOfLines={4}
                            editable={!actionInProgress}
                        />

                        <View style={styles.flagModalActions}>
                            <TouchableOpacity
                                style={[styles.flagCancelButton, { backgroundColor: colors.cardBackground }]}
                                onPress={() => {
                                    setFlagModalVisible(false);
                                    setFlagReason('');
                                }}
                                disabled={actionInProgress}
                            >
                                <Text style={[styles.flagCancelButtonText, { color: colors.text }]}>
                                    Annuler
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.flagSubmitButton,
                                    {
                                        backgroundColor: flagReason ? colors.tint : colors.textSecondary,
                                    },
                                    actionInProgress && { opacity: 0.6 },
                                ]}
                                onPress={handleFlagMessage}
                                disabled={!flagReason || actionInProgress}
                            >
                                <Text style={styles.flagSubmitButtonText}>
                                    {actionInProgress ? 'Traitement...' : 'Signaler'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    backButtonText: {
        fontSize: 24,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 32,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 4,
    },
    filterContainer: {
        borderBottomWidth: 1,
        paddingVertical: 12,
    },
    filterContentContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterButtonActive: {
        fontWeight: '600',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContainer: {
        padding: 16,
        gap: 12,
    },
    messageCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    messageCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    senderName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 12,
    },
    flaggedBadge: {
        padding: 6,
        backgroundColor: '#FFE5E5',
        borderRadius: 8,
    },
    messageText: {
        fontSize: 13,
        marginBottom: 8,
    },
    mediaIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    mediaText: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
    },
    modalContent: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalCloseButton: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    modalHeaderSpacer: {
        width: 50,
    },
    modalScrollContent: {
        padding: 16,
        gap: 12,
    },
    detailSection: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    detailSmallText: {
        fontSize: 12,
        marginTop: 4,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1.5,
    },
    closeButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    flagModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    flagModalContent: {
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    flagModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    flagReasonInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    flagModalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    flagCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flagCancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    flagSubmitButton: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flagSubmitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
