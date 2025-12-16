import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily } from '../constants/firebase';

const CATEGORIES = [
  'Alimentation',
  'Transport',
  'Santé',
  'Éducation',
  'Loisirs',
  'Vêtements',
  'Logement',
  'Autre'
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentation');
  const [currency, setCurrency] = useState('€');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    // Si un produit scanné est passé en paramètre
    if (params.scannedProduct) {
      try {
        const product = JSON.parse(params.scannedProduct as string);
        setDescription(product.name + (product.brand ? ` - ${product.brand}` : ''));
        setCategory(product.category || 'Alimentation');
        setProductImage(product.image);
        setBarcode(product.barcode);
      } catch (error) {
        console.error('Error parsing scanned product:', error);
      }
    }

    // Récupérer la devise de la famille
    const fetchCurrency = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userFamily = await getUserFamily(currentUser.uid);
      if (userFamily?.id) {
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
      }
    };

    fetchCurrency();
  }, [params]);

  const handleSubmit = async () => {
    if (!description.trim() || !amount.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Erreur', 'Le montant doit être un nombre valide');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      const userFamily = await getUserFamily(currentUser.uid);
      if (!userFamily?.id) {
        Alert.alert('Erreur', 'Aucune famille trouvée');
        return;
      }

      await addDoc(collection(db, 'expenses'), {
        description: description.trim(),
        amount: amountNumber,
        category,
        familyId: userFamily.id,
        paidBy: currentUser.uid,
        date: serverTimestamp(),
        productImage: productImage || null,
        barcode: barcode || null,
        createdAt: serverTimestamp()
      });

      Alert.alert('Succès', 'Dépense ajoutée avec succès', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la dépense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.tint} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.tint }]}>Nouvelle dépense</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Scan Button */}
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.secondaryCardBackground }]}
            onPress={() => router.push('/scan-barcode')}
          >
            <IconSymbol name="barcode.viewfinder" size={24} color={colors.tint} />
            <Text style={[styles.scanButtonText, { color: colors.tint }]}
            >
              Scanner un code-barres
            </Text>
          </TouchableOpacity>

          {/* Product Image */}
          {productImage && (
            <View style={[styles.imageContainer, { backgroundColor: colors.cardBackground }]}>
              <Image source={{ uri: productImage }} style={styles.productImage} />
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Courses Carrefour"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Montant * ({currency})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Catégorie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.cardBackground },
                      category === cat && { backgroundColor: colors.tint }
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      { color: colors.text },
                      category === cat && { color: '#fff' }
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {barcode && (
              <View style={[styles.barcodeInfo, { backgroundColor: colors.secondaryCardBackground }]}>
                <IconSymbol name="barcode" size={20} color={colors.textSecondary} />
                <Text style={[styles.barcodeText, { color: colors.textSecondary }]}>
                  Code-barres: {barcode}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primaryButton }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Ajouter la dépense</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACING.large, paddingTop: V_SPACING.large, paddingBottom: V_SPACING.xxlarge },
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: V_SPACING.xlarge,
    gap: SPACING.medium,
  },
  scanButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  imageContainer: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    marginBottom: V_SPACING.xlarge,
    alignItems: 'center',
  },
  productImage: {
    width: hs(200),
    height: hs(200),
    borderRadius: BORDER_RADIUS.medium,
    resizeMode: 'contain',
  },
  form: { marginBottom: V_SPACING.xlarge },
  inputGroup: { marginBottom: V_SPACING.large },
  label: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginBottom: V_SPACING.small,
  },
  input: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    fontSize: FONT_SIZES.medium,
  },
  categoriesScroll: {
    marginTop: V_SPACING.small,
  },
  categoryChip: {
    paddingHorizontal: SPACING.regular,
    paddingVertical: vs(10),
    borderRadius: BORDER_RADIUS.large,
    marginRight: SPACING.small,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  barcodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    gap: SPACING.small,
  },
  barcodeText: {
    fontSize: FONT_SIZES.regular,
  },
  submitButton: {
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.regular,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
});
