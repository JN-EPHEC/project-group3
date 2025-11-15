import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily } from '../../constants/firebase';

export default function DepensesScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [myShare, setMyShare] = useState(0);
  const [partnerShare, setPartnerShare] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  const fetchExpenses = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const uid = currentUser.uid;
    try {
      const userFamily = await getUserFamily(uid);
      
      if (userFamily?.id) {
        // Récupérer les dépenses
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('familyId', '==', userFamily.id),
          orderBy('date', 'desc')
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesList = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExpenses(expensesList);

        // Calculer les totaux
        const total = expensesList.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
        setTotalExpenses(total);
        
        const myExpenses = expensesList
          .filter((exp: any) => exp.paidBy === uid)
          .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
        
        const partnerExpenses = total - myExpenses;
        setMyShare(myExpenses);
        setPartnerShare(partnerExpenses);

        // Récupérer les catégories de budget
        const budgetDoc = await getDoc(doc(db, 'budgets', userFamily.id));
        if (budgetDoc.exists()) {
          setCategories(budgetDoc.data().categories || []);
        }
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [fetchExpenses])
  );

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const uid = currentUser.uid;

      const fetchData = async () => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setFirstName(userDocSnap.data().firstName || 'Utilisateur');
          }

          await fetchExpenses();
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
  }, [router, fetchExpenses]);

  const getCategoryBudget = (categoryName: string) => {
    const category = categories.find((c: any) => c.name === categoryName);
    return category?.limit || 0;
  };

  const getCategorySpent = (categoryName: string) => {
    return expenses
      .filter((exp: any) => exp.category === categoryName)
      .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Dépenses</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => router.push('/budget-settings')}
              >
                <Text style={styles.settingsButtonText}>Paramètres</Text>
                <IconSymbol name="gearshape.fill" size={20} color="#87CEEB" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary Cards */}
          <View style={styles.summarySection}>
            <View style={[styles.summaryCard, { backgroundColor: '#E7F7FF' }]}>
              <Text style={styles.summaryLabel}>Total dépenses</Text>
              <Text style={styles.summaryAmount}>{totalExpenses.toFixed(2)} €</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FFF4E7' }]}>
              <Text style={styles.summaryLabel}>Mes dépenses</Text>
              <Text style={styles.summaryAmount}>{myShare.toFixed(2)} €</Text>
            </View>
          </View>

          {/* Budget Categories */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Budgets par catégorie</Text>
              {categories.map((category: any, index: number) => {
                const spent = getCategorySpent(category.name);
                const percentage = (spent / category.limit) * 100;
                const isOverBudget = spent > category.limit;

                return (
                  <View key={index} style={styles.budgetCard}>
                    <View style={styles.budgetHeader}>
                      <Text style={styles.budgetName}>{category.name}</Text>
                      <Text style={[styles.budgetAmount, isOverBudget && styles.overBudget]}>
                        {spent.toFixed(2)} € / {category.limit.toFixed(2)} €
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: isOverBudget ? '#FF6B6B' : '#87CEEB'
                          }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Add Expense Button */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/add-expense')}
            >
              <IconSymbol name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Ajouter une dépense</Text>
            </TouchableOpacity>
          </View>

          {/* Expenses List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Historique des dépenses</Text>
            {expenses.length > 0 ? (
              expenses.map((expense: any) => (
                <TouchableOpacity 
                  key={expense.id} 
                  style={styles.expenseCard}
                  onPress={() => router.push(`/expense-details?expenseId=${expense.id}`)}
                >
                  <View style={styles.expenseIcon}>
                    <IconSymbol name="creditcard.fill" size={24} color="#87CEEB" />
                  </View>
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseTitle}>{expense.description}</Text>
                    <View style={styles.expenseMetaRow}>
                      <Text style={styles.expenseCategory}>{expense.category || 'Non catégorisé'}</Text>
                      <Text style={styles.expenseDate}>
                        {expense.date?.toDate ? new Date(expense.date.toDate()).toLocaleDateString('fr-FR') : 'Date inconnue'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.expenseAmount}>{expense.amount?.toFixed(2)} €</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.rowCard}>
                <Text style={styles.emptyText}>Aucune dépense enregistrée</Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#87CEEB' },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    backgroundColor: '#E7F7FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '600',
  },
  summarySection: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  summaryLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  summaryAmount: { fontSize: 24, fontWeight: '800', color: '#111' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  budgetCard: { backgroundColor: '#F5F5F5', borderRadius: 16, padding: 16, marginBottom: 12 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetName: { fontSize: 16, fontWeight: '600', color: '#111' },
  budgetAmount: { fontSize: 14, fontWeight: '600', color: '#666' },
  overBudget: { color: '#FF6B6B' },
  progressBarContainer: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  addButton: { backgroundColor: '#87CEEB', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  expenseCard: { backgroundColor: '#E8E8E8', borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  expenseIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E7F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  expenseDetails: { flex: 1 },
  expenseTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 4 },
  expenseMetaRow: { flexDirection: 'row', gap: 12 },
  expenseCategory: { fontSize: 13, color: '#87CEEB', fontWeight: '600' },
  expenseDate: { fontSize: 13, color: '#666' },
  expenseAmount: { fontSize: 18, fontWeight: '800', color: '#87CEEB' },
  rowCard: { backgroundColor: '#E8E8E8', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 20, justifyContent: 'center', minHeight: 60 },
  emptyText: { color: '#B0B0B0', textAlign: 'center', fontSize: 15 },
});
