import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const [currency, setCurrency] = useState('€');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fetchExpenses = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const uid = currentUser.uid;
    try {
      const userFamily = await getUserFamily(uid);
      
      if (userFamily?.id) {
        // Récupérer la devise de la famille
        const familyRef = doc(db, 'families', userFamily.id);
        const familySnap = await getDoc(familyRef);
        if (familySnap.exists()) {
          const currencyCode = familySnap.data().currency || 'EUR';
          const currencySymbols: { [key: string]: string } = {
            'EUR': '€',
            'USD': '$',
            'GBP': '£',
            'CHF': 'CHF',
            'CAD': 'CAD',
            'JPY': '¥'
          };
          setCurrency(currencySymbols[currencyCode] || '€');
        }

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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.tint }]}>Dépenses</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={[styles.settingsButton, { backgroundColor: colors.secondaryCardBackground }]}
                onPress={() => router.push('/budget-settings')}
              >
                <Text style={[styles.settingsButtonText, { color: colors.tint }]}>Paramètres</Text>
                <IconSymbol name="gearshape.fill" size={20} color={colors.tint} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary Cards */}
          <View style={styles.summarySection}>
            <View style={[styles.summaryCard, { backgroundColor: colors.secondaryCardBackground }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total dépenses</Text>
              <Text style={[styles.summaryAmount, { color: colors.text }]}>{totalExpenses.toFixed(2)} {currency}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.tertiaryCardBackground }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Mes dépenses</Text>
              <Text style={[styles.summaryAmount, { color: colors.text }]}>{myShare.toFixed(2)} {currency}</Text>
            </View>
          </View>

          {/* Budget Categories */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.tint }]}>Budgets par catégorie</Text>
              {categories.map((category: any, index: number) => {
                const spent = getCategorySpent(category.name);
                const percentage = (spent / category.limit) * 100;
                const isOverBudget = spent > category.limit;

                return (
                  <View key={index} style={[styles.budgetCard, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.budgetHeader}>
                      <Text style={[styles.budgetName, { color: colors.text }]}>{category.name}</Text>
                      <Text style={[styles.budgetAmount, { color: colors.textSecondary }, isOverBudget && styles.overBudget]}>
                        {spent.toFixed(2)} {currency} / {category.limit.toFixed(2)} {currency}
                      </Text>
                    </View>
                    <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: isOverBudget ? colors.dangerButton : colors.progressBar
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
              style={[styles.addButton, { backgroundColor: colors.primaryButton }]}
              onPress={() => router.push('/add-expense')}
            >
              <IconSymbol name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Ajouter une dépense</Text>
            </TouchableOpacity>
          </View>

          {/* Expenses List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Historique des dépenses</Text>
            {expenses.length > 0 ? (
              expenses.map((expense: any) => (
                <TouchableOpacity 
                  key={expense.id} 
                  style={[styles.expenseCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push(`/expense-details?expenseId=${expense.id}`)}
                >
                  <View style={[styles.expenseIcon, { backgroundColor: colors.secondaryCardBackground }]}>
                    <IconSymbol name="creditcard.fill" size={24} color={colors.tint} />
                  </View>
                  <View style={styles.expenseDetails}>
                    <Text style={[styles.expenseTitle, { color: colors.text }]}>{expense.description}</Text>
                    <View style={styles.expenseMetaRow}>
                      <Text style={[styles.expenseCategory, { color: colors.tint }]}>{expense.category || 'Non catégorisé'}</Text>
                      <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>
                        {expense.date?.toDate ? new Date(expense.date.toDate()).toLocaleDateString('fr-FR') : 'Date inconnue'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.expenseAmount, { color: colors.tint }]}>{expense.amount?.toFixed(2)} {currency}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune dépense enregistrée</Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACING.large, paddingTop: V_SPACING.large, paddingBottom: SAFE_BOTTOM_SPACING },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: V_SPACING.xlarge },
  title: { fontSize: FONT_SIZES.huge, fontWeight: '700' },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(10),
    borderRadius: BORDER_RADIUS.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  settingsButtonText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  summarySection: { flexDirection: 'row', gap: SPACING.medium, marginBottom: V_SPACING.xlarge },
  summaryCard: { flex: 1, borderRadius: BORDER_RADIUS.large, padding: SPACING.large, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: vs(2) }, shadowRadius: hs(8), elevation: 2 },
  summaryLabel: { fontSize: FONT_SIZES.regular, marginBottom: V_SPACING.small },
  summaryAmount: { fontSize: FONT_SIZES.xxlarge, fontWeight: '800' },
  section: { marginBottom: V_SPACING.xxlarge },
  sectionTitle: { fontSize: FONT_SIZES.xlarge, fontWeight: '600', marginBottom: V_SPACING.regular },
  budgetCard: { borderRadius: BORDER_RADIUS.medium, padding: SPACING.regular, marginBottom: V_SPACING.medium },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: V_SPACING.medium },
  budgetName: { fontSize: FONT_SIZES.medium, fontWeight: '600' },
  budgetAmount: { fontSize: FONT_SIZES.regular, fontWeight: '600' },
  overBudget: { color: '#FF6B6B' },
  progressBarContainer: { height: vs(8), borderRadius: hs(4), overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: hs(4) },
  addButton: { borderRadius: BORDER_RADIUS.large, paddingVertical: V_SPACING.regular, paddingHorizontal: SPACING.large, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: vs(4) }, shadowRadius: hs(10), elevation: 3 },
  addButtonText: { color: '#fff', fontSize: FONT_SIZES.medium, fontWeight: '700', marginLeft: SPACING.small },
  expenseCard: { borderRadius: BORDER_RADIUS.large, padding: SPACING.regular, marginBottom: V_SPACING.medium, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: vs(2) }, shadowRadius: hs(8), elevation: 2 },
  expenseIcon: { width: hs(50), height: hs(50), borderRadius: hs(25), justifyContent: 'center', alignItems: 'center', marginRight: SPACING.regular },
  expenseDetails: { flex: 1 },
  expenseTitle: { fontSize: FONT_SIZES.medium, fontWeight: '600', marginBottom: V_SPACING.tiny },
  expenseMetaRow: { flexDirection: 'row', gap: SPACING.medium },
  expenseCategory: { fontSize: FONT_SIZES.small, fontWeight: '600' },
  expenseDate: { fontSize: FONT_SIZES.small },
  expenseAmount: { fontSize: FONT_SIZES.large, fontWeight: '800' },
  rowCard: { borderRadius: BORDER_RADIUS.large, paddingVertical: V_SPACING.large, paddingHorizontal: SPACING.large, justifyContent: 'center', minHeight: vs(60) },
  emptyText: { textAlign: 'center', fontSize: FONT_SIZES.regular },
});
