import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../constants/firebase';
import { Colors } from '../constants/theme';


export default function EditEventScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { eventId } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [category, setCategory] = useState({ name: 'Loisirs', color: '#FFA07A' });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [familyId, setFamilyId] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [initialSelectedChildren, setInitialSelectedChildren] = useState<string[]>([]);
  const [showChildrenPicker, setShowChildrenPicker] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [showAddChildForm, setShowAddChildForm] = useState(false);

  // State for parent selection
  const [allParents, setAllParents] = useState<any[]>([]);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [initialSelectedParents, setInitialSelectedParents] = useState<string[]>([]);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [familyName, setFamilyName] = useState('');

  const categories = [
    { name: 'Loisirs', color: '#FFA07A' },
    { name: 'Garde', color: '#FFC085' },
    { name: 'École', color: '#6AADE4' },
    { name: 'Santé', color: '#95E1D3' },
    { name: 'Fête', color: '#FFD93D' },
    { name: 'Rendez-vous', color: '#A8E6CF' },
    { name: 'Autres', color: '#B4A7D6' },
  ];

  const [initialTitle, setInitialTitle] = useState('');
  const [initialDescription, setInitialDescription] = useState('');
  const [initialLocation, setInitialLocation] = useState('');
  const [initialDate, setInitialDate] = useState(new Date());
  const [initialStartTime, setInitialStartTime] = useState(new Date());
  const [initialEndTime, setInitialEndTime] = useState(new Date());
  const [initialIsAllDay, setInitialIsAllDay] = useState(false);
  const [initialCategory, setInitialCategory] = useState({ name: 'Loisirs', color: '#FFA07A' });

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

  const toggleChildSelection = (childId: string) => {
    setSelectedChildren(prev => 
      prev.includes(childId) 
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const getSelectedChildrenNames = () => {
    if (children.length === 0) return 'Chargement...';
    return selectedChildren
      .map(id => children.find(child => child.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Aucun enfant sélectionné';
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour l\'enfant');
      return;
    }
    if (!familyId) {
      Alert.alert('Erreur', 'ID de famille non trouvé.');
      return;
    }

    try {
      const newChild = {
        id: `${Date.now()}`,
        name: newChildName.trim(),
      };

      const updatedChildren = [...children, newChild];
      await updateDoc(doc(db, 'families', familyId), {
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

  const toggleParentSelection = (parentId: string) => {
    setSelectedParents(prev =>
      prev.includes(parentId)
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    );
  };

  const getSelectedParentNames = () => {
    return selectedParents
      .map(id => allParents.find(parent => parent.id === id)?.firstName)
      .filter(Boolean)
      .join(', ');
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId || typeof eventId !== 'string') return;
      
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();

          const currentUser = auth.currentUser;
          if (currentUser && eventData.userID !== currentUser.uid) {
            Alert.alert(
              'Accès non autorisé',
              'Vous n\'êtes pas autorisé à modifier cet événement.',
              [{ text: 'OK', onPress: () => router.replace('/(tabs)/Agenda') }]
            );
            setLoading(false);
            return;
          }

          const eventDate = eventData.date?.toDate() || new Date();
          const eventStartTime = eventData.startTime?.toDate() || eventDate;
          const eventEndTime = eventData.endTime?.toDate() || new Date(eventDate.getTime() + 60 * 60 * 1000);
          
          setTitle(eventData.title || '');
          setDescription(eventData.description || '');
          setLocation(eventData.location || '');
          setIsAllDay(eventData.isAllDay || false);
          setDate(eventDate);
          setStartTime(eventStartTime);
          setEndTime(eventEndTime);
          setCategory(eventData.category || { name: 'Loisirs', color: '#FFA07A' });
          setFamilyId(eventData.familyId || null);

          // Fetch and set children data
          if (eventData.familyId) {
            const familyDoc = await getDoc(doc(db, 'families', eventData.familyId));
            if (familyDoc.exists()) {
              const familyData = familyDoc.data();
              setChildren(familyData.children || []);
              setFamilyName(familyData.name || '');
            }
            // Fetch parents from the same family
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('familyId', '==', eventData.familyId));
            const querySnapshot = await getDocs(q);
            const parentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllParents(parentsList);
          }
          const currentChildrenIds = eventData.childrenIds || [];
          setSelectedChildren(currentChildrenIds);
          setInitialSelectedChildren(currentChildrenIds);

          const currentParentIds = eventData.parentIds || [];
          setSelectedParents(currentParentIds);
          setInitialSelectedParents(currentParentIds);
          
          setInitialTitle(eventData.title || '');
          setInitialDescription(eventData.description || '');
          setInitialLocation(eventData.location || '');
          setInitialDate(eventDate);
          setInitialStartTime(eventStartTime);
          setInitialEndTime(eventEndTime);
          setInitialIsAllDay(eventData.isAllDay || false);
          setInitialCategory(eventData.category || { name: 'Loisirs', color: '#FFA07A' });
          
          setSelectedDay(eventDate.getDate());
          setSelectedMonth(eventDate.getMonth());
          setSelectedYear(eventDate.getFullYear());
          setSelectedStartHour(eventStartTime.getHours());
          setSelectedStartMinute(eventStartTime.getMinutes());
          setSelectedEndHour(eventEndTime.getHours());
          setSelectedEndMinute(eventEndTime.getMinutes());
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

        const hasChanges = () => {
          // Compare arrays by converting to strings after sorting to ensure order doesn't matter
          const childrenChanged = JSON.stringify([...selectedChildren].sort()) !== JSON.stringify([...initialSelectedChildren].sort());
          const parentsChanged = JSON.stringify([...selectedParents].sort()) !== JSON.stringify([...initialSelectedParents].sort());
          return (
            title !== initialTitle ||
            description !== initialDescription ||
            location !== initialLocation ||
            isAllDay !== initialIsAllDay ||
            date.getTime() !== initialDate.getTime() ||
            startTime.getTime() !== initialStartTime.getTime() ||
            endTime.getTime() !== initialEndTime.getTime() ||
            childrenChanged ||
            parentsChanged ||
            category.name !== initialCategory.name
          );
        };
  
        const handleBack = () => {
          if (hasChanges()) {
            Alert.alert(
              'Modifications non sauvegardées',
              'Voulez-vous sauvegarder vos modifications avant de quitter ?',
              [
                { text: 'Ne pas sauvegarder', style: 'destructive', onPress: () => router.back() },
                { text: 'Annuler', style: 'cancel' },
                { text: 'Sauvegarder', onPress: handleUpdateEvent }
              ]
            );
          } else {
            router.back();
          }
        };
  
        const handleUpdateEvent = async () => {
          if (!title.trim()) {
            setTitleError('Veuillez indiquer un titre pour l\'événement');
            return;
          }
          if (selectedParents.length === 0) {
            Alert.alert('Erreur', 'Veuillez sélectionner au moins un parent');
            return;
          }
          setTitleError('');
  
          setSaving(true);
          try {
            if (typeof eventId !== 'string') return;
  
            const eventStartTime = new Date(date);
            eventStartTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
            
            const eventEndTime = new Date(date);
            eventEndTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
  
            await updateDoc(doc(db, 'events', eventId), {
              title: title.trim(),
              description: description.trim(),
              location: location.trim(),
              date: Timestamp.fromDate(eventStartTime),
              startTime: Timestamp.fromDate(eventStartTime),
              endTime: Timestamp.fromDate(eventEndTime),
              isAllDay: isAllDay,
              category: category,
              childrenIds: selectedChildren,
              parentIds: selectedParents,
              updatedAt: Timestamp.now(),
            });
      // Redirection immédiate sans alert
      router.replace('/(tabs)/Agenda');
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'\u00e9v\u00e9nement');
    } finally {
      setSaving(false);
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
    
    // Ajuster l'heure de fin si elle est avant l'heure de début
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
    
    // Vérifier que l'heure de fin est après l'heure de début
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

              {familyName && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Famille</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, opacity: 0.7 }]}
                    value={familyName}
                    editable={false}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Enfants concernés</Text>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowChildrenPicker(true)}>
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {getSelectedChildrenNames()}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Parents concernés</Text>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowParentPicker(true)}>
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {getSelectedParentNames() || 'Sélectionner les parents'}
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

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Lieu</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text }]}
                  placeholder="Ex: 123 Rue de la Paix, Paris"
                  value={location}
                  onChangeText={setLocation}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.cancelButtonStyle, { backgroundColor: colors.cardBackground }]} onPress={handleBack}>
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.updateButtonStyle, (saving || !hasChanges() || !title.trim()) && styles.disabled]} onPress={handleUpdateEvent} disabled={saving || !hasChanges() || !title.trim()}>
                  <Text style={styles.updateButtonText}>{saving ? 'Modification...' : 'Confirmer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

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
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sélectionner une date</Text>
              <View style={styles.pickerRow}>
                <ScrollView ref={dayScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity key={day} style={[styles.pickerItem, { backgroundColor: colors.cardBackground }, selectedDay === day && styles.pickerItemSelected]} onPress={() => setSelectedDay(day)}>
                      <Text style={[styles.pickerText, { color: colors.text }, selectedDay === day && styles.pickerTextSelected]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView ref={monthScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {months.map((month, index) => (
                    <TouchableOpacity key={index} style={[styles.pickerItem, { backgroundColor: colors.cardBackground }, selectedMonth === index && styles.pickerItemSelected]} onPress={() => setSelectedMonth(index)}>
                      <Text style={[styles.pickerText, { color: colors.text }, selectedMonth === index && styles.pickerTextSelected]}>{month}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView ref={yearScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity key={year} style={[styles.pickerItem, { backgroundColor: colors.cardBackground }, selectedYear === year && styles.pickerItemSelected]} onPress={() => setSelectedYear(year)}>
                      <Text style={[styles.pickerText, { color: colors.text }, selectedYear === year && styles.pickerTextSelected]}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmDate}>
                  <Text style={styles.modalConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showStartTimePicker} transparent={true} animationType="slide" onShow={() => {
          setTimeout(() => {
            const itemHeight = 56;
            const visibleItems = 3.5;
            const centerOffset = (itemHeight * visibleItems) / 2 - itemHeight / 2;
            
            startHourScrollRef.current?.scrollTo({ 
              y: Math.max(0, selectedStartHour * itemHeight - centerOffset), 
              animated: true 
            });
            startMinuteScrollRef.current?.scrollTo({ 
              y: Math.max(0, selectedStartMinute * itemHeight - centerOffset), 
              animated: true 
            });
          }, 300);
        }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Heure de début</Text>
              <View style={styles.pickerRow}>
                <ScrollView ref={startHourScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {hours.map((hour) => (
                    <TouchableOpacity key={hour} style={[styles.pickerItem, { backgroundColor: colors.cardBackground }, selectedStartHour === hour && styles.pickerItemSelected]} onPress={() => setSelectedStartHour(hour)}>
                      <Text style={[styles.pickerText, { color: colors.text }, selectedStartHour === hour && styles.pickerTextSelected]}>{hour.toString().padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View>
                  <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
                </View>
                <ScrollView ref={startMinuteScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {minutes.map((minute) => (
                    <TouchableOpacity key={minute} style={[styles.pickerItem, { backgroundColor: colors.cardBackground }, selectedStartMinute === minute && styles.pickerItemSelected]} onPress={() => setSelectedStartMinute(minute)}>
                      <Text style={[styles.pickerText, { color: colors.text }, selectedStartMinute === minute && styles.pickerTextSelected]}>{minute.toString().padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowStartTimePicker(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmStartTime}>
                  <Text style={styles.modalConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
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
                <View>
                  <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
                </View>
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

        <Modal visible={showParentPicker} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Parents concernés</Text>
              <ScrollView style={{ maxHeight: 200, marginBottom: 10 }}>
                {allParents.map((parent: any) => (
                  <TouchableOpacity
                    key={parent.id}
                    style={[styles.childItem, { backgroundColor: colors.cardBackground }]}
                    onPress={() => toggleParentSelection(parent.id)}
                  >
                    <Text style={[styles.childName, { color: colors.text }]}>{parent.firstName}</Text>
                    {selectedParents.includes(parent.id) && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: colors.cardBackground, marginTop: 20 }]} onPress={() => setShowParentPicker(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Fermer</Text>
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
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  updateButtonStyle: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  updateButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
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
