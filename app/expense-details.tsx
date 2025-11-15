import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../constants/firebase';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const { expenseId } = useLocalSearchParams();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchExpense = async () => {
      if (!expenseId || typeof expenseId !== 'string') return;
      
      try {
        const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));
        if (expenseDoc.exists()) {
          setExpense({ id: expenseDoc.id, ...expenseDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching expense:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [expenseId]);

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
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.containerCentered}>
            <ActivityIndicator size="large" color="#87CEEB" />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!expense) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.containerCentered}>
            <Text style={styles.errorText}>Dépense introuvable</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>{expense.description}</Text>
              <Text style={styles.amount}>{expense.amount?.toFixed(2)} €</Text>
            </View>

            {expense.receiptUrl && (
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Ticket de caisse</Text>
                <Image source={{ uri: expense.receiptUrl }} style={styles.receiptImage} />
              </View>
            )}

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📦 Catégorie</Text>
                <Text style={styles.infoValue}>{expense.category || 'Non catégorisé'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📅 Date</Text>
                <Text style={styles.infoValue}>
                  {expense.date?.toDate ? expense.date.toDate().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  }) : 'Date inconnue'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => router.push(`/edit-expense?expenseId=${expense.id}`)}
              >
                <IconSymbol name="pencil" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>

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
