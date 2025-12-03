import { IconSymbol } from '@/components/ui/icon-symbol';
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
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '700' },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  form: { marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  categoriesScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  barcodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  barcodeText: {
    fontSize: 14,
  },
  submitButton: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
