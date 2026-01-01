import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Stack, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
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
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import { db } from '../constants/firebase';

interface MessageReport {
    id: string;
    messageId: string;
    conversationId: string;
    messageText: string;
    senderName: string;
    senderId: string;
    reportedBy: string;
    reportedByName: string;
    reason: string;
    description: string;
    status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
    createdAt: any;
    isProfessionalConversation: boolean;
}

const statusLabels: Record<string, string> = {
    pending: '⏳ En attente',
    reviewed: '👀 Examiné',
    dismissed: '❌ Rejeté',
    action_taken: '✅ Action prise',
};

const statusColors: Record<string, string> = {
    pending: '#FF9800',
    reviewed: '#2196F3',
    dismissed: '#9E9E9E',
    action_taken: '#4CAF50',
};

const reasonLabels: Record<string, string> = {
    offensive: '🤬 Contenu offensant/Insulte',
    harassment: '😠 Harcèlement/Menaces',
    inappropriate: '🚫 Contenu inapproprié',
    spam: '⚠️ Spam',
    other: '📋 Autre',
};

export default function AdminMessageReportsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [reports, setReports] = useState<MessageReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<MessageReport | null>(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('pending');

    useEffect(() => {
        const q = query(
            collection(db, 'messageReports'),
            where('status', '==', filterStatus)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reportsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as MessageReport));

            // Trier par date décroissante
            reportsData.sort((a, b) => {
                const timeA = a.createdAt?.toDate?.() || new Date(0);
                const timeB = b.createdAt?.toDate?.() || new Date(0);
                return timeB.getTime() - timeA.getTime();
            });

            setReports(reportsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filterStatus]);

    const handleStatusChange = async (reportId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'messageReports', reportId), {
                status: newStatus,
            });
            Alert.alert('Succès', 'Statut du rapport mis à jour');
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        Alert.alert(
            'Confirmation',
            'Êtes-vous sûr de vouloir supprimer ce rapport ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'messageReports', reportId));
                            Alert.alert('Succès', 'Rapport supprimé');
                            setDetailsModalVisible(false);
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de supprimer le rapport');
                        }
                    },
                },
            ]
        );
    };

    const renderReportItem = ({ item }: { item: MessageReport }) => (
        <TouchableOpacity
            style={[styles.reportCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => {
                setSelectedReport(item);
                setDetailsModalVisible(true);
            }}
        >
            <View style={styles.reportCardHeader}>
                <View style={styles.reportCardInfo}>
                    <Text style={[styles.reportCardReason, { color: colors.text }]}>
                        {reasonLabels[item.reason] || item.reason}
                    </Text>
                    <Text style={[styles.reportCardSender, { color: colors.textSecondary }]}>
                        De: {item.reportedByName}
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: statusColors[item.status] || '#666' },
                    ]}
                >
                    <Text style={styles.statusBadgeText}>{statusLabels[item.status]}</Text>
                </View>
            </View>

            <Text
                style={[styles.reportCardMessage, { color: colors.text }]}
                numberOfLines={2}
            >
                "{item.messageText}"
            </Text>

            <Text style={[styles.reportCardDate, { color: colors.textSecondary }]}>
                {item.createdAt?.toDate
                    ? new Date(item.createdAt.toDate()).toLocaleString('fr-FR')
                    : 'Date inconnue'}
            </Text>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <IconSymbol name="checkmark.circle" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
                Aucun rapport {filterStatus === 'pending' ? 'en attente' : filterStatus}
            </Text>
        </View>
    );

    if (loading) {
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
                    Signalements de messages
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContentContainer}
            >
                {[
                    { key: 'pending', label: '⏳ En attente' },
                    { key: 'reviewed', label: '👀 Examinés' },
                    { key: 'dismissed', label: '❌ Rejetés' },
                    { key: 'action_taken', label: '✅ Actions prises' },
                ].map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        style={[
                            styles.filterButton,
                            filterStatus === filter.key && [
                                styles.filterButtonActive,
                                { backgroundColor: colors.tint },
                            ],
                            { backgroundColor: filterStatus !== filter.key ? colors.cardBackground : undefined },
                        ]}
                        onPress={() => setFilterStatus(filter.key)}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                { color: filterStatus === filter.key ? '#fff' : colors.text },
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={reports}
                renderItem={renderReportItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={renderEmptyState}
            />

            {/* Report Details Modal */}
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
                                Détails du rapport
                            </Text>
                            <View style={styles.modalHeaderSpacer} />
                        </View>

                        {selectedReport && (
                            <ScrollView
                                contentContainerStyle={styles.modalScrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text
                                        style={[styles.detailLabel, { color: colors.textSecondary }]}
                                    >
                                        État du rapport
                                    </Text>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor:
                                                    statusColors[selectedReport.status] || '#666',
                                                alignSelf: 'flex-start',
                                                marginTop: 8,
                                            },
                                        ]}
                                    >
                                        <Text style={styles.statusBadgeText}>
                                            {statusLabels[selectedReport.status]}
                                        </Text>
                                    </View>
                                </View>

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text
                                        style={[styles.detailLabel, { color: colors.textSecondary }]}
                                    >
                                        Raison
                                    </Text>
                                    <Text
                                        style={[styles.detailValue, { color: colors.text }]}
                                    >
                                        {reasonLabels[selectedReport.reason] || selectedReport.reason}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text
                                        style={[styles.detailLabel, { color: colors.textSecondary }]}
                                    >
                                        Message signalé
                                    </Text>
                                    <Text
                                        style={[styles.messageText, { color: colors.text }]}
                                    >
                                        "{selectedReport.messageText}"
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text
                                        style={[styles.detailLabel, { color: colors.textSecondary }]}
                                    >
                                        Auteur du message
                                    </Text>
                                    <Text
                                        style={[styles.detailValue, { color: colors.text }]}
                                    >
                                        {selectedReport.senderName}
                                    </Text>
                                    <Text
                                        style={[styles.detailSmallText, { color: colors.textSecondary }]}
                                    >
                                        ID: {selectedReport.senderId}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text
                                        style={[styles.detailLabel, { color: colors.textSecondary }]}
                                    >
                                        Signalé par
                                    </Text>
                                    <Text
                                        style={[styles.detailValue, { color: colors.text }]}
                                    >
                                        {selectedReport.reportedByName}
                                    </Text>
                                    <Text
                                        style={[styles.detailSmallText, { color: colors.textSecondary }]}
                                    >
                                        ID: {selectedReport.reportedBy}
                                    </Text>
                                </View>

                                {selectedReport.description && (
                                    <View
                                        style={[
                                            styles.detailSection,
                                            { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                        ]}
                                    >
                                        <Text
                                            style={[styles.detailLabel, { color: colors.textSecondary }]}
                                        >
                                            Détails supplémentaires
                                        </Text>
                                        <Text
                                            style={[styles.detailValue, { color: colors.text }]}
                                        >
                                            {selectedReport.description}
                                        </Text>
                                    </View>
                                )}

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text
                                        style={[styles.detailLabel, { color: colors.textSecondary }]}
                                    >
                                        Date du signalement
                                    </Text>
                                    <Text
                                        style={[styles.detailValue, { color: colors.text }]}
                                    >
                                        {selectedReport.createdAt?.toDate
                                            ? new Date(selectedReport.createdAt.toDate()).toLocaleString(
                                                'fr-FR'
                                            )
                                            : 'Date inconnue'}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.detailSection,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                    ]}
                                >
                                    <Text
                                        style={[styles.detailLabel, { color: colors.textSecondary }]}
                                    >
                                        Type de conversation
                                    </Text>
                                    <Text
                                        style={[styles.detailValue, { color: colors.text }]}
                                    >
                                        {selectedReport.isProfessionalConversation
                                            ? 'Parent ↔ Professionnel'
                                            : 'Parent ↔ Parent'}
                                    </Text>
                                </View>

                                <Text
                                    style={[styles.detailLabel, { color: colors.textSecondary, marginTop: 24 }]}
                                >
                                    Actions
                                </Text>

                                {['reviewed', 'dismissed', 'action_taken'].map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor:
                                                    statusColors[status] || '#666',
                                                marginBottom: 12,
                                            },
                                        ]}
                                        onPress={() =>
                                            handleStatusChange(selectedReport.id, status)
                                        }
                                    >
                                        <Text style={styles.actionButtonText}>
                                            {statusLabels[status]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    style={[styles.deleteButton, { marginBottom: 32 }]}
                                    onPress={() => handleDeleteReport(selectedReport.id)}
                                >
                                    <Text style={styles.deleteButtonText}>Supprimer ce rapport</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
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
    reportCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    reportCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    reportCardInfo: {
        flex: 1,
        marginRight: 12,
    },
    reportCardReason: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    reportCardSender: {
        fontSize: 12,
    },
    reportCardMessage: {
        fontSize: 13,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    reportCardDate: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
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
    messageText: {
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 8,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#f44336',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
