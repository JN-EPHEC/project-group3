import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

export default function DepensesScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [myShare, setMyShare] = useState(0);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      const uid = currentUser.uid;

      const fetchData = async () => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setFirstName(userDocSnap.data().firstName || 'Utilisateur');
          }

          const expensesQuery = query(
            collection(db, 'expenses'),
            where('familyId', '==', userDocSnap.data()?.familyId),
            orderBy('date', 'desc')
          );
          const expensesSnapshot = await getDocs(expensesQuery);
          const expensesList = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setExpenses(expensesList);

          // Calculate totals
          const total = expensesList.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
          setTotalExpenses(total);
          setMyShare(total / 2); // Simple split for now

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
  }, [router]);

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
            <View>
              <Text style={styles.greeting}>Dépenses</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>

            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
              <Image 
                source={require('../../ImageAndLogo/LogoWeKid.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          <View style={styles.summarySection}>
            <View style={[styles.summaryCard, { backgroundColor: '#E7F7FF' }]}>
              <Text style={styles.summaryLabel}>Total dépenses</Text>
              <Text style={styles.summaryAmount}>{totalExpenses.toFixed(2)} €</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FFF4E7' }]}>
              <Text style={styles.summaryLabel}>Ma part</Text>
              <Text style={styles.summaryAmount}>{myShare.toFixed(2)} €</Text>
            </View>
          </View>

          {/* Add Expense Button */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.addButton}>
              <IconSymbol name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Ajouter une dépense</Text>
            </TouchableOpacity>
          </View>

          {/* Expenses List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#87CEEB' }]}>Historique des dépenses</Text>
            {expenses.length > 0 ? (
              expenses.map((expense: any) => (
                <TouchableOpacity key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseIcon}>
                    <IconSymbol name="creditcard.fill" size={24} color="#87CEEB" />
                  </View>
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseTitle}>{expense.description}</Text>
                    <Text style={styles.expenseDate}>
                      {expense.date?.toDate ? new Date(expense.date.toDate()).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  containerCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#9AA6B2',
  },
  name: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111',
    marginTop: 4,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 100,
  },
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#87CEEB',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  expenseCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  expenseIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E7F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#666',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#87CEEB',
  },
  rowCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    minHeight: 60,
  },
  emptyText: {
    color: '#B0B0B0',
    textAlign: 'center',
    fontSize: 15,
  },
});
