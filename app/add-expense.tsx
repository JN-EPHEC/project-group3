import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { auth, db, getUserFamilies } from '../constants/firebase';

const DEFAULT_CATEGORIES = ['Santé', 'Vêtements', 'École', 'Alimentation', 'Transport'];

interface Family {
  id: string;
  name: string;
}

interface CategoryRule {
  limit: number;
  allowOverLimit: boolean;
}

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
  const [categoryRules, setCategoryRules] = useState<{ [key: string]: CategoryRule }>({});
  const [categorySpent, setCategorySpent] = useState<{ [key: string]: number }>({});
  const [uploading, setUploading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [userFamilies, setUserFamilies] = useState<Family[]>([]);
  const [showFamilyPicker, setShowFamilyPicker] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    // Si un produit scanné est passé en paramètre
    if (params.scannedProduct) {
      try {
        const product = JSON.parse(params.scannedProduct as string);
        setDescription(product.name || '');
        setAmount(product.price?.toString() || '');
        setProductImage(product.imageUrl || null);
        setBarcode(product.barcode || null);
      } catch (error) {
        console.error('Error parsing scanned product:', error);
      }
    }

    // Récupérer les familles de l'utilisateur et initialiser
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        // Ne pas router.back() immédiatement, laisser l'utilisateur voir le message
        return;
      }

      try {
        // Récupérer les familles de l'utilisateur (gère familyId ET familyIds)
        const familiesData = await getUserFamilies(currentUser.uid);
        
        if (!familiesData || familiesData.length === 0) {
          Alert.alert('Erreur', 'Vous devez appartenir à une famille pour ajouter une dépense');
          // Ne pas router.back() automatiquement, laisser l'utilisateur voir le message
          return;
        }

        // Convertir au format attendu
        const formattedFamilies: Family[] = familiesData.map((f) => ({
          id: f.id,
          name: f.name || 'Famille sans nom',
        }));

        setUserFamilies(formattedFamilies);

        // Si une famille est passée en paramètre, l'utiliser
        let initialFamilyId = params.familyId as string | undefined;
        
        // Sinon, utiliser la première famille
        if (!initialFamilyId && formattedFamilies.length > 0) {
          initialFamilyId = formattedFamilies[0].id;
        }

        if (initialFamilyId) {
          setFamilyId(initialFamilyId);
          const selectedFamily = formattedFamilies.find(f => f.id === initialFamilyId);
          setFamilyName(selectedFamily?.name || null);

          // Récupérer les paramètres de cette famille
          await loadFamilySettings(initialFamilyId);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Erreur', 'Impossible de charger vos informations');
      }
    };

    fetchUserData();
  }, [params]);

  const loadFamilySettings = async (fId: string) => {
    try {
      // Récupérer la devise de la famille
      const familyDoc = await getDoc(doc(db, 'families', fId));
      if (familyDoc.exists()) {
        const familyCurrency = familyDoc.data().currency || 'EUR';
        setCurrency(familyCurrency);
      }

      // Écouter les dépenses en temps réel pour calculer les montants par catégorie
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('familyId', '==', fId),
        where('date', '>=', Timestamp.fromDate(startOfMonth))
      );
      
      const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
        const spentByCategory: { [key: string]: number } = {};
        
        expensesSnapshot.docs.forEach((doc) => {
          const expense = doc.data();
          // Ne compter que les dépenses approuvées ou sans statut (anciennes dépenses)
          if (!expense.approvalStatus || expense.approvalStatus === 'APPROVED') {
            const cat = expense.category || 'Non catégorisé';
            const amount = expense.amount || 0;
            
            if (!spentByCategory[cat]) {
              spentByCategory[cat] = 0;
            }
            spentByCategory[cat] += amount;
          }
        });
        
        setCategorySpent(spentByCategory);
      }, (error) => {
        console.error('Error listening to expenses:', error);
      });

      // Écouter les catégories et limites en temps réel
      const budgetRef = doc(db, 'budgets', fId);
      const unsubscribeBudget = onSnapshot(budgetRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const rules = data.categoryRules || data.categoryLimits || {};
          
          if (rules && Object.keys(rules).length > 0) {
            // Filtrer uniquement les catégories non supprimées (exclure null et undefined)
            const categoryNames = Object.keys(rules).filter(key => {
              const value = rules[key];
              return value !== null && value !== undefined;
            });
            setCategories(categoryNames);
            
            const rulesMap: { [key: string]: CategoryRule } = {};
            
            categoryNames.forEach((catName) => {
              const rule = rules[catName];
              if (typeof rule === 'object' && rule !== null) {
                rulesMap[catName] = {
                  limit: rule.limit || 0,
                  allowOverLimit: rule.allowOverLimit || false,
                };
              } else {
                rulesMap[catName] = {
                  limit: rule || 0,
                  allowOverLimit: false,
                };
              }
            });
            
            setCategoryRules(rulesMap);
            
            // Sélectionner la première catégorie si aucune n'est sélectionnée
            if (!category || !categoryNames.includes(category)) {
              setCategory(categoryNames[0] || 'Alimentation');
            }
          } else {
            // Catégories par défaut
            setCategories(DEFAULT_CATEGORIES);
            setCategory('Alimentation');
          }
        }
      }, (err) => {
        console.warn('[add-expense] Budget onSnapshot error:', err?.code, err?.message);
      });

      // Retourner une fonction qui désabonne les deux listeners
      return () => {
        unsubscribeExpenses();
        unsubscribeBudget();
      };
    } catch (error) {
      console.error('Error loading family settings:', error);
    }
  };

  const handleFamilyChange = async (newFamilyId: string) => {
    setFamilyId(newFamilyId);
    const selectedFamily = userFamilies.find(f => f.id === newFamilyId);
    setFamilyName(selectedFamily?.name || null);
    setShowFamilyPicker(false);
    
    // Recharger les paramètres de la nouvelle famille
    await loadFamilySettings(newFamilyId);
  };

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
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie');
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
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra');
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

  const calculateCategoryTotal = async (categoryName: string, currentFamilyId: string): Promise<number> => {
    try {
      // Calculer le total des dépenses APPROUVÉES pour cette catégorie dans le mois en cours
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('familyId', '==', currentFamilyId),
        where('category', '==', categoryName),
        where('approvalStatus', '==', 'APPROVED'),
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth))
      );

      const snapshot = await getDocs(q);
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        total += data.amount || 0;
      });

      return total;
    } catch (error) {
      console.error('Error calculating category total:', error);
      return 0;
    }
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir la description et le montant');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (!familyId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une famille');
      return;
    }

    setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      console.warn('[add-expense] No authenticated user');
      Alert.alert(
        'Session expirée',
        "Veuillez vous reconnecter pour ajouter une dépense."
      );
      return;
    }

    try {
      // 1. Récupérer le nom de l'utilisateur
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userName = userDoc.exists() ? userDoc.data().name || 'Utilisateur' : 'Utilisateur';

      // 2. Uploader l'image si présente
      let receiptUrl = null;
      if (receiptImage) {
        setUploading(true);
        receiptUrl = await uploadReceiptImage(receiptImage, familyId);
        setUploading(false);
      }

      // 3. Vérifier les limites de budget et calculer le statut d'approbation
      const categoryRule = categoryRules[category];
      let approvalStatus = 'APPROVED';
      let needsApproval = false;
      let exceededBy = 0;

      if (categoryRule && categoryRule.limit > 0) {
        // Calculer le total actuel pour cette catégorie
        const currentTotal = await calculateCategoryTotal(category, familyId);
        const newTotal = currentTotal + amountNumber;

        console.log(`📊 Budget Check - Catégorie: ${category}`);
        console.log(`   Limite: ${categoryRule.limit} €`);
        console.log(`   Total actuel: ${currentTotal.toFixed(2)} €`);
        console.log(`   Nouveau montant: ${amountNumber.toFixed(2)} €`);
        console.log(`   Nouveau total: ${newTotal.toFixed(2)} €`);
        console.log(`   Dépassement autorisé: ${categoryRule.allowOverLimit}`);

        // Vérifier si on dépasse la limite
        if (newTotal > categoryRule.limit) {
          exceededBy = newTotal - categoryRule.limit;
          
          // Si le dépassement n'est PAS autorisé, mettre en attente d'approbation
          if (!categoryRule.allowOverLimit) {
            needsApproval = true;
            approvalStatus = 'PENDING_APPROVAL';
            
            console.log(`⚠️ DÉPASSEMENT DÉTECTÉ - Montant dépassé: ${exceededBy.toFixed(2)} €`);
            console.log(`🔒 Dépassement NON autorisé - Approbation requise`);
          } else {
            console.log(`✅ Dépassement autorisé - Pas d'approbation nécessaire`);
          }
        } else {
          console.log(`✅ Budget respecté - Approbation automatique`);
        }
      }

      // 4. Créer le document de dépense
      const expenseData = {
        description: description.trim(),
        amount: amountNumber,
        category: category,
        currency: currency,
        date: Timestamp.fromDate(selectedDate),
        paidBy: currentUser.uid,
        paidByName: userName,
        familyId: familyId,
        familyName: familyName,
        receiptUrl: receiptUrl || productImage,
        barcode: barcode,
        approvalStatus: approvalStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const expenseRef = await addDoc(collection(db, 'expenses'), expenseData);
      console.log(`💾 Dépense créée avec ID: ${expenseRef.id}`);
      console.log(`   Statut: ${approvalStatus}`);

      // 5. Si approbation nécessaire, créer une demande d'approbation
      if (needsApproval) {
        const approvalData = {
          expenseId: expenseRef.id,
          familyId: familyId,
          categoryName: category,
          limit: categoryRule.limit,
          allowOverLimit: categoryRule.allowOverLimit,
          requestedBy: currentUser.uid,
          requestedByName: userName,
          amount: amountNumber,
          exceededBy: exceededBy,
          description: description.trim(),
          status: 'PENDING',
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'categoryApprovals'), approvalData);
        console.log(`📬 Demande d'approbation créée pour ${exceededBy.toFixed(2)} € de dépassement`);

        Alert.alert(
          '⚠️ Budget dépassé',
          `Cette dépense dépasse le budget de la catégorie "${category}" de ${exceededBy.toFixed(2)} €.\n\n` +
          `Elle a été enregistrée et est en attente d'approbation par l'autre parent.`,
          [{ text: 'Compris', style: 'default' }]
        );
      } else {
        Alert.alert(
          '✅ Dépense ajoutée',
          `La dépense de ${amountNumber.toFixed(2)} € a été enregistrée avec succès.`,
          [{ text: 'OK', style: 'default' }]
        );
      }

      // 6. Retour à l'écran précédent
      router.back();
    } catch (error: any) {
      console.error('❌ Error submitting expense:', error);
      const code = error?.code || 'unknown';
      const message = error?.message || 'Erreur inconnue';
      Alert.alert(
        'Erreur ajout dépense',
        `Impossible d'ajouter la dépense.\nCode: ${code}\nMessage: ${message}\n\nAstuce: vérifiez que votre compte appartient à la même famille et que les règles Firestore autorisent la création dans "expenses" et "categoryApprovals".`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.tint} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Nouvelle dépense</Text>
            <View style={{ width: hs(40) }} />
          </View>

          {/* Sélection de la famille */}
          {userFamilies.length > 1 && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Famille</Text>
              <TouchableOpacity
                style={[styles.familySelector, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => setShowFamilyPicker(true)}
              >
                <Text style={[styles.familySelectorText, { color: colors.text }]}>
                  {familyName || 'Sélectionner une famille'}
                </Text>
                <IconSymbol name="chevron.down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Scan barcode button */}
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/scan-barcode')}
          >
            <IconSymbol name="barcode.viewfinder" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Scanner un code-barres</Text>
          </TouchableOpacity>

          {/* Product image from scan */}
          {productImage && (
            <View style={[styles.imageContainer, { backgroundColor: colors.cardBackground }]}>
              <Image source={{ uri: productImage }} style={styles.productImage} />
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Courses alimentaires"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Montant */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Montant</Text>
              <View style={styles.amountContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, flex: 1, borderColor: colors.border }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.currencyButton, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setShowCurrencyPicker(true)}
                >
                  <Text style={[styles.currencyButtonText, { color: colors.text }]}>{currency}</Text>
                  <IconSymbol name="chevron.down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Catégorie */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: category === cat ? colors.tint : colors.cardBackground,
                        borderWidth: 1,
                        borderColor: category === cat ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: category === cat ? '#fff' : colors.text },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Affichage du budget restant */}
            {categoryRules[category] && categoryRules[category].limit > 0 && (
              <View style={[styles.budgetInfo, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <IconSymbol name="chart.bar" size={24} color={colors.tint} />
                <View style={styles.budgetTextContainer}>
                  <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>
                    Budget {category}
                  </Text>
                  <Text style={[styles.budgetValue, { color: colors.text }]} numberOfLines={2}>
                    {(categorySpent[category] || 0).toFixed(2)} {currency} / {categoryRules[category].limit.toFixed(2)} {currency} dépensés
                  </Text>
                  {!categoryRules[category].allowOverLimit && (
                    <Text style={[styles.budgetWarning, { color: '#FF6B6B' }]} numberOfLines={2}>
                      ⚠️ Dépassement non autorisé - Approbation requise
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Date</Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <IconSymbol name="calendar" size={20} color={colors.tint} />
                <Text style={[styles.datePickerText, { color: colors.text }]}>
                  {selectedDate.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Barcode info */}
            {barcode && (
              <View style={[styles.barcodeInfo, { backgroundColor: colors.cardBackground }]}>
                <IconSymbol name="barcode" size={20} color={colors.tint} />
                <Text style={[styles.barcodeText, { color: colors.text }]}>
                  Code-barres: {barcode}
                </Text>
              </View>
            )}

            {/* Receipt image */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Justificatif (optionnel)</Text>
              <View style={styles.receiptButtons}>
                <TouchableOpacity
                  style={[styles.receiptButton, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={handlePickFromGallery}
                >
                  <IconSymbol name="photo" size={20} color={colors.tint} />
                  <Text style={[styles.receiptButtonText, { color: colors.text }]}>Galerie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.receiptButton, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={handleTakePhoto}
                >
                  <IconSymbol name="camera" size={20} color={colors.tint} />
                  <Text style={[styles.receiptButtonText, { color: colors.text }]}>Photo</Text>
                </TouchableOpacity>
              </View>

              {receiptImage && (
                <View style={styles.receiptPreview}>
                  <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
                  <TouchableOpacity
                    style={styles.removeReceiptButton}
                    onPress={() => setReceiptImage(null)}
                  >
                    <IconSymbol name="xmark" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Submit button */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => router.back()}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.tint, opacity: loading || uploading ? 0.5 : 1 }]}
                onPress={handleSubmit}
                disabled={loading || uploading}
              >
                {loading || uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {uploading ? 'Upload...' : 'Ajouter'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker */}
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

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Devise</Text>
            <ScrollView style={styles.currencyList}>
              {['EUR', 'USD', 'GBP', 'CHF', 'CAD'].map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[styles.currencyItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setCurrency(curr);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={[styles.currencyItemText, { color: colors.text }]}>{curr}</Text>
                  {currency === curr && <IconSymbol name="checkmark" size={20} color={colors.tint} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.background }]}
              onPress={() => setShowCurrencyPicker(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Family Picker Modal */}
      <Modal visible={showFamilyPicker} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choisir une famille</Text>
            <ScrollView style={styles.currencyList}>
              {userFamilies.map((family) => (
                <TouchableOpacity
                  key={family.id}
                  style={[styles.currencyItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleFamilyChange(family.id)}
                >
                  <Text style={[styles.currencyItemText, { color: colors.text }]}>
                    {family.name}
                  </Text>
                  {familyId === family.id && <IconSymbol name="checkmark" size={20} color={colors.tint} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.background }]}
              onPress={() => setShowFamilyPicker(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>Fermer</Text>
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
    color: '#fff',
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
  familySelector: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  familySelectorText: {
    fontSize: FONT_SIZES.medium,
  },
  amountContainer: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  input: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    fontSize: FONT_SIZES.medium,
    borderWidth: 1,
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
  budgetInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    gap: SPACING.small,
    marginBottom: V_SPACING.regular,
  },
  budgetLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  budgetValue: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '700',
    marginTop: vs(2),
  },
  budgetWarning: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginTop: vs(4),
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    gap: SPACING.small,
    borderWidth: 1,
  },
  datePickerText: {
    fontSize: FONT_SIZES.medium,
    flex: 1,
    textTransform: 'capitalize',
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
    marginTop: V_SPACING.regular,
  },
  cancelButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.regular,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: V_SPACING.regular,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    gap: 4,
  },
  currencyButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  currencyList: {
    maxHeight: 400,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  currencyItemText: {
    fontSize: 16,
  },
  modalCloseButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.small,
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    marginBottom: V_SPACING.regular,
  },
  budgetTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  budgetLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: FONT_SIZES.regular,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  budgetWarning: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  categoriesScroll: {
    marginTop: V_SPACING.small,
  },
  categoryChip: {
    paddingHorizontal: SPACING.regular,
    paddingVertical: SPACING.small,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.small,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
});
