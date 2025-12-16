import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CURRENCIES } from '../constants/currencies';
import { auth, db, getUserFamily } from '../constants/firebase';

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
});
