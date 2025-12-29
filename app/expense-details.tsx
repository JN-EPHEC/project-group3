import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { auth, db } from '../constants/firebase';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { expenseId } = useLocalSearchParams();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    const fetchExpense = async () => {
      if (!expenseId || typeof expenseId !== 'string') return;
      
      try {
        const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));
        if (expenseDoc.exists()) {
          const data = { id: expenseDoc.id, ...expenseDoc.data() };
          setExpense(data);
          const currentUser = auth.currentUser;
          const isExpenseOwner = !!currentUser && data.paidBy === currentUser.uid;
          setIsOwner(isExpenseOwner);
          
          // Vérifier si la dépense est en attente d'approbation
          const pending = data.approvalStatus === 'PENDING_APPROVAL';
          setIsPending(pending);
          
          // L'utilisateur peut approuver si ce n'est PAS sa dépense ET qu'elle est en attente
          setCanApprove(pending && !isExpenseOwner && !!currentUser);
        }
      } catch (error) {
        console.error('Error fetching expense:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [expenseId]);

  const handleApprove = async () => {
    if (!expenseId || typeof expenseId !== 'string') return;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Session expirée', 'Reconnectez-vous pour approuver.');
      return;
    }
    
    setApproving(true);
    try {

      // Mettre à jour le statut de la dépense
      const expenseRef = doc(db, 'expenses', expenseId);
      await updateDoc(expenseRef, {
        approvalStatus: 'APPROVED',
        approvedBy: currentUser.uid,
        approvedAt: new Date(),
      });

      // Mettre à jour la demande d'approbation dans categoryApprovals
      const approvalsQuery = query(
        collection(db, 'categoryApprovals'),
        where('expenseId', '==', expenseId),
        where('status', '==', 'PENDING')
      );
      const approvalsSnapshot = await getDocs(approvalsQuery);
      
      for (const approvalDoc of approvalsSnapshot.docs) {
        await updateDoc(doc(db, 'categoryApprovals', approvalDoc.id), {
          status: 'APPROVED',
          approvedBy: currentUser.uid,
          approvedAt: new Date(),
        });
      }

      Alert.alert(
        '✅ Dépense approuvée',
        'La dépense a été approuvée et sera incluse dans les calculs.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error approving expense:', error);
      Alert.alert('Erreur', 'Impossible d\'approuver la dépense');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Rejeter la dépense',
      'Êtes-vous sûr de vouloir rejeter cette dépense ? Elle sera marquée comme refusée et exclue des calculs.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            if (!expenseId || typeof expenseId !== 'string') return;
            const currentUser = auth.currentUser;
            if (!currentUser) {
              Alert.alert('Session expirée', 'Reconnectez-vous pour rejeter.');
              return;
            }
            
            setRejecting(true);
            try {

              // Mettre à jour la demande d'approbation
              const approvalsQuery = query(
                collection(db, 'categoryApprovals'),
                where('expenseId', '==', expenseId),
                where('status', '==', 'PENDING')
              );
              const approvalsSnapshot = await getDocs(approvalsQuery);
              
              for (const approvalDoc of approvalsSnapshot.docs) {
                await updateDoc(doc(db, 'categoryApprovals', approvalDoc.id), {
                  status: 'REJECTED',
                  rejectedBy: currentUser.uid,
                  rejectedAt: new Date(),
                });
              }

              // Marquer la dépense comme REJETÉE plutôt que la supprimer
              const expenseRef = doc(db, 'expenses', expenseId);
              await updateDoc(expenseRef, {
                approvalStatus: 'REJECTED',
                rejectedBy: currentUser.uid,
                rejectedAt: new Date(),
              });

              Alert.alert(
                '❌ Dépense rejetée',
                'La dépense a été rejetée et n\'est pas prise en compte.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Error rejecting expense:', error);
              Alert.alert('Erreur', 'Impossible de rejeter la dépense');
              setRejecting(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    console.log('=== HANDLE DELETE CALLED ===');
    
    if (!expenseId || typeof expenseId !== 'string') {
      console.log('Invalid expense ID:', expenseId);
      Alert.alert('Erreur', 'ID de dépense invalide');
      return;
    }
    
    console.log('Expense ID to delete:', expenseId);
    setDeleting(true);
    
    try {
      console.log('Attempting to delete expense...');
      
      const expenseRef = doc(db, 'expenses', expenseId);
      console.log('Document reference created');
      
      await deleteDoc(expenseRef);
      console.log('Document deleted successfully from Firestore');
      
      // Attendre un peu pour s'assurer que Firestore a bien supprimé
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Navigating back...');
      
      // Retour à la page Dépenses
      router.back();
    } catch (error: any) {
      console.error('=== DELETE ERROR ===');
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      Alert.alert(
        'Erreur', 
        `Impossible de supprimer la dépense.\nCode: ${error?.code}\nMessage: ${error?.message}`
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={styles.containerCentered}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!expense) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={styles.containerCentered}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>Dépense introuvable</Text>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.container}>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.cardBackground }]} onPress={() => router.back()}>
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{expense.description}</Text>
              <Text style={[styles.amount, { color: isPending ? '#FF9500' : colors.tint }]}>{expense.amount?.toFixed(2)} €</Text>
              {isPending && (
                <View style={[styles.pendingBanner, { backgroundColor: '#FFF3E0', borderColor: '#FF9500' }]}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF9500" />
                  <Text style={[styles.pendingText, { color: '#FF9500' }]}>
                    {canApprove ? 'Cette dépense est en attente de votre approbation' : 'Dépense en attente d\'approbation'}
                  </Text>
                </View>
              )}
            </View>

            {(expense.receiptImage || expense.receiptUrl || expense.productImage) && (
              <View style={styles.imageSection}>
                <Text style={[styles.imageLabel, { color: colors.text }]}>Justificatif</Text>
                <Image
                  source={{ uri: expense.receiptImage || expense.receiptUrl || expense.productImage }}
                  style={styles.receiptImage}
                />
              </View>
            )}

            <View style={styles.infoSection}>
              <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📦 Catégorie</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{expense.category || 'Non catégorisé'}</Text>
              </View>

              <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📅 Date</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {expense.date?.toDate ? expense.date.toDate().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  }) : 'Date inconnue'}
                </Text>
              </View>
            </View>

            {canApprove && (
              <View style={styles.approvalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.rejectButton, (approving || rejecting) && styles.disabled]}
                  onPress={handleReject}
                  disabled={approving || rejecting}
                >
                  {rejecting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <IconSymbol name="xmark.circle.fill" size={24} color="#fff" />
                      <Text style={styles.rejectButtonText}>Rejeter</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveButton, (approving || rejecting) && styles.disabled]}
                  onPress={handleApprove}
                  disabled={approving || rejecting}
                >
                  {approving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                      <Text style={styles.approveButtonText}>Approuver</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {isOwner && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.deleteButton, deleting && styles.disabled]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  <IconSymbol name="trash" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  closeButton: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  closeButtonText: { fontSize: 24, color: '#666', fontWeight: '300' },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 8, textAlign: 'center' },
  amount: { fontSize: 36, fontWeight: '800', color: '#87CEEB' },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  approvalButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#34C759',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF3B30',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  imageSection: { marginBottom: 24 },
  imageLabel: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 12 },
  receiptImage: { width: '100%', height: 300, borderRadius: 12 },
  infoSection: { marginBottom: 32 },
  infoRow: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '600' },
  infoValue: { fontSize: 16, color: '#111', textTransform: 'capitalize' },
  buttonContainer: { flexDirection: 'row', gap: 12 },
  editButton: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  editButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  deleteButton: { flex: 1, backgroundColor: '#FF6B6B', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  deleteButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.5 },
  errorText: { fontSize: 18, color: '#666', marginBottom: 20 },
  backButton: { backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
