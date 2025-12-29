import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../constants/firebase';
import { Colors } from '../constants/theme';

interface CategoryApproval {
  id: string;
  familyId: string;
  categoryName: string;
  limit: number;
  allowOverLimit: boolean;
  requestedBy: string;
  requestedByName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: any;
}

export default function CategoryApprovalsScreen() {
  const [approvals, setApprovals] = useState<CategoryApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.back();
      return;
    }

    // Get user's families
    const userDocRef = doc(db, 'users', currentUser.uid);
    getDoc(userDocRef).then((userDoc) => {
      if (!userDoc.exists()) return;

      // Support both old (familyId) and new (familyIds) structure
      let familyIds: string[] = userDoc.data().familyIds || [];
      const legacyFamilyId = userDoc.data().familyId;
      if (legacyFamilyId && !familyIds.includes(legacyFamilyId)) {
        familyIds = [legacyFamilyId, ...familyIds];
      }

      if (familyIds.length === 0) {
        setLoading(false);
        return;
      }

      // Listen to pending approvals for user's families where they are NOT the requester
      const approvalsRef = collection(db, 'categoryApprovals');
      const q = query(
        approvalsRef,
        where('familyId', 'in', familyIds.slice(0, 10)), // Firestore 'in' limit
        where('status', '==', 'PENDING')
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const approvalsData: CategoryApproval[] = [];

        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          
          // Only show approvals requested by OTHER users
          if (data.requestedBy !== currentUser.uid) {
            // Fetch requester name
            let requestedByName = 'Unknown';
            try {
              const requesterDoc = await getDoc(doc(db, 'users', data.requestedBy));
              if (requesterDoc.exists()) {
                requestedByName = requesterDoc.data().name || 'Unknown';
              }
            } catch (error) {
              console.error('Error fetching requester name:', error);
            }

            approvalsData.push({
              id: docSnapshot.id,
              familyId: data.familyId,
              categoryName: data.categoryName,
              limit: data.limit,
              allowOverLimit: data.allowOverLimit,
              requestedBy: data.requestedBy,
              requestedByName,
              status: data.status,
              createdAt: data.createdAt,
            });
          }
        }

        setApprovals(approvalsData);
        setLoading(false);
      }, (err) => {
        console.warn('[category-approvals] onSnapshot error:', err?.code, err?.message);
        setApprovals([]);
        setLoading(false);
      });

      return () => unsubscribe();
    });
  }, []);

  const handleApprove = async (approval: CategoryApproval) => {
    setProcessingId(approval.id);
    try {
      // Add category to budget rules
      const budgetDocRef = doc(db, 'budgets', approval.familyId);
      const budgetDoc = await getDoc(budgetDocRef);

      const categoryRules = budgetDoc.exists() ? budgetDoc.data().categoryRules || {} : {};
      categoryRules[approval.categoryName] = {
        limit: approval.limit,
        allowOverLimit: approval.allowOverLimit,
      };

      await setDoc(budgetDocRef, { categoryRules }, { merge: true });

      // Update approval status
      const approvalDocRef = doc(db, 'categoryApprovals', approval.id);
      await updateDoc(approvalDocRef, {
        status: 'APPROVED',
        approvedBy: auth.currentUser?.uid,
        approvedAt: new Date(),
      });

      Alert.alert('Succès', `La catégorie "${approval.categoryName}" a été approuvée.`);
    } catch (error) {
      console.error('Error approving category:', error);
      Alert.alert('Erreur', 'Impossible d\'approuver la catégorie.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (approval: CategoryApproval) => {
    Alert.alert(
      'Rejeter la catégorie',
      `Êtes-vous sûr de vouloir rejeter la catégorie "${approval.categoryName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(approval.id);
            try {
              const approvalDocRef = doc(db, 'categoryApprovals', approval.id);
              await updateDoc(approvalDocRef, {
                status: 'REJECTED',
                rejectedBy: auth.currentUser?.uid,
                rejectedAt: new Date(),
              });

              Alert.alert('Rejeté', `La catégorie "${approval.categoryName}" a été rejetée.`);
            } catch (error) {
              console.error('Error rejecting category:', error);
              Alert.alert('Erreur', 'Impossible de rejeter la catégorie.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const renderApprovalItem = ({ item }: { item: CategoryApproval }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={[styles.approvalCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.approvalHeader}>
          <View style={styles.categoryNameContainer}>
            <Ionicons name="pricetag" size={20} color={colors.tint} />
            <Text style={[styles.categoryName, { color: colors.text }]}>{item.categoryName}</Text>
          </View>
          <Text style={[styles.requestedBy, { color: colors.textSecondary }]}>
            Demandé par {item.requestedByName}
          </Text>
        </View>

        <View style={[styles.approvalDetails, { borderTopColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Plafond mensuel :</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.limit > 0 ? `${item.limit}€` : 'Aucun plafond'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dépassement autorisé :</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.allowOverLimit ? 'Oui' : 'Non'}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.rejectButton, isProcessing && styles.disabledButton]}
            onPress={() => handleReject(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Rejeter</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveButton, isProcessing && styles.disabledButton]}
            onPress={() => handleApprove(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Approuver</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Approbations en attente</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      ) : approvals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-circle" size={64} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune approbation en attente</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Les nouvelles demandes de catégories apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={approvals}
          renderItem={renderApprovalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  approvalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approvalHeader: {
    marginBottom: 12,
  },
  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  requestedBy: {
    fontSize: 13,
    marginTop: 4,
  },
  approvalDetails: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
