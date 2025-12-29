import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { router, Stack } from 'expo-router';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrencySymbol } from '../constants/currencies';
import { auth, db } from '../constants/firebase';

interface ExpenseApproval {
  id: string;
  familyId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidBy: string;
  paidByName?: string;
  date: any;
  approvalStatus: string;
}

export default function ExpenseApprovalsScreen() {
  const [expenses, setExpenses] = useState<ExpenseApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMembersData, setFamilyMembersData] = useState<{ [uid: string]: { firstName: string; lastName: string } }>({});
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
    getDoc(userDocRef).then(async (userDoc) => {
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

      // Fetch family members data for all families
      const allMemberIds = new Set<string>();
      for (const familyId of familyIds) {
        const familyDoc = await getDoc(doc(db, 'families', familyId));
        if (familyDoc.exists()) {
          const members = familyDoc.data().members || [];
          members.forEach((mid: string) => allMemberIds.add(mid));
        }
      }

      // Fetch all member names
      const membersMap: { [uid: string]: { firstName: string; lastName: string } } = {};
      for (const memberId of Array.from(allMemberIds)) {
        const memberDoc = await getDoc(doc(db, 'users', memberId));
        if (memberDoc.exists()) {
          membersMap[memberId] = {
            firstName: memberDoc.data().firstName || 'Membre',
            lastName: memberDoc.data().lastName || '',
          };
        }
      }
      setFamilyMembersData(membersMap);

      // Listen to pending expense approvals for user's families
      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('familyId', 'in', familyIds.slice(0, 10)), // Firestore 'in' limit
        where('approvalStatus', '==', 'PENDING_APPROVAL')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const expensesData: ExpenseApproval[] = [];

        snapshot.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          
          // Only show expenses NOT created by current user
          if (data.paidBy !== currentUser.uid) {
            const payer = membersMap[data.paidBy];
            const paidByName = payer ? `${payer.firstName} ${payer.lastName}` : 'Membre';

            expensesData.push({
              id: docSnapshot.id,
              familyId: data.familyId,
              description: data.description || 'Sans description',
              amount: data.amount || 0,
              currency: data.currency || 'EUR',
              category: data.category || 'Non catégorisé',
              paidBy: data.paidBy,
              paidByName,
              date: data.date,
              approvalStatus: data.approvalStatus,
            });
          }
        });

        // Sort by date descending
        expensesData.sort((a, b) => {
          const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
          const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
          return dateB - dateA;
        });

        setExpenses(expensesData);
        setLoading(false);
      }, (err) => {
        console.warn('[expense-approvals] onSnapshot error:', err?.code, err?.message);
        setExpenses([]);
        setLoading(false);
      });

      return () => unsubscribe();
    });
  }, []);

  const renderExpenseItem = ({ item }: { item: ExpenseApproval }) => {
    const currencySymbol = getCurrencySymbol(item.currency);
    const formattedDate = item.date?.toDate 
      ? new Date(item.date.toDate()).toLocaleDateString('fr-FR', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short',
          year: 'numeric'
        })
      : 'Date inconnue';

    return (
      <TouchableOpacity
        style={[styles.expenseCard, { backgroundColor: colors.cardBackground, borderLeftColor: '#FF9500' }]}
        onPress={() => router.push(`/expense-details?expenseId=${item.id}`)}
      >
        <View style={styles.expenseContent}>
          <View style={styles.expenseHeader}>
            <View style={[styles.pendingBadge, { backgroundColor: '#FFF3E0' }]}>
              <IconSymbol name="clock" size={16} color="#FF9500" />
              <Text style={[styles.pendingBadgeText, { color: '#FF9500' }]}>En attente</Text>
            </View>
            <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>{formattedDate}</Text>
          </View>
          
          <Text style={[styles.expenseDescription, { color: colors.text }]}>{item.description}</Text>
          
          <View style={styles.expenseDetails}>
            <View style={styles.expenseDetailRow}>
              <IconSymbol name="tag" size={16} color={colors.tint} />
              <Text style={[styles.expenseCategory, { color: colors.tint }]}>{item.category}</Text>
            </View>
            <View style={styles.expenseDetailRow}>
              <IconSymbol name="person" size={16} color={colors.textSecondary} />
              <Text style={[styles.expensePayer, { color: colors.textSecondary }]}>
                Payé par {item.paidByName}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.expenseRight}>
          <Text style={[styles.expenseAmount, { color: colors.text }]}>
            {item.amount.toFixed(2)} {currencySymbol}
          </Text>
          <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.tint} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dépenses à approuver</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="checkmark.circle" size={64} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune dépense en attente</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Les dépenses nécessitant votre approbation apparaîtront ici
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <View style={[styles.infoBox, { backgroundColor: colors.secondaryCardBackground, borderColor: '#FF9500' }]}>
            <IconSymbol name="info.circle" size={20} color="#FF9500" />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Appuyez sur une dépense pour voir les détails et l'approuver ou la rejeter
            </Text>
          </View>
          
          <FlatList
            data={expenses}
            renderItem={renderExpenseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
      </SafeAreaView>
    </>
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
    paddingHorizontal: SPACING.large,
    paddingVertical: V_SPACING.regular,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.tiny,
  },
  headerTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
  },
  placeholder: {
    width: hs(32),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: V_SPACING.regular,
    fontSize: FONT_SIZES.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xlarge,
  },
  emptyText: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    marginTop: V_SPACING.large,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.regular,
    marginTop: V_SPACING.small,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginHorizontal: SPACING.large,
    marginTop: V_SPACING.large,
    marginBottom: V_SPACING.regular,
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    lineHeight: FONT_SIZES.small * 1.4,
  },
  listContent: {
    paddingHorizontal: SPACING.large,
    paddingBottom: V_SPACING.xxlarge,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.regular,
    marginBottom: V_SPACING.regular,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.1,
    shadowRadius: hs(4),
    elevation: 3,
  },
  expenseContent: {
    flex: 1,
    marginRight: SPACING.regular,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.small,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
    paddingHorizontal: SPACING.small,
    paddingVertical: vs(4),
    borderRadius: BORDER_RADIUS.small,
  },
  pendingBadgeText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
  },
  expenseDate: {
    fontSize: FONT_SIZES.small,
  },
  expenseDescription: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
    marginBottom: V_SPACING.small,
  },
  expenseDetails: {
    gap: V_SPACING.tiny,
  },
  expenseDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
  },
  expenseCategory: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  expensePayer: {
    fontSize: FONT_SIZES.small,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: V_SPACING.tiny,
  },
  expenseAmount: {
    fontSize: FONT_SIZES.large,
    fontWeight: '800',
  },
});
