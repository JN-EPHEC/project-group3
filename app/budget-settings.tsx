import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CURRENCIES } from '../constants/currencies';
import { auth, db, getUserFamily } from '../constants/firebase';

function CategoryLimitsManager({ familyId, colors }: { familyId: string | null; colors: any }) {
  const [categories, setCategories] = useState<{ name: string; limit: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (!familyId) return;

    const budgetRef = doc(db, 'budgets', familyId);
    const unsubscribe = onSnapshot(budgetRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const categoryLimits = data.categoryLimits || {};
        const categoryArray = Object.entries(categoryLimits).map(([name, limit]) => ({
          name,
          limit: limit as number,
        }));
        setCategories(categoryArray);
      } else {
        // Créer le document s'il n'existe pas
        await setDoc(budgetRef, { categoryLimits: {} });
        setCategories([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  const handleUpdateLimit = async (categoryName: string, newLimit: string) => {
    if (!familyId) return;
    
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    try {
      const budgetRef = doc(db, 'budgets', familyId);
      const docSnap = await getDoc(budgetRef);
      const currentLimits = docSnap.exists() ? docSnap.data().categoryLimits || {} : {};
      
      await updateDoc(budgetRef, {
        [`categoryLimits.${categoryName}`]: limit,
      });
      
      setEditingCategory(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating limit:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la limite');
    }
  };

  if (loading) {
    return <ActivityIndicator size="small" color={colors.tint} />;
  }

  if (categories.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Aucune catégorie créée. Les catégories apparaîtront ici lorsque vous ajouterez des dépenses.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {categories.map((cat) => (
        <View key={cat.name} style={[styles.categoryLimitCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.categoryLimitInfo}>
            <Text style={[styles.categoryLimitName, { color: colors.text }]}>{cat.name}</Text>
            {editingCategory === cat.name ? (
              <View style={styles.editLimitContainer}>
                <TextInput
                  style={[styles.editLimitInput, { color: colors.text, borderColor: colors.border }]}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.tint }]}
                  onPress={() => handleUpdateLimit(cat.name, editValue)}
                >
                  <IconSymbol name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={() => {
                    setEditingCategory(null);
                    setEditValue('');
                  }}
                >
                  <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.limitDisplay}>
                <Text style={[styles.categoryLimitAmount, { color: colors.tint }]}>
                  {cat.limit.toFixed(2)} €
                </Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setEditingCategory(cat.name);
                    setEditValue(cat.limit.toString());
                  }}
                >
                  <IconSymbol name="pencil" size={18} color={colors.tint} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function BudgetSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const fetchFamilySettings = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.replace('/(auth)/LoginScreen');
        return;
      }

      try {
        const userFamily = await getUserFamily(currentUser.uid);
        if (userFamily?.id) {
          setFamilyId(userFamily.id);
          const familyRef = doc(db, 'families', userFamily.id);
          const familySnap = await getDoc(familyRef);
          
          if (familySnap.exists()) {
            const data = familySnap.data();
            setSelectedCurrency(data.currency || 'EUR');
          }
        }
      } catch (error) {
        console.error("Error fetching family settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilySettings();
  }, [router]);

  const handleSaveCurrency = async (currencyCode: string) => {
    if (!familyId) return;
    
    setSaving(true);
    try {
      const familyRef = doc(db, 'families', familyId);
      await updateDoc(familyRef, { currency: currencyCode });
      setSelectedCurrency(currencyCode);
      Alert.alert('Succès', 'La devise a été mise à jour pour toute la famille');
    } catch (error) {
      console.error("Error updating currency:", error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la devise');
    } finally {
      setSaving(false);
    }
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.tint} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.tint }]}>Paramètres Budget</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Currency Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Devise</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Cette devise sera utilisée par tous les membres de la famille
            </Text>

            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyCard,
                  { backgroundColor: colors.cardBackground },
                  selectedCurrency === currency.code && { 
                    borderColor: colors.tint, 
                    borderWidth: 2 
                  }
                ]}
                onPress={() => handleSaveCurrency(currency.code)}
                disabled={saving}
              >
                <View style={styles.currencyInfo}>
                  <Text style={[styles.currencySymbol, { color: colors.text }]}>
                    {currency.symbol}
                  </Text>
                  <View style={styles.currencyDetails}>
                    <Text style={[styles.currencyName, { color: colors.text }]}>
                      {currency.name}
                    </Text>
                    <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>
                      {currency.code}
                    </Text>
                  </View>
                </View>
                {selectedCurrency === currency.code && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Limits Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Limites par Catégorie</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Définissez un montant maximum pour chaque catégorie. Les dépenses dépassant cette limite nécessiteront une approbation.
            </Text>
            <CategoryLimitsManager familyId={familyId} colors={colors} />
          </View>

          {saving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={colors.tint} />
              <Text style={[styles.savingText, { color: colors.textSecondary }]}>
                Enregistrement...
              </Text>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.xlarge,
  },
  backButton: {
    width: hs(40),
    height: hs(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: FONT_SIZES.huge, fontWeight: '700' },
  section: { marginBottom: V_SPACING.xxlarge },
  sectionTitle: { fontSize: FONT_SIZES.large, fontWeight: '700', marginBottom: V_SPACING.small },
  sectionDescription: { fontSize: FONT_SIZES.regular, marginBottom: V_SPACING.regular, lineHeight: vs(20) },
  currencyCard: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    marginBottom: V_SPACING.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.massive,
    fontWeight: '700',
    width: hs(50),
    textAlign: 'center',
  },
  currencyDetails: {
    marginLeft: SPACING.regular,
  },
  currencyName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginBottom: vs(2),
  },
  currencyCode: {
    fontSize: 14,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  savingText: {
    fontSize: 14,
  },
  categoryLimitCard: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    marginBottom: V_SPACING.medium,
  },
  categoryLimitInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLimitName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    flex: 1,
  },
  limitDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  categoryLimitAmount: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
  },
  editButton: {
    padding: SPACING.small,
  },
  editLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  editLimitInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    padding: SPACING.small,
    fontSize: FONT_SIZES.medium,
    width: hs(100),
    textAlign: 'right',
  },
  saveButton: {
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS.small,
  },
  cancelButton: {
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
  },
  emptyCard: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.large,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.regular,
    textAlign: 'center',
    lineHeight: vs(22),
  },
});
