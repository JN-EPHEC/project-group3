import { Stack, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { auth, db, getUserFamily } from '../constants/firebase';
import { Colors } from '../constants/theme';

export default function CreateEventScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [category, setCategory] = useState({ name: 'Activités', color: '#87CEEB' });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [showChildrenPicker, setShowChildrenPicker] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [showAddChildForm, setShowAddChildForm] = useState(false);

  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStartHour, setSelectedStartHour] = useState(new Date().getHours());
  const [selectedStartMinute, setSelectedStartMinute] = useState(new Date().getMinutes());
  const [selectedEndHour, setSelectedEndHour] = useState(new Date().getHours() + 1);
  const [selectedEndMinute, setSelectedEndMinute] = useState(new Date().getMinutes());

  const dayScrollRef = useRef<any>(null);
  const monthScrollRef = useRef<any>(null);
  const yearScrollRef = useRef<any>(null);
  const startHourScrollRef = useRef<any>(null);
  const startMinuteScrollRef = useRef<any>(null);
  const endHourScrollRef = useRef<any>(null);
  const endMinuteScrollRef = useRef<any>(null);

  const categories = [
    { name: 'Activités', color: '#87CEEB' },
    { name: 'Sport', color: '#FF6B6B' },
    { name: 'Cours', color: '#4ECDC4' },
    { name: 'Santé', color: '#95E1D3' },
    { name: 'Loisirs', color: '#FFA07A' },
    { name: 'Fête', color: '#FFD93D' },
    { name: 'Rendez-vous', color: '#A8E6CF' },
    { name: 'Autre', color: '#B4A7D6' },
  ];

  useEffect(() => {
    const fetchChildren = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const family = await getUserFamily(currentUser.uid);
        if (family?.id) {
          const familyDoc = await getDoc(doc(db, 'families', family.id));
          if (familyDoc.exists()) {
            const familyData = familyDoc.data();
            setChildren(familyData.children || []);
            // Sélectionner tous les enfants par défaut
            if (familyData.children && familyData.children.length > 0) {
              setSelectedChildren(familyData.children.map((child: any) => child.id));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching children:', error);
      }
    };

    fetchChildren();
  }, []);

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      setTitleError('Veuillez indiquer un titre pour l\'événement');
      return;
    }
    if (selectedChildren.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un enfant');
      return;
    }
    setTitleError('');

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      const family = await getUserFamily(currentUser.uid);
      
      if (!family?.id) {
        Alert.alert('Erreur', 'Vous devez appartenir à une famille pour créer un événement');
        return;
      }
      
      const eventStartTime = new Date(date);
      eventStartTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      
      const eventEndTime = new Date(date);
      eventEndTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

      await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(eventStartTime),
        startTime: Timestamp.fromDate(eventStartTime),
        endTime: Timestamp.fromDate(eventEndTime),
        isAllDay: isAllDay,
        category: category,
        userID: currentUser.uid,
        familyId: family.id,
        childrenIds: selectedChildren,
        createdAt: Timestamp.now(),
      });

      router.push('/(tabs)/Agenda');
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'événement');
    } finally {
      setLoading(false);
    }
  };

  const toggleChildSelection = (childId: string) => {
    setSelectedChildren(prev => 
      prev.includes(childId) 
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const getSelectedChildrenNames = () => {
    return selectedChildren
      .map(id => children.find(child => child.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour l\'enfant');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const family = await getUserFamily(currentUser.uid);
      if (!family?.id) return;

      const newChild = {
        id: `${Date.now()}`,
        name: newChildName.trim(),
      };

      const updatedChildren = [...children, newChild];
      await updateDoc(doc(db, 'families', family.id), {
        children: updatedChildren,
      });

      setChildren(updatedChildren);
      setSelectedChildren([...selectedChildren, newChild.id]);
      setNewChildName('');
      setShowAddChildForm(false);
      Alert.alert('Succès', 'Enfant ajouté avec succès');
    } catch (error) {
      console.error('Error adding child:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'enfant');
    }
  };

  const confirmDate = () => {
    const newDate = new Date(date);
    newDate.setFullYear(selectedYear);
    newDate.setMonth(selectedMonth);
    newDate.setDate(selectedDay);
    setDate(newDate);
    setShowDatePicker(false);
  };

  const confirmStartTime = () => {
    const newTime = new Date(startTime);
    newTime.setHours(selectedStartHour);
    newTime.setMinutes(selectedStartMinute);
    setStartTime(newTime);
    
    const newEndTime = new Date(endTime);
    if (newTime.getTime() >= newEndTime.getTime()) {
      newEndTime.setTime(newTime.getTime() + 60 * 60 * 1000);
      setEndTime(newEndTime);
      setSelectedEndHour(newEndTime.getHours());
      setSelectedEndMinute(newEndTime.getMinutes());
    }
    
    setShowStartTimePicker(false);
  };

  const confirmEndTime = () => {
    const newTime = new Date(endTime);
    newTime.setHours(selectedEndHour);
    newTime.setMinutes(selectedEndMinute);
    
    if (newTime.getTime() <= startTime.getTime()) {
      Alert.alert('Erreur', 'L\'heure de fin doit être après l\'heure de début');
      return;
    }
    
    setEndTime(newTime);
    setShowEndTimePicker(false);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
  const days = Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.container}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Titre *</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }, titleError && styles.inputError]} 
                  placeholder="Ex: Rendez-vous médecin" 
                  value={title} 
                  onChangeText={(text) => {
                    setTitle(text);
                    if (titleError && text.trim()) {
                      setTitleError('');
                    }
                  }} 
                  placeholderTextColor={colors.textSecondary} 
                />
                {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Enfants concernés *</Text>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowChildrenPicker(true)}>
                  <Text style={[styles.dateButtonText, { color: colors.text }]}
                    onPress={() => setShowChildrenPicker(true)}
                  >
                    {getSelectedChildrenNames() || 'Sélectionner les enfants'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Date</Text>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.cardBackground }]} onPress={() => { setSelectedDay(date.getDate()); setSelectedMonth(date.getMonth()); setSelectedYear(date.getFullYear()); setShowDatePicker(true); }}>
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>{date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Catégorie</Text>
                <TouchableOpacity style={[styles.categoryButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowCategoryPicker(true)}>
                  <View style={styles.categoryDisplay}>
                    <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
                    <Text style={[styles.categoryButtonText, { color: colors.text }]}>{category.name}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.toggleContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Toute la journée</Text>
                <TouchableOpacity style={[styles.toggle, isAllDay && styles.toggleActive]} onPress={() => setIsAllDay(!isAllDay)}>
                  <View style={[styles.toggleCircle, isAllDay && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>

              {!isAllDay && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Heure de début</Text>
                    <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.cardBackground }]} onPress={() => { setSelectedStartHour(startTime.getHours()); setSelectedStartMinute(startTime.getMinutes()); setShowStartTimePicker(true); }}>
                      <Text style={[styles.dateButtonText, { color: colors.text }]}>{startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Heure de fin</Text>
                    <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.cardBackground }]} onPress={() => { setSelectedEndHour(endTime.getHours()); setSelectedEndMinute(endTime.getMinutes()); setShowEndTimePicker(true); }}>
                      <Text style={[styles.dateButtonText, { color: colors.text }]}>{endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Description</Text>
                <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.cardBackground, color: colors.text }]} placeholder="Ajouter une description..." value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top" placeholderTextColor={colors.textSecondary} />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.cancelButtonStyle, { backgroundColor: colors.cardBackground }]} onPress={() => router.back()}>
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.createButtonStyle, (loading || !title.trim()) && styles.disabled]} onPress={handleCreateEvent} disabled={loading || !title.trim()}>
                  <Text style={styles.createButtonText}>{loading ? 'Création...' : 'Créer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        <Modal visible={showChildrenPicker} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Enfants concernés</Text>
              
              <ScrollView style={{ maxHeight: 200, marginBottom: 10 }}>
                {children.map((child: any) => (
                  <TouchableOpacity 
                    key={child.id} 
                    style={[styles.childItem, { backgroundColor: colors.cardBackground }]} 
                    onPress={() => toggleChildSelection(child.id)}
                  >
                    <Text style={[styles.childName, { color: colors.text }]}>{child.name}</Text>
                    {selectedChildren.includes(child.id) && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {showAddChildForm ? (
                <View style={styles.addChildContainer}>
                  <TextInput 
                    style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, marginBottom: 10 }]}
                    placeholder="Nom de l'enfant"
                    value={newChildName}
                    onChangeText={setNewChildName}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity style={[styles.modalConfirmButton]} onPress={handleAddChild}>
                    <Text style={styles.modalConfirmText}>Ajouter l'enfant</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addChildButton} onPress={() => setShowAddChildForm(true)}>
                  <Text style={styles.addChildButtonText}>+ Ajouter un enfant</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: colors.cardBackground, marginTop: 20 }]} onPress={() => setShowChildrenPicker(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showEndTimePicker} transparent={true} animationType="slide" onShow={() => {
          setTimeout(() => {
            const itemHeight = 56;
            const visibleItems = 3.5;
            const centerOffset = (itemHeight * visibleItems) / 2 - itemHeight / 2;
            
            endHourScrollRef.current?.scrollTo({ 
              y: Math.max(0, selectedEndHour * itemHeight - centerOffset), 
              animated: true 
            });
            endMinuteScrollRef.current?.scrollTo({ 
              y: Math.max(0, selectedEndMinute * itemHeight - centerOffset), 
              animated: true 
            });
          }, 300);
        }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Heure de fin</Text>
              <View style={styles.pickerRow}>
                <ScrollView ref={endHourScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {hours.map((hour) => (
                    <TouchableOpacity key={hour} style={[styles.pickerItem, { backgroundColor: colors.cardBackground }, selectedEndHour === hour && styles.pickerItemSelected]} onPress={() => setSelectedEndHour(hour)}>
                      <Text style={[styles.pickerText, { color: colors.text }, selectedEndHour === hour && styles.pickerTextSelected]}>{hour.toString().padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
                <ScrollView ref={endMinuteScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {minutes.map((minute) => (
                    <TouchableOpacity key={minute} style={[styles.pickerItem, { backgroundColor: colors.cardBackground }, selectedEndMinute === minute && styles.pickerItemSelected]} onPress={() => setSelectedEndMinute(minute)}>
                      <Text style={[styles.pickerText, { color: colors.text }, selectedEndMinute === minute && styles.pickerTextSelected]}>{minute.toString().padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowEndTimePicker(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmEndTime}>
                  <Text style={styles.modalConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showCategoryPicker} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sélectionner une catégorie</Text>
              
              <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
                {categories.map((cat, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.categoryItem, 
                      { backgroundColor: colors.cardBackground },
                      category.name === cat.name && styles.categoryItemSelected
                    ]} 
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View style={[styles.categoryColorDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.categoryItemText, { color: colors.text }, category.name === cat.name && styles.categoryItemTextSelected]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowCategoryPicker(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Annuler</Text>
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
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600', color: '#111' },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16, color: '#111' },
  inputError: { borderWidth: 1, borderColor: '#FF3B30' },
  errorText: { fontSize: 14, color: '#FF3B30', marginTop: 4 },
  textArea: { minHeight: 120 },
  dateButton: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16 },
  dateButtonText: { fontSize: 16, color: '#111', textTransform: 'capitalize' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButtonStyle: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  createButtonStyle: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.5 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', padding: 3, justifyContent: 'center' },
  toggleActive: { backgroundColor: '#87CEEB' },
  toggleCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 2, elevation: 2 },
  toggleCircleActive: { alignSelf: 'flex-end' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 20 },
  pickerRow: { flexDirection: 'row', gap: 10, marginBottom: 20, height: 200 },
  pickerColumn: { flex: 1 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8, backgroundColor: '#F5F5F5' },
  pickerItemSelected: { backgroundColor: '#87CEEB' },
  pickerText: { fontSize: 16, textAlign: 'center', color: '#111' },
  pickerTextSelected: { color: '#fff', fontWeight: '600' },
  timeSeparator: { fontSize: 24, fontWeight: '700', color: '#111', alignSelf: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelButton: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  modalConfirmButton: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  categoryButton: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16 },
  categoryDisplay: { flexDirection: 'row', alignItems: 'center' },
  categoryColorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  categoryButtonText: { fontSize: 16, color: '#111' },
  categoryList: { maxHeight: 300, marginBottom: 20 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8, backgroundColor: '#F5F5F5' },
  categoryItemSelected: { backgroundColor: '#87CEEB' },
  categoryItemText: { fontSize: 16, color: '#111', marginLeft: 10 },
  categoryItemTextSelected: { color: '#fff', fontWeight: '600' },
  childItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  childName: {
    fontSize: 16,
  },
  checkMark: {
    fontSize: 20,
    color: '#87CEEB',
  },
  addChildContainer: {
    marginTop: 10,
  },
  addChildButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addChildButtonText: {
    fontSize: 16,
    color: '#87CEEB',
    fontWeight: '600',
  },
});
