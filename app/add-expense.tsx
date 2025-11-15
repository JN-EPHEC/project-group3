import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily, storage } from '../constants/firebase';

export default function AddExpenseScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const dayScrollRef = useRef<any>(null);
  const monthScrollRef = useRef<any>(null);
  const yearScrollRef = useRef<any>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userFamily = await getUserFamily(currentUser.uid);
        if (userFamily?.id) {
          const budgetDoc = await getDoc(doc(db, 'budgets', userFamily.id));
          if (budgetDoc.exists()) {
            setCategories(budgetDoc.data().categories || []);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès aux images pour ajouter un ticket de caisse.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra pour prendre une photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSelectCategory = (categoryName: string) => {
    setCategory(categoryName);
    setShowCategoryPicker(false);
    setShowNewCategoryInput(false);
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de catégorie');
      return;
    }
    setCategory(newCategoryName.trim());
    setShowCategoryPicker(false);
    setShowNewCategoryInput(false);
    setNewCategoryName('');
  };

  const handleSaveExpense = async () => {
    if (!description.trim() || !amount.trim() || !category) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    setSaving(true);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userFamily = await getUserFamily(currentUser.uid);
      if (!userFamily?.id) {
        Alert.alert('Erreur', 'Vous devez appartenir à une famille');
        setSaving(false);
        return;
      }

      let receiptUrl = null;
      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `expenses/${userFamily.id}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        receiptUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'expenses'), {
        description: description.trim(),
        amount: amountValue,
        category: category,
        date: Timestamp.fromDate(date),
        paidBy: currentUser.uid,
        familyId: userFamily.id,
        receiptUrl: receiptUrl,
        createdAt: serverTimestamp(),
      });

      // Simplement revenir en arrière
      router.back();
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la dépense');
    } finally {
      setSaving(false);
    }
  };

  const confirmDate = () => {
    const newDate = new Date();
    newDate.setFullYear(selectedYear);
    newDate.setMonth(selectedMonth);
    newDate.setDate(selectedDay);
    setDate(newDate);
    setShowDatePicker(false);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);
  const days = Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color="#87CEEB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Ajouter une dépense</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: T-shirt pour Louis"
                  value={description}
                  onChangeText={setDescription}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Montant (€) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Catégorie *</Text>
                <TouchableOpacity 
                  style={styles.categoryButton}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={[styles.categoryButtonText, !category && { color: '#999' }]}>
                    {category || 'Sélectionner une catégorie'}
                  </Text>
                  <IconSymbol name="chevron.down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => {
                    setSelectedDay(date.getDate());
                    setSelectedMonth(date.getMonth());
                    setSelectedYear(date.getFullYear());
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.dateButtonText}>
                    {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ticket de caisse / Photo de l'achat</Text>
                {imageUri ? (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setImageUri(null)}
                    >
                      <IconSymbol name="xmark.circle.fill" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imageButtons}>
                    <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
                      <IconSymbol name="photo" size={24} color="#87CEEB" />
                      <Text style={styles.imageButtonText}>Galerie</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageButton} onPress={handleTakePhoto}>
                      <IconSymbol name="camera.fill" size={24} color="#87CEEB" />
                      <Text style={styles.imageButtonText}>Caméra</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, saving && styles.disabled]} 
                  onPress={handleSaveExpense}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal visible={showDatePicker} transparent={true} animationType="slide" onShow={() => {
          setTimeout(() => {
            const itemHeight = 56;
            const visibleItems = 3.5;
            const centerOffset = (itemHeight * visibleItems) / 2 - itemHeight / 2;
            
            dayScrollRef.current?.scrollTo({ 
              y: Math.max(0, (selectedDay - 1) * itemHeight - centerOffset), 
              animated: true 
            });
            monthScrollRef.current?.scrollTo({ 
              y: Math.max(0, selectedMonth * itemHeight - centerOffset), 
              animated: true 
            });
            yearScrollRef.current?.scrollTo({ 
              y: Math.max(0, years.indexOf(selectedYear) * itemHeight - centerOffset), 
              animated: true 
            });
          }, 300);
        }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sélectionner une date</Text>
              <View style={styles.pickerRow}>
                <ScrollView ref={dayScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity key={day} style={[styles.pickerItem, selectedDay === day && styles.pickerItemSelected]} onPress={() => setSelectedDay(day)}>
                      <Text style={[styles.pickerText, selectedDay === day && styles.pickerTextSelected]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView ref={monthScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {months.map((month, index) => (
                    <TouchableOpacity key={index} style={[styles.pickerItem, selectedMonth === index && styles.pickerItemSelected]} onPress={() => setSelectedMonth(index)}>
                      <Text style={[styles.pickerText, selectedMonth === index && styles.pickerTextSelected]}>{month}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView ref={yearScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity key={year} style={[styles.pickerItem, selectedYear === year && styles.pickerItemSelected]} onPress={() => setSelectedYear(year)}>
                      <Text style={[styles.pickerText, selectedYear === year && styles.pickerTextSelected]}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmDate}>
                  <Text style={styles.modalConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Category Picker Modal */}
        <Modal visible={showCategoryPicker} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sélectionner une catégorie</Text>
              
              <ScrollView style={styles.categoryList}>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryItem}
                    onPress={() => handleSelectCategory(cat.name)}
                  >
                    <Text style={styles.categoryItemText}>{cat.name}</Text>
                    {category === cat.name && (
                      <IconSymbol name="checkmark" size={20} color="#87CEEB" />
                    )}
                  </TouchableOpacity>
                ))}

                {showNewCategoryInput ? (
                  <View style={styles.newCategoryInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="Nom de la catégorie"
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      placeholderTextColor="#999"
                      autoFocus
                    />
                    <TouchableOpacity 
                      style={styles.addCategoryButton}
                      onPress={handleAddNewCategory}
                    >
                      <Text style={styles.addCategoryButtonText}>Ajouter</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.newCategoryButton}
                    onPress={() => setShowNewCategoryInput(true)}
                  >
                    <IconSymbol name="plus.circle" size={20} color="#87CEEB" />
                    <Text style={styles.newCategoryButtonText}>Nouvelle catégorie</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowCategoryPicker(false);
                  setShowNewCategoryInput(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginBottom: 20 },
  backButtonText: { fontSize: 32, color: '#87CEEB', fontWeight: '300' },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#87CEEB' },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600', color: '#111' },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16, color: '#111' },
  categoryButton: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryButtonText: { fontSize: 16, color: '#111' },
  dateButton: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16 },
  dateButtonText: { fontSize: 16, color: '#111', textTransform: 'capitalize' },
  imageButtons: { flexDirection: 'row', gap: 12 },
  imageButton: { flex: 1, backgroundColor: '#E7F7FF', borderRadius: 12, padding: 20, alignItems: 'center', gap: 8 },
  imageButtonText: { fontSize: 14, fontWeight: '600', color: '#87CEEB' },
  imagePreview: { position: 'relative' },
  previewImage: { width: '100%', height: 200, borderRadius: 12 },
  removeImageButton: { position: 'absolute', top: 8, right: 8 },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveButton: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 20 },
  pickerRow: { flexDirection: 'row', gap: 10, marginBottom: 20, height: 200 },
  pickerColumn: { flex: 1 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8, backgroundColor: '#F5F5F5' },
  pickerItemSelected: { backgroundColor: '#87CEEB' },
  pickerText: { fontSize: 16, textAlign: 'center', color: '#111' },
  pickerTextSelected: { color: '#fff', fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelButton: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  modalConfirmButton: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  categoryList: { maxHeight: 400 },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  categoryItemText: { fontSize: 16, color: '#111' },
  newCategoryInput: { padding: 16, gap: 12 },
  addCategoryButton: { backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addCategoryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  newCategoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  newCategoryButtonText: { fontSize: 16, fontWeight: '600', color: '#87CEEB' },
  modalCloseButton: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  modalCloseText: { fontSize: 16, fontWeight: '600', color: '#666' },
});
