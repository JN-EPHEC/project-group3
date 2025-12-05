import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

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

    // Récupérer la devise de la famille et les membres
    const fetchData = async () => {
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

        // Récupérer les membres de la famille
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('familyId', '==', userFamily.id));
        const querySnapshot = await getDocs(q);
        const members = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFamilyMembers(members);

        // Pré-sélectionner l'utilisateur actuel
        setPaidBy(currentUser.uid);
      }
    };

    fetchData();
  }, [params]);

  const getPaidByName = () => {
    if (!paidBy) return 'Sélectionner qui a payé';
    const member = familyMembers.find(m => m.id === paidBy);
    return member?.firstName || 'Inconnu';
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!paidBy) {
      Alert.alert('Erreur', 'Veuillez sélectionner qui a payé');
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
        paidBy: paidBy,
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
              <Text style={[styles.label, { color: colors.text }]}>Qui a payé ? *</Text>
              <TouchableOpacity style={[styles.input, { backgroundColor: colors.cardBackground }]} onPress={() => setShowMemberPicker(true)}>
                <Text style={[styles.dateButtonText, { color: paidBy ? colors.text : colors.textTertiary }]}>
                  {getPaidByName()}
                </Text>
              </TouchableOpacity>
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

      {/* Member Picker Modal */}
      <Modal visible={showMemberPicker} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Qui a payé ?</Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 10 }}>
              {familyMembers.map((member: any) => (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.memberItem, { backgroundColor: colors.cardBackground }]}
                  onPress={() => {
                    setPaidBy(member.id);
                    setShowMemberPicker(false);
                  }}
                >
                  <Text style={[styles.memberName, { color: colors.text }]}>{member.firstName}</Text>
                  {paidBy === member.id && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: colors.cardBackground, marginTop: 20 }]} onPress={() => setShowMemberPicker(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  dateButtonText: { fontSize: 16, color: '#111' },
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
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
  },
  checkMark: {
    fontSize: 20,
    color: '#87CEEB',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 20 },
  modalCancelButton: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
});
