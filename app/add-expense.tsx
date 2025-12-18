import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CURRENCIES, getCurrencySymbol } from '../constants/currencies';
import { auth, db, getUserFamily } from '../constants/firebase';

const DEFAULT_CATEGORIES = ['Santé', 'Vêtements', 'École', 'Alimentation', 'Transport'];

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentation');
  const [currency, setCurrency] = useState('EUR');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryLimits, setCategoryLimits] = useState<{ [key: string]: number }>({});
  const [categoryAllowOver, setCategoryAllowOver] = useState<{ [key: string]: boolean }>({});
  const [uploading, setUploading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
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

    // Récupérer la devise et les limites de catégorie
    const fetchCurrency = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const routeFamilyId = params.familyId as string | undefined;
      const routeFamilyName = params.familyName as string | undefined;

      let targetFamilyId: string | null = routeFamilyId || null;
      let targetFamilyName: string | null = routeFamilyName || null;

      if (!targetFamilyId) {
        const userFamily = await getUserFamily(currentUser.uid);
        targetFamilyId = userFamily?.id || null;
        targetFamilyName = userFamily?.name || null;
      }

      if (!targetFamilyId) return;

      setFamilyId(targetFamilyId);
      setFamilyName(targetFamilyName || null);

      const familyRef = doc(db, 'families', targetFamilyId);
      const familySnap = await getDoc(familyRef);
      if (familySnap.exists()) {
        const currencyCode = familySnap.data().currency || 'EUR';
        setCurrency(currencyCode);
      }
      
      // Load budget categories and limits
      const budgetRef = doc(db, 'budgets', targetFamilyId);
      const budgetSnap = await getDoc(budgetRef);
      if (budgetSnap.exists()) {
        const budgetData = budgetSnap.data();
        const rules = budgetData.categoryRules || budgetData.categoryLimits || {};
        const limits: { [key: string]: number } = {};
        const allow: { [key: string]: boolean } = {};
        Object.entries(rules).forEach(([name, value]) => {
          if (typeof value === 'number') {
            limits[name] = value as number;
            allow[name] = false;
          } else {
            const obj = value as any;
            limits[name] = obj?.limit ?? 0;
            allow[name] = !!obj?.allowOverLimit;
          }
        });
        setCategoryLimits(limits);
        setCategoryAllowOver(allow);
        
        // Merge default categories with budget categories
        const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...Object.keys(rules)])];
        setCategories(allCategories);
      }
    };

    fetchCurrency();
  }, [params]);

  const uploadReceiptImage = async (uri: string, familyId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storage = getStorage();
    const filename = `receipts/${familyId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Accès à la galerie requis');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Accès à la caméra requis');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setCategory(trimmed);
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

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

      let targetFamilyId = familyId;
      if (!targetFamilyId) {
        const userFamily = await getUserFamily(currentUser.uid);
        targetFamilyId = userFamily?.id || null;
        if (!familyName && userFamily?.name) setFamilyName(userFamily.name);
      }

      if (!targetFamilyId) {
        Alert.alert('Erreur', 'Aucune famille trouvée');
        return;
      }

      // Upload receipt if provided
      let receiptUrl = null;
      if (receiptImage) {
        setUploading(true);
        try {
          receiptUrl = await uploadReceiptImage(receiptImage, targetFamilyId);
        } catch (error) {
          console.error('Error uploading receipt:', error);
        }
        setUploading(false);
      }

      // Check category limit and rule
      const categoryLimit = categoryLimits[category];
      const allowOver = categoryAllowOver[category] ?? false;

      if (categoryLimit !== undefined && !allowOver && amountNumber > categoryLimit) {
        Alert.alert('Limite dépassée', "Cette catégorie n'autorise pas les dépenses au-delà du plafond.");
        setLoading(false);
        return;
      }

      const requiresApproval = categoryLimit !== undefined && allowOver && amountNumber > categoryLimit;

      await addDoc(collection(db, 'expenses'), {
        description: description.trim(),
        amount: amountNumber,
        category,
        currency,
        familyId: targetFamilyId,
        paidBy: currentUser.uid,
        date: Timestamp.fromDate(selectedDate),
        productImage: productImage || null,
        barcode: barcode || null,
        receiptImage: receiptUrl,
        approvalStatus: requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED',
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
              <Text style={[styles.label, { color: colors.text }]}>Montant *</Text>
              <View style={styles.amountContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, flex: 1 }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={[styles.currencyButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowCurrencyPicker(true)}>
                  <Text style={[styles.currencyButtonText, { color: colors.text }]}>{getCurrencySymbol(currency)}</Text>
                  <IconSymbol name="chevron.down" size={12} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Catégorie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                {categories.map((cat) => (
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
                <TouchableOpacity
                  style={[styles.categoryChip, { backgroundColor: colors.secondaryCardBackground }]}
                  onPress={() => setShowAddCategory(true)}
                >
                  <IconSymbol name="plus" size={16} color={colors.tint} />
                  <Text style={[styles.categoryChipText, { color: colors.tint }]}>Ajouter</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Date *</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: colors.cardBackground, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[{ color: colors.text }]}>
                  {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <IconSymbol name="calendar" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Ticket de caisse / Photo de l'achat</Text>
              {receiptImage && (
                <View style={[styles.receiptPreview, { backgroundColor: colors.cardBackground }]}>
                  <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
                  <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.removeReceiptButton}>
                    <IconSymbol name="xmark.circle.fill" size={24} color={colors.dangerButton} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.receiptButtons}>
                <TouchableOpacity
                  style={[styles.receiptButton, { backgroundColor: colors.cardBackground }]}
                  onPress={handlePickFromGallery}
                >
                  <IconSymbol name="photo" size={20} color={colors.tint} />
                  <Text style={[styles.receiptButtonText, { color: colors.text }]}>Galerie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.receiptButton, { backgroundColor: colors.cardBackground }]}
                  onPress={handleTakePhoto}
                >
                  <IconSymbol name="camera" size={20} color={colors.tint} />
                  <Text style={[styles.receiptButtonText, { color: colors.text }]}>Caméra</Text>
                </TouchableOpacity>
              </View>
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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.cardBackground }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#fff' }]}
              onPress={handleSubmit}
              disabled={loading || uploading}
            >
              {loading || uploading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.submitButtonText, { color: '#000' }]}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Add Category Modal */}
      <Modal
        visible={showAddCategory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCategory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nouvelle Catégorie
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Nom de la catégorie"
              placeholderTextColor={colors.textSecondary}
              value={newCategory}
              onChangeText={setNewCategory}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.cardBackground }]}
                onPress={() => {
                  setShowAddCategory(false);
                  setNewCategory('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: '#fff' }]}
                onPress={handleAddCategory}
              >
                <Text style={[styles.modalButtonText, { color: '#000' }]}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCurrencyPicker} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choisir une devise</Text>
            <ScrollView style={styles.currencyList}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[styles.currencyItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setCurrency(curr.code);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={[styles.currencyItemText, { color: colors.text }]}>{curr.name} ({curr.symbol})</Text>
                  {currency === curr.code && <IconSymbol name="checkmark" size={20} color={colors.tint} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowCurrencyPicker(false)}>
              <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Fermer</Text>
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
  amountContainer: {
    flexDirection: 'row',
    gap: SPACING.small,
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
  currencyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.regular, borderRadius: BORDER_RADIUS.medium, gap: 4 },
  currencyButtonText: { fontSize: FONT_SIZES.medium, fontWeight: '600' },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    gap: SPACING.small,
  },
  datePickerText: {
    fontSize: FONT_SIZES.medium,
    flex: 1,
  },
  receiptButtons: {
    flexDirection: 'row',
    gap: SPACING.small,
    marginTop: V_SPACING.small,
  },
  receiptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    gap: SPACING.small,
  },
  receiptButtonText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  receiptPreview: {
    marginTop: V_SPACING.small,
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: hs(200),
    resizeMode: 'cover',
  },
  removeReceiptButton: {
    position: 'absolute',
    top: SPACING.small,
    right: SPACING.small,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: BORDER_RADIUS.full,
    width: hs(30),
    height: hs(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  cancelButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.regular,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  modalInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    fontSize: FONT_SIZES.medium,
    marginBottom: V_SPACING.regular,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  modalButton: {
    flex: 1,
    paddingVertical: V_SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  currencyList: { maxHeight: 400 },
  currencyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  currencyItemText: { fontSize: 16 },
  modalCloseButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  modalCloseText: { fontSize: 16, fontWeight: '600' },
});
