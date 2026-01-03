import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { getCurrencySymbol } from '../../constants/currencies';
import { auth, db, getUserFamilies } from '../../constants/firebase';

export default function DepensesScreen() {
  const router = useRouter();
  const [activeFamily, setActiveFamily] = useState<any | null>(null);
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentNote, setRepaymentNote] = useState('');
  const [submittingRepayment, setSubmittingRepayment] = useState(false);
  const [pendingExpenseApprovalsCount, setPendingExpenseApprovalsCount] = useState(0);
  const [pendingCategoryApprovalsCount, setPendingCategoryApprovalsCount] = useState(0);
  const [pendingBudgetRequestsCount, setPendingBudgetRequestsCount] = useState(0);
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

  // Listen to pending category approvals count
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    getDoc(userDocRef).then((userDoc) => {
      if (!userDoc.exists()) return;

      let familyIds: string[] = userDoc.data().familyIds || [];
      const legacyFamilyId = userDoc.data().familyId;
      if (legacyFamilyId && !familyIds.includes(legacyFamilyId)) {
        familyIds = [legacyFamilyId, ...familyIds];
      }

      if (familyIds.length === 0) {
        setPendingCategoryApprovalsCount(0);
        return;
      }

      const approvalsRef = collection(db, 'categoryApprovals');
      const q = query(
        approvalsRef,
        where('familyId', 'in', familyIds.slice(0, 10)),
        where('status', '==', 'PENDING')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const count = snapshot.docs.filter(
          (doc) => doc.data().requestedBy !== currentUser.uid
        ).length;
        setPendingCategoryApprovalsCount(count);
      });

      return () => unsubscribe();
    });
  }, []);

  // Listen to pending expense approvals count
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    getDoc(userDocRef).then((userDoc) => {
      if (!userDoc.exists()) return;

      let familyIds: string[] = userDoc.data().familyIds || [];
      const legacyFamilyId = userDoc.data().familyId;
      if (legacyFamilyId && !familyIds.includes(legacyFamilyId)) {
        familyIds = [legacyFamilyId, ...familyIds];
      }

      if (familyIds.length === 0) {
        setPendingExpenseApprovalsCount(0);
        return;
      }

      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('familyId', 'in', familyIds.slice(0, 10)),
        where('approvalStatus', '==', 'PENDING_APPROVAL')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const count = snapshot.docs.filter(
          (doc) => doc.data().paidBy !== currentUser.uid
        ).length;
        setPendingExpenseApprovalsCount(count);
      });

      return () => unsubscribe();
    });
  }, []);

  // Listen to pending budget change requests count (active family only)
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || !activeFamily?.id) {
      setPendingBudgetRequestsCount(0);
      return;
    }

    const budgetRequestsRef = collection(db, 'budgetChangeRequests');
    const qPending = query(
      budgetRequestsRef,
      where('familyId', '==', activeFamily.id),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(qPending, (snapshot) => {
      const count = snapshot.docs.filter(
        (d) => d.data().requestedBy !== currentUser.uid
      ).length;
      setPendingBudgetRequestsCount(count);
    });

    return () => unsubscribe();
  }, [activeFamily?.id]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const activeFam = families[selectedFamilyIndex];
    setActiveFamily(activeFam || null);

    if (!activeFam) {
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
      const familyId = activeFam.id;

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
                profileImage: doc.data().profileImage || doc.data().photoURL
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
        const dir = sortOrder === 'asc' ? 1 : -1;
        expensesList.sort((a: any, b: any) => {
          if (sortBy === 'date') {
            const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
            const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
            return (dateA - dateB) * dir;
          } else if (sortBy === 'category') {
            const cmp = (a.category || '').localeCompare(b.category || '');
            return cmp * dir;
          } else if (sortBy === 'amount') {
            const diff = (a.amount || 0) - (b.amount || 0);
            return diff * dir;
          }
          return 0;
        });
        
        setExpenses(expensesList);

        // Calculer avec TOUTES les dépenses APPROUVÉES (cumulatif, pas limité par mois)
        const approvedExpenses = expensesList.filter(exp => exp.approvalStatus === 'APPROVED' || !exp.approvalStatus);

        // Séparer les remboursements pour ne pas les diviser par 2
        const standardExpenses = approvedExpenses.filter(exp => !exp.isRepayment);
        const repaymentExpenses = approvedExpenses.filter(exp => exp.isRepayment);
        
        const total = standardExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        setTotalExpenses(total);
        
        const myExpenses = standardExpenses
          .filter(exp => exp.paidBy === uid)
          .reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        setMyShare(myExpenses);
        setPartnerShare(total - myExpenses);
        
        // Calculate balance: positive means you are owed, negative means you owe
        const halfTotal = total / 2;
        let calculatedBalance = myExpenses - halfTotal;

        // Appliquer les remboursements en entier (ne pas diviser par 2)
        repaymentExpenses.forEach((exp) => {
          const amount = exp.amount || 0;
          calculatedBalance += exp.paidBy === uid ? amount : -amount;
        });

        setBalance(calculatedBalance);
        
        setLoading(false);
      });

      // Budget categories for active family
      const budgetDocRef = doc(db, 'budgets', familyId);
      unsubBudgets = onSnapshot(budgetDocRef, (budgetDoc) => {
        if (budgetDoc.exists()) {
          const data = budgetDoc.data();
          const rules = data.categoryRules || data.categoryLimits || {};
          const categoryArray = Object.entries(rules)
            .filter(([_, value]) => value !== null && value !== undefined)
            .map(([name, value]: any) => {
              if (typeof value === 'number') {
                return { name, limit: value, allowOverLimit: false, period: 'monthly' };
              }
              return { 
                name, 
                limit: value?.limit ?? 0, 
                allowOverLimit: !!value?.allowOverLimit,
                period: value?.period || 'monthly'
              };
            });
          setCategories(categoryArray);
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
  }, [user, families, selectedFamilyIndex, sortBy, sortOrder]); // Re-charger quand le tri change

  const getCategoryBudget = (categoryName: string) => {
    const category = categories.find((c: any) => c.name === categoryName);
    return category?.limit || 0;
  };

  const getCategorySpent = (categoryName: string) => {
    const category = categories.find((c: any) => c.name === categoryName);
    const period = category?.period || 'monthly'; // Par défaut mensuel
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'yearly') {
      // Du 1er janvier au 31 décembre de l'année en cours
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      // Du 1er au dernier jour du mois en cours (mensuel par défaut)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // Calculer uniquement avec les dépenses APPROUVÉES de la période
    return expenses
      .filter((exp: any) => {
        if (exp.category !== categoryName) return false;
        if (exp.approvalStatus !== 'APPROVED' && exp.approvalStatus) return false;
        
        const expDate = exp.date?.toDate ? exp.date.toDate() : null;
        if (!expDate) return false;
        
        return expDate >= startDate && expDate <= endDate;
      })
      .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  };

  const handleRepayment = async () => {
    if (!repaymentAmount.trim() || !activeFamily?.id || !user) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    const sanitized = repaymentAmount.replace(',', '.');
    const parsedAmount = parseFloat(sanitized);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    const amount = Math.round(parsedAmount * 100) / 100; // montant exact à 2 décimales

    // Vérifier que le montant ne dépasse pas la dette
    const maxRepayment = Math.abs(balance);
    if (balance >= 0) {
      Alert.alert('Information', 'Vous n\'avez pas de dette à rembourser');
      return;
    }
    if (amount > maxRepayment) {
      Alert.alert('Erreur', `Le montant ne peut pas dépasser votre dette de ${maxRepayment.toFixed(2)} ${currency}`);
      return;
    }

    setSubmittingRepayment(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userName = userDoc.exists() ? `${userDoc.data().firstName || ''} ${userDoc.data().lastName || ''}`.trim() || 'Utilisateur' : 'Utilisateur';

      // Créer une dépense de remboursement
      await addDoc(collection(db, 'expenses'), {
        description: `Remboursement${repaymentNote ? ': ' + repaymentNote : ''}`,
        amount: amount,
        category: 'Remboursement',
        currency: activeFamily.currency || 'EUR',
        paidBy: user.uid,
        familyId: activeFamily.id,
        date: new Date(),
        approvalStatus: 'PENDING_APPROVAL',
        isRepayment: true,
        createdAt: new Date(),
      });

      Alert.alert(
        '✅ Remboursement envoyé',
        `Votre remboursement de ${amount.toFixed(2)} ${currency} a été envoyé pour approbation.`
      );

      setShowRepaymentModal(false);
      setRepaymentAmount('');
      setRepaymentNote('');
    } catch (error) {
      console.error('Error creating repayment:', error);
      Alert.alert('Erreur', 'Impossible de créer le remboursement');
    } finally {
      setSubmittingRepayment(false);
    }
  };

  const filteredExpenses = expenses.filter((exp: any) => {
    if (filterCategory && exp.category !== filterCategory) return false;
    if (filterDate) {
      const expDate = exp.date?.toDate ? exp.date.toDate() : null;
      if (!expDate) return false;
      const sameDay = expDate.toDateString() === filterDate.toDateString();
      if (!sameDay) return false;
    }
    const amount = exp.amount || 0;
    const min = filterAmountMin ? parseFloat(filterAmountMin) : null;
    const max = filterAmountMax ? parseFloat(filterAmountMax) : null;
    if (min !== null && !isNaN(min) && amount < min) return false;
    if (max !== null && !isNaN(max) && amount > max) return false;
    return true;
  });

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
                style={[styles.settingsButton, { backgroundColor: colors.secondaryCardBackground, position: 'relative' }]}
                onPress={() => router.push({ pathname: '/budget-settings', params: { familyId: activeFamily?.id, familyName: activeFamily?.name } })}
              >
                <Text style={[styles.settingsButtonText, { color: colors.tint }]}>Paramètres</Text>
                <IconSymbol name="gearshape.fill" size={20} color={colors.tint} />
                {pendingBudgetRequestsCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: '#FF3B30' }]}>
                    <Text style={styles.notificationBadgeText}>{pendingBudgetRequestsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sélecteur de famille */}
          {families.length > 0 && (
            <View style={styles.familySelector}>
              <Text style={[styles.familySelectorLabel, { color: colors.textSecondary }]}>Famille active: {activeFamily?.name || families[selectedFamilyIndex]?.name || `Famille ${selectedFamilyIndex + 1}`}</Text>
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
            <TouchableOpacity 
              style={[styles.summaryCard, { backgroundColor: colors.tertiaryCardBackground }]}
              onPress={() => balance < 0 && setShowRepaymentModal(true)}
              disabled={balance >= 0}
            >
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
              <Text style={[styles.summaryAmount, { color: balance >= 0 ? colors.progressBar : colors.dangerButton }]}>
                {balance >= 0 ? '+' : ''}{balance.toFixed(2)} {currency}
              </Text>
              {balance >= 0 ? (
                <View style={styles.repayRow}>
                  <Text style={[styles.balanceHint, { color: colors.textSecondary }]}>À recevoir</Text>
                </View>
              ) : (
                <View style={styles.repayRow}>
                  <View style={[styles.repayChip, { backgroundColor: colors.tint }]}>
                    <Text style={styles.repayChipText}>Rembourser</Text>
                    <IconSymbol name="chevron.right" size={16} color="#fff" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsSection}>
            <TouchableOpacity
              style={[styles.primaryActionButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push({ pathname: '/add-expense', params: { familyId: activeFamily?.id, familyName: activeFamily?.name } })}
            >
              <IconSymbol name="plus.circle.fill" size={24} color="#fff" />
              <Text style={styles.primaryActionButtonText}>Nouvelle dépense</Text>
            </TouchableOpacity>

            {pendingExpenseApprovalsCount > 0 && (
              <TouchableOpacity
                style={[styles.approvalsActionButton, { backgroundColor: '#FF9500', borderColor: '#FF9500' }]}
                onPress={() => router.push('/expense-approvals')}
              >
                <View style={styles.approvalsBadge}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#fff" />
                  <Text style={styles.approvalsBadgeCount}>{pendingExpenseApprovalsCount}</Text>
                </View>
                <Text style={styles.approvalsActionButtonText}>
                  {pendingExpenseApprovalsCount === 1 ? 'Dépense à approuver' : `${pendingExpenseApprovalsCount} dépenses à approuver`}
                </Text>
                <IconSymbol name="chevron.right" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Budget Categories */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.tint }]}>Budgets par catégorie</Text>
                <View style={styles.budgetActions}>
                  {pendingCategoryApprovalsCount > 0 && (
                    <TouchableOpacity
                      style={[styles.approvalsButton, { backgroundColor: colors.dangerButton }]}
                      onPress={() => router.push('/category-approvals')}
                    >
                      <IconSymbol name="bell.badge" size={16} color="#fff" />
                      <Text style={styles.approvalsButtonText}>{pendingCategoryApprovalsCount}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.settingsIconButton, { backgroundColor: colors.cardBackground }]}
                    onPress={() => router.push({ pathname: '/budget-settings', params: { familyId: activeFamily?.id, familyName: activeFamily?.name } })}
                  >
                    <IconSymbol name="gearshape" size={18} color={colors.tint} />
                  </TouchableOpacity>
                </View>
              </View>
              {categories.map((category: any, index: number) => {
                const name = category?.name || String(category);
                const limit = typeof category?.limit === 'number' ? category.limit : 0;
                const period = category?.period || 'monthly';
                const noLimit = !isFinite(limit) || limit <= 0;
                const spent = getCategorySpent(name);
                const percentage = !noLimit && limit > 0 ? (spent / limit) * 100 : 0;
                const isOverBudget = !noLimit && spent > limit;

                return (
                  <View key={index} style={[styles.budgetCard, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.budgetHeader}>
                      <View>
                        <Text style={[styles.budgetName, { color: colors.text }]}>{name}</Text>
                        <Text style={[styles.budgetPeriod, { color: colors.textSecondary }]}>
                          {period === 'monthly' ? '📅 Mensuel' : '📆 Annuel'}
                        </Text>
                      </View>
                      <Text style={[styles.budgetAmount, { color: colors.textSecondary }, isOverBudget && styles.overBudget]}>
                        {spent.toFixed(2)} {currency} {noLimit ? '— Aucun plafond défini' : `/ ${limit.toFixed(2)} ${currency}`}
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
              <View style={styles.headerButtonsContainer}>
                <TouchableOpacity
                  style={[styles.sortButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => {
                    setShowFilterMenu(!showFilterMenu);
                    setShowSortMenu(false);
                  }}
                >
                  <IconSymbol name="line.3.horizontal.decrease.circle" size={20} color={colors.tint} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => {
                    setShowSortMenu(!showSortMenu);
                    setShowFilterMenu(false);
                  }}
                >
                  <IconSymbol name="arrow.up.arrow.down" size={20} color={colors.tint} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sort Menu */}
            {showSortMenu && (
              <View style={[styles.sortMenu, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.sortOrderRow}>
                  <Text style={[styles.sortOrderLabel, { color: colors.textSecondary }]}>Ordre</Text>
                  <View style={styles.sortOrderButtons}>
                    <TouchableOpacity
                      style={[
                        styles.sortOrderButton,
                        { backgroundColor: sortOrder === 'asc' ? colors.tint : colors.secondaryCardBackground }
                      ]}
                      onPress={() => setSortOrder('asc')}
                    >
                      <IconSymbol name="arrow.up" size={16} color={sortOrder === 'asc' ? '#fff' : colors.text} />
                      <Text style={[styles.sortOrderButtonText, { color: sortOrder === 'asc' ? '#fff' : colors.text }]}>Croissant</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sortOrderButton,
                        { backgroundColor: sortOrder === 'desc' ? colors.tint : colors.secondaryCardBackground }
                      ]}
                      onPress={() => setSortOrder('desc')}
                    >
                      <IconSymbol name="arrow.down" size={16} color={sortOrder === 'desc' ? '#fff' : colors.text} />
                      <Text style={[styles.sortOrderButtonText, { color: sortOrder === 'desc' ? '#fff' : colors.text }]}>Décroissant</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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

            {/* Filtres détaillés */}
            {showFilterMenu && (
            <View style={[styles.filterPanel, { backgroundColor: colors.secondaryCardBackground }]}>
              {/* Catégorie */}
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: !filterCategory ? colors.tint : colors.cardBackground }]}
                  onPress={() => setFilterCategory(null)}
                >
                  <Text style={[styles.filterChipText, { color: !filterCategory ? '#fff' : colors.text }]}>Toutes</Text>
                </TouchableOpacity>
                {categories.map((cat: any) => (
                  <TouchableOpacity
                    key={cat.name || cat}
                    style={[styles.filterChip, { backgroundColor: filterCategory === (cat.name || cat) ? colors.tint : colors.cardBackground }]}
                    onPress={() => setFilterCategory(cat.name || cat)}
                  >
                    <Text style={[styles.filterChipText, { color: filterCategory === (cat.name || cat) ? '#fff' : colors.text }]}>
                      {cat.name || cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Date précise */}
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date précise</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => setShowFilterDatePicker(true)}
                >
                  <IconSymbol name="calendar" size={18} color={colors.text} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {filterDate ? filterDate.toLocaleDateString('fr-FR') : 'Choisir une date'}
                  </Text>
                </TouchableOpacity>
                {filterDate && (
                  <TouchableOpacity onPress={() => setFilterDate(null)}>
                    <Text style={[styles.clearText, { color: colors.dangerButton }]}>Effacer</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Montant min / max */}
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Montant (€)</Text>
                <View style={styles.amountInputs}>
                  <TextInput
                    style={[styles.amountInput, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
                    placeholder="Min"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    value={filterAmountMin}
                    onChangeText={setFilterAmountMin}
                  />
                  <Text style={[styles.toText, { color: colors.textSecondary }]}>à</Text>
                  <TextInput
                    style={[styles.amountInput, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
                    placeholder="Max"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    value={filterAmountMax}
                    onChangeText={setFilterAmountMax}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.resetFiltersButton, { backgroundColor: colors.cardBackground }]}
                onPress={() => {
                  setFilterCategory(null);
                  setFilterDate(null);
                  setFilterAmountMin('');
                  setFilterAmountMax('');
                }}
              >
                <IconSymbol name="arrow.counterclockwise" size={16} color={colors.textSecondary} />
                <Text style={[styles.resetFiltersText, { color: colors.textSecondary }]}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            </View>
            )}

            {showFilterDatePicker && (
              <DateTimePicker
                value={filterDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowFilterDatePicker(false);
                  if (date) setFilterDate(date);
                }}
              />
            )}

            {filteredExpenses.length > 0 ? (
              <>
                {(showAllExpenses ? filteredExpenses : filteredExpenses.slice(0, 4)).map((expense: any) => {
                  const payer = familyMembersData[expense.paidBy];
                  const payerName = payer ? `${payer.firstName} ${payer.lastName}` : 'Membre';
                  const payerInitials = payer ? `${payer.firstName.charAt(0)}${payer.lastName.charAt(0)}` : 'M';
                  const isPending = expense.approvalStatus === 'PENDING_APPROVAL';
                  const isCurrentUserExpense = expense.paidBy === user?.uid;
                  
                  return (
                    <TouchableOpacity 
                      key={expense.id} 
                      style={[
                        styles.expenseCard, 
                        { backgroundColor: colors.cardBackground },
                        isPending && { borderLeftWidth: 4, borderLeftColor: '#FF9500' }
                      ]}
                      onPress={() => router.push(`/expense-details?expenseId=${expense.id}`)}
                    >
                      <View style={[styles.avatarBubble, { backgroundColor: isPending ? '#FF9500' : colors.tint }]}>
                        {isPending ? (
                          <IconSymbol name="clock" size={24} color="#fff" />
                        ) : payer?.profileImage ? (
                          <Image source={{ uri: payer.profileImage }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.avatarText}>{payerInitials}</Text>
                        )}
                      </View>
                      <View style={styles.expenseDetails}>
                        <View style={styles.expenseTopRow}>
                          <Text style={[styles.expenseTitle, { color: colors.text }]} numberOfLines={1}>{expense.description || payerName}</Text>
                          <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>
                            {expense.date?.toDate ? new Date(expense.date.toDate()).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date inconnue'}
                          </Text>
                        </View>
                        <View style={styles.expenseMiddleRow}>
                          <Text style={[styles.expenseCategory, { color: isPending ? '#FF9500' : colors.tint }]}>{expense.category || 'Non catégorisé'}</Text>
                          <Text style={[styles.expenseAmount, { color: isPending ? '#FF9500' : colors.tint }]}>{expense.amount?.toFixed(2)} {expense.currency ? getCurrencySymbol(expense.currency) : currency}</Text>
                        </View>
                        <View style={styles.expenseBottomRow}>
                          <Text style={[styles.expensePayerName, { color: colors.textSecondary }]}>
                            Payé par {payerName}
                          </Text>
                          {isPending && (
                            <View style={[styles.pendingBadgeContainer, { backgroundColor: '#FFF3E0' }]}>
                              <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FF9500" />
                              <Text style={[styles.pendingBadge, { color: '#FF9500' }]}>
                                {isCurrentUserExpense ? 'En attente' : 'À approuver'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Voir plus / Voir moins button */}
                {filteredExpenses.length > 4 && (
                  <TouchableOpacity
                    style={[styles.seeMoreButton, { backgroundColor: colors.cardBackground }]}
                    onPress={() => setShowAllExpenses(!showAllExpenses)}
                  >
                    <Text style={[styles.seeMoreButtonText, { color: colors.tint }]}>
                      {showAllExpenses ? 'Voir moins' : `Voir plus (${filteredExpenses.length - 4})`}
                    </Text>
                    <IconSymbol 
                      name={showAllExpenses ? 'chevron.up' : 'chevron.down'} 
                      size={18} 
                      color={colors.tint} 
                    />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={[styles.rowCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune dépense trouvée</Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      {/* Modale de remboursement */}
      <Modal
        visible={showRepaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRepaymentModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Rembourser ma dette</Text>
              <TouchableOpacity onPress={() => setShowRepaymentModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.debtInfo, { backgroundColor: colors.secondaryCardBackground }]}>
              <Text style={[styles.debtLabel, { color: colors.textSecondary }]}>Votre dette actuelle</Text>
              <Text style={[styles.debtAmount, { color: colors.dangerButton }]}>
                {Math.abs(balance).toFixed(2)} {currency}
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Montant à rembourser</Text>
            <TextInput
              style={[styles.amountInputLarge, { backgroundColor: colors.secondaryCardBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              inputMode="decimal"
              value={repaymentAmount}
              onChangeText={setRepaymentAmount}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Note (optionnel)</Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.secondaryCardBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="Ex: Virement du 29/12"
              placeholderTextColor={colors.textSecondary}
              value={repaymentNote}
              onChangeText={setRepaymentNote}
              multiline
            />

            <View style={[styles.repaymentInfo, { backgroundColor: '#FFF3E0' }]}>
              <IconSymbol name="info.circle" size={20} color="#FF9500" />
              <Text style={[styles.repaymentInfoText, { color: '#FF9500' }]}>
                L'autre parent devra approuver ce remboursement après réception de l'argent
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.secondaryCardBackground }]}
                onPress={() => setShowRepaymentModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.tint }]}
                onPress={handleRepayment}
                disabled={submittingRepayment}
              >
                {submittingRepayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Envoyer</Text>
                )}
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    position: 'relative',
  },
  settingsButtonText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: hs(20),
    height: hs(20),
    borderRadius: hs(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: hs(4),
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: FONT_SIZES.tiny,
    fontWeight: '800',
  },
  summarySection: { flexDirection: 'row', gap: SPACING.medium, marginBottom: V_SPACING.medium },
  summaryCard: { flex: 1, borderRadius: BORDER_RADIUS.large, padding: SPACING.large, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: vs(2) }, shadowRadius: hs(8), elevation: 2 },
  summaryLabel: { fontSize: FONT_SIZES.regular, marginBottom: V_SPACING.small },
  summaryAmount: { fontSize: FONT_SIZES.xxlarge, fontWeight: '800' },
  actionButtonsSection: {
    marginBottom: V_SPACING.xlarge,
    gap: SPACING.medium,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: V_SPACING.regular,
    borderRadius: BORDER_RADIUS.large,
    gap: SPACING.small,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 3,
  },
  primaryActionButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  approvalsActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: V_SPACING.regular,
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 2,
    shadowColor: '#FF9500',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: vs(2) },
    shadowRadius: hs(8),
    elevation: 3,
  },
  approvalsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
  },
  approvalsBadgeCount: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '800',
  },
  approvalsActionButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
    marginLeft: SPACING.small,
  },
  section: { marginBottom: V_SPACING.xxlarge },
  sectionTitle: { fontSize: FONT_SIZES.xlarge, fontWeight: '600', marginBottom: V_SPACING.regular },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.regular,
  },
  budgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  settingsIconButton: {
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  approvalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
    paddingVertical: vs(6),
    borderRadius: BORDER_RADIUS.medium,
    gap: SPACING.tiny,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  approvalsButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
  },
  budgetCard: { borderRadius: BORDER_RADIUS.medium, padding: SPACING.regular, marginBottom: V_SPACING.medium },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: V_SPACING.medium },
  budgetName: { fontSize: FONT_SIZES.medium, fontWeight: '600' },
  budgetPeriod: { fontSize: FONT_SIZES.tiny, marginTop: vs(2) },
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
  headerButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tiny,
    paddingHorizontal: SPACING.medium,
    paddingVertical: vs(10),
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
  sortOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: V_SPACING.small,
    paddingHorizontal: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: V_SPACING.small,
  },
  sortOrderLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  sortOrderButtons: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  sortOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(6),
    borderRadius: BORDER_RADIUS.medium,
  },
  sortOrderButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
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
    marginBottom: V_SPACING.xxlarge,
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
  filterPanel: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    marginBottom: V_SPACING.medium,
    gap: V_SPACING.small,
  },
  filterLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  filterChips: {
    gap: SPACING.small,
  },
  filterChip: {
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.large,
  },
  filterChipText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.medium,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  clearText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  amountInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    flex: 1,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.small,
    fontSize: FONT_SIZES.regular,
  },
  toText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  resetFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(8),
    borderRadius: BORDER_RADIUS.medium,
  },
  resetFiltersText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  expenseCard: { borderRadius: BORDER_RADIUS.large, padding: SPACING.regular, marginBottom: V_SPACING.medium, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: vs(2) }, shadowRadius: hs(8), elevation: 2 },
  avatarBubble: { width: hs(50), height: hs(50), borderRadius: hs(25), justifyContent: 'center', alignItems: 'center', marginRight: SPACING.regular },
  avatarText: { color: '#fff', fontSize: FONT_SIZES.medium, fontWeight: '700' },
  avatarImage: { width: hs(50), height: hs(50), borderRadius: hs(25) },
  expenseDetails: { flex: 1 },
  expenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: V_SPACING.tiny },
  expenseTitle: { fontSize: FONT_SIZES.medium, fontWeight: '600', flex: 1, marginRight: SPACING.small },
  expenseMiddleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: V_SPACING.tiny },
  expenseBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.small, marginTop: vs(2) },
  expenseCategory: { fontSize: FONT_SIZES.small, fontWeight: '600' },
  expenseDate: { fontSize: FONT_SIZES.small },
  expenseAmount: { fontSize: FONT_SIZES.large, fontWeight: '800' },
  pendingBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
    paddingHorizontal: SPACING.small,
    paddingVertical: vs(4),
    borderRadius: BORDER_RADIUS.small,
  },
  pendingBadge: { fontSize: FONT_SIZES.tiny, fontWeight: '600' },
  expensePayerName: { fontSize: FONT_SIZES.tiny, flex: 1 },
  balanceHint: { fontSize: FONT_SIZES.tiny, marginTop: vs(2) },
  repayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: vs(8) },
  repayChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tiny, paddingHorizontal: SPACING.medium, paddingVertical: vs(6), borderRadius: BORDER_RADIUS.large },
  repayChipText: { color: '#fff', fontSize: FONT_SIZES.small, fontWeight: '700' },
  rowCard: { borderRadius: BORDER_RADIUS.large, paddingVertical: V_SPACING.large, paddingHorizontal: SPACING.large, justifyContent: 'center', minHeight: vs(60) },
  emptyText: { textAlign: 'center', fontSize: FONT_SIZES.regular },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.large,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: vs(4) },
    shadowRadius: hs(12),
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.medium,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '700',
  },
  debtInfo: {
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: V_SPACING.medium,
    alignItems: 'center',
  },
  debtLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginBottom: V_SPACING.tiny,
  },
  debtAmount: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginTop: V_SPACING.small,
    marginBottom: V_SPACING.tiny,
  },
  amountInputLarge: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '700',
    textAlign: 'center',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    fontSize: FONT_SIZES.regular,
    minHeight: vs(80),
    textAlignVertical: 'top',
  },
  repaymentInfo: {
    flexDirection: 'row',
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    marginTop: V_SPACING.medium,
    gap: SPACING.small,
  },
  repaymentInfoText: {
    fontSize: FONT_SIZES.small,
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.regular,
    marginTop: V_SPACING.large,
  },
  modalButton: {
    flex: 1,
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  submitButton: {},
  modalButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
});
