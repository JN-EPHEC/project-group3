import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCurrencySymbol } from '../../constants/currencies';
import { auth, db, getUserFamilies } from '../../constants/firebase';

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
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyIndex, setSelectedFamilyIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [familyMembersData, setFamilyMembersData] = useState<{ [uid: string]: { firstName: string; lastName: string; profileImage?: string } }>({});
  const [balance, setBalance] = useState(0);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'category' | 'amount'>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/(auth)/LoginScreen');
      return;
    }
    setUser(currentUser);
    const uid = currentUser.uid;

    const userDocRef = doc(db, 'users', uid);
    const unsubUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setFirstName(doc.data().firstName || 'Utilisateur');
      }
    });

    const loadFamilies = async () => {
      setLoading(true);
      try {
        const userFamilies = await getUserFamilies(uid);
        setFamilies(userFamilies || []);
        if (userFamilies && userFamilies.length > 0) {
          setSelectedFamilyIndex((prev) => Math.min(prev, userFamilies.length - 1));
        } else {
          setSelectedFamilyIndex(0);
        }
      } catch (error) {
        console.error('Error fetching families:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFamilies();

    return () => {
      unsubUser();
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const activeFamily = families[selectedFamilyIndex];

    if (!activeFamily) {
      setExpenses([]);
      setCategories([]);
      return;
    }

    setLoading(true);
    setExpenses([]);
    setTotalExpenses(0);
    setMyShare(0);
    setPartnerShare(0);

    let unsubExpenses = () => {};
    let unsubBudgets = () => {};
    let unsubFamily = () => {};

    try {
      const familyId = activeFamily.id;

      // Currency listener for active family
      const familyRef = doc(db, 'families', familyId);
      unsubFamily = onSnapshot(familyRef, async (familySnap) => {
        if (familySnap.exists()) {
          const currencyCode = familySnap.data().currency || 'EUR';
          setCurrency(getCurrencySymbol(currencyCode));
          
          // Fetch family members data for display
          const memberIds = familySnap.data().members || [];
          if (memberIds.length > 0) {
            const membersQuery = query(collection(db, 'users'), where('__name__', 'in', memberIds));
            const membersSnapshot = await getDocs(membersQuery);
            const membersMap: { [uid: string]: { firstName: string; lastName: string; profileImage?: string } } = {};
            membersSnapshot.docs.forEach(doc => {
              membersMap[doc.id] = {
                firstName: doc.data().firstName || 'Membre',
                lastName: doc.data().lastName || '',
                profileImage: doc.data().profileImage
              };
            });
            setFamilyMembersData(membersMap);
          }
        }
      });

      // Expenses for active family only
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('familyId', '==', familyId),
        orderBy('date', 'desc')
      );
      unsubExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
        let expensesList = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Trier les dépenses selon le critère sélectionné
        expensesList.sort((a: any, b: any) => {
          if (sortBy === 'date') {
            const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
            const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
            return dateB - dateA; // Plus récent en premier
          } else if (sortBy === 'category') {
            return (a.category || '').localeCompare(b.category || '');
          } else if (sortBy === 'amount') {
            return (b.amount || 0) - (a.amount || 0); // Plus grand montant en premier
          }
          return 0;
        });
        
        setExpenses(expensesList);

        const total = expensesList.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        setTotalExpenses(total);
        
        const myExpenses = expensesList
          .filter(exp => exp.paidBy === uid && exp.approvalStatus !== 'PENDING_APPROVAL')
          .reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        setMyShare(myExpenses);
        setPartnerShare(total - myExpenses);
        
        // Calculate balance: positive means you are owed, negative means you owe
        const halfTotal = total / 2;
        const calculatedBalance = myExpenses - halfTotal;
        setBalance(calculatedBalance);
        
        setLoading(false);
      });

      // Budget categories for active family
      const budgetDocRef = doc(db, 'budgets', familyId);
      unsubBudgets = onSnapshot(budgetDocRef, (budgetDoc) => {
        if (budgetDoc.exists()) {
          setCategories(budgetDoc.data().categories || []);
        } else {
          setCategories([]);
        }
      });
    } catch (error) {
      console.error('Error setting up listeners:', error);
      setLoading(false);
    }

    return () => {
      unsubExpenses();
      unsubBudgets();
      unsubFamily();
    };
  }, [user, families, selectedFamilyIndex, sortBy]); // Re-charger quand le tri change

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

          {/* Sélecteur de famille */}
          {families.length > 0 && (
            <View style={styles.familySelector}>
              <Text style={[styles.familySelectorLabel, { color: colors.textSecondary }]}>Famille active</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyChipsContainer}>
                {families.map((family, index) => (
                  <TouchableOpacity
                    key={family.id}
                    style={[
                      styles.familyChip,
                      {
                        backgroundColor: selectedFamilyIndex === index ? colors.tint : colors.secondaryCardBackground,
                        borderColor: selectedFamilyIndex === index ? colors.tint : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedFamilyIndex(index)}
                  >
                    <Text style={[styles.familyChipText, { color: selectedFamilyIndex === index ? '#fff' : colors.text }]}>
                      {family.name || `Famille ${index + 1}`}
                    </Text>
                    <Text style={[styles.familyChipCode, { color: selectedFamilyIndex === index ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                      Code: {family.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Summary Cards */}
          <View style={styles.summarySection}>
            <View style={[styles.summaryCard, { backgroundColor: colors.secondaryCardBackground }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total dépenses</Text>
              <Text style={[styles.summaryAmount, { color: colors.text }]}>{totalExpenses.toFixed(2)} {currency}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.tertiaryCardBackground }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
              <Text style={[styles.summaryAmount, { color: balance >= 0 ? colors.progressBar : colors.dangerButton }]}>
                {balance >= 0 ? '+' : ''}{balance.toFixed(2)} {currency}
              </Text>
              <Text style={[styles.balanceHint, { color: colors.textSecondary }]}>
                {balance >= 0 ? 'À recevoir' : 'À rembourser'}
              </Text>
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

          {/* Expenses List */}
          <View style={styles.section}>
            <View style={styles.expensesHeader}>
              <Text style={[styles.sectionTitle, { color: colors.tint }]}>Historique des dépenses</Text>
              <TouchableOpacity
                style={[styles.sortButton, { backgroundColor: colors.cardBackground }]}
                onPress={() => setShowSortMenu(!showSortMenu)}
              >
                <IconSymbol name="arrow.up.arrow.down" size={18} color={colors.tint} />
                <Text style={[styles.sortButtonText, { color: colors.tint }]}>Trier</Text>
              </TouchableOpacity>
            </View>

            {/* Sort Menu */}
            {showSortMenu && (
              <View style={[styles.sortMenu, { backgroundColor: colors.cardBackground }]}>
                <TouchableOpacity
                  style={styles.sortOption}
                  onPress={() => {
                    setSortBy('date');
                    setShowSortMenu(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, { color: sortBy === 'date' ? colors.tint : colors.text }]}>
                    Par date
                  </Text>
                  {sortBy === 'date' && <IconSymbol name="checkmark" size={18} color={colors.tint} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sortOption}
                  onPress={() => {
                    setSortBy('category');
                    setShowSortMenu(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, { color: sortBy === 'category' ? colors.tint : colors.text }]}>
                    Par catégorie
                  </Text>
                  {sortBy === 'category' && <IconSymbol name="checkmark" size={18} color={colors.tint} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sortOption}
                  onPress={() => {
                    setSortBy('amount');
                    setShowSortMenu(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, { color: sortBy === 'amount' ? colors.tint : colors.text }]}>
                    Par montant
                  </Text>
                  {sortBy === 'amount' && <IconSymbol name="checkmark" size={18} color={colors.tint} />}
                </TouchableOpacity>
              </View>
            )}

            {expenses.length > 0 ? (
              <>
                {(showAllExpenses ? expenses : expenses.slice(0, 4)).map((expense: any) => {
                  const payer = familyMembersData[expense.paidBy];
                  const payerName = payer ? `${payer.firstName} ${payer.lastName}` : 'Membre';
                  const payerInitials = payer ? `${payer.firstName.charAt(0)}${payer.lastName.charAt(0)}` : 'M';
                  const isPending = expense.approvalStatus === 'PENDING_APPROVAL';
                  
                  return (
                    <TouchableOpacity 
                      key={expense.id} 
                      style={[styles.expenseCard, { backgroundColor: colors.cardBackground }]}
                      onPress={() => router.push(`/expense-details?expenseId=${expense.id}`)}
                    >
                      <View style={[styles.avatarBubble, { backgroundColor: colors.tint }]}>
                        <Text style={styles.avatarText}>{payerInitials}</Text>
                      </View>
                      <View style={styles.expenseDetails}>
                        <View style={styles.expenseTopRow}>
                          <Text style={[styles.expenseTitle, { color: colors.text }]}>{payerName}</Text>
                          <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>
                            {expense.date?.toDate ? new Date(expense.date.toDate()).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date inconnue'}
                          </Text>
                        </View>
                        <View style={styles.expenseBottomRow}>
                          <Text style={[styles.expenseCategory, { color: colors.tint }]}>{expense.category || 'Non catégorisé'}</Text>
                          {isPending && <Text style={[styles.pendingBadge, { color: colors.dangerButton }]}>En attente</Text>}
                        </View>
                      </View>
                      <Text style={[styles.expenseAmount, { color: isPending ? colors.textSecondary : colors.tint }]}>{expense.amount?.toFixed(2)} {expense.currency ? getCurrencySymbol(expense.currency) : currency}</Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Voir plus / Voir moins button */}
                {expenses.length > 4 && (
                  <TouchableOpacity
                    style={[styles.seeMoreButton, { backgroundColor: colors.cardBackground }]}
                    onPress={() => setShowAllExpenses(!showAllExpenses)}
                  >
                    <Text style={[styles.seeMoreButtonText, { color: colors.tint }]}>
                      {showAllExpenses ? 'Voir moins' : `Voir plus (${expenses.length - 4})`}
                    </Text>
                    <IconSymbol 
                      name={showAllExpenses ? 'chevron.up' : 'chevron.down'} 
                      size={18} 
                      color={colors.tint} 
                    />
                  </TouchableOpacity>
                )}

                {/* Add Expense Button */}
                <TouchableOpacity
                  style={[styles.addExpenseButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push('/add-expense')}
                >
                  <IconSymbol name="plus" size={20} color={colors.tint} />
                  <Text style={[styles.addExpenseButtonText, { color: colors.tint }]}>Nouvelle dépense</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune dépense enregistrée</Text>
                </View>
                {/* Add Expense Button */}
                <TouchableOpacity
                  style={[styles.addExpenseButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push('/add-expense')}
                >
                  <IconSymbol name="plus" size={20} color={colors.tint} />
                  <Text style={[styles.addExpenseButtonText, { color: colors.tint }]}>Nouvelle dépense</Text>
                </TouchableOpacity>
              </>
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
  container: { flex: 1, paddingHorizontal: SPACING.large, paddingTop: V_SPACING.large, paddingBottom: V_SPACING.xxlarge },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: V_SPACING.xlarge },
  title: { fontSize: FONT_SIZES.huge, fontWeight: '700' },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familySelector: {
    marginBottom: V_SPACING.large,
  },
  familySelectorLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginBottom: V_SPACING.tiny,
  },
  familyChipsContainer: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  familyChip: {
    paddingVertical: vs(10),
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 2,
    minWidth: hs(120),
    marginRight: SPACING.small,
  },
  familyChipText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  familyChipCode: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginTop: V_SPACING.tiny,
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
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.regular,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.medium,
  },
  sortButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  sortMenu: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.small,
    marginBottom: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(4),
    elevation: 3,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: V_SPACING.small,
    paddingHorizontal: SPACING.regular,
  },
  sortOptionText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '500',
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.small,
    paddingVertical: V_SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    marginTop: V_SPACING.medium,
  },
  seeMoreButtonText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  addExpenseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.small,
    paddingVertical: V_SPACING.regular,
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.medium,
    marginTop: V_SPACING.medium,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 2,
  },
  addExpenseButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  expenseCard: { borderRadius: BORDER_RADIUS.large, padding: SPACING.regular, marginBottom: V_SPACING.medium, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: vs(2) }, shadowRadius: hs(8), elevation: 2 },
  avatarBubble: { width: hs(50), height: hs(50), borderRadius: hs(25), justifyContent: 'center', alignItems: 'center', marginRight: SPACING.regular },
  avatarText: { color: '#fff', fontSize: FONT_SIZES.medium, fontWeight: '700' },
  expenseDetails: { flex: 1 },
  expenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: V_SPACING.tiny },
  expenseTitle: { fontSize: FONT_SIZES.medium, fontWeight: '600', flex: 1 },
  expenseBottomRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.small },
  expenseCategory: { fontSize: FONT_SIZES.small, fontWeight: '600' },
  expenseDate: { fontSize: FONT_SIZES.small },
  expenseAmount: { fontSize: FONT_SIZES.large, fontWeight: '800', marginLeft: SPACING.small },
  pendingBadge: { fontSize: FONT_SIZES.tiny, fontStyle: 'italic' },
  balanceHint: { fontSize: FONT_SIZES.tiny, marginTop: vs(2) },
  rowCard: { borderRadius: BORDER_RADIUS.large, paddingVertical: V_SPACING.large, paddingHorizontal: SPACING.large, justifyContent: 'center', minHeight: vs(60) },
  emptyText: { textAlign: 'center', fontSize: FONT_SIZES.regular },
});
