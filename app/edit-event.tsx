import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../constants/firebase';

export default function EditEventScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);

  const [initialTitle, setInitialTitle] = useState('');
  const [initialDescription, setInitialDescription] = useState('');
  const [initialDate, setInitialDate] = useState(new Date());
  const [initialIsAllDay, setInitialIsAllDay] = useState(false);

  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes());

  const dayScrollRef = useRef<any>(null);
  const monthScrollRef = useRef<any>(null);
  const yearScrollRef = useRef<any>(null);
  const hourScrollRef = useRef<any>(null);
  const minuteScrollRef = useRef<any>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId || typeof eventId !== 'string') return;
      
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const eventDate = eventData.date?.toDate() || new Date();
          
          setTitle(eventData.title || '');
          setDescription(eventData.description || '');
          setIsAllDay(eventData.isAllDay || false);
          setDate(eventDate);
          
          setInitialTitle(eventData.title || '');
          setInitialDescription(eventData.description || '');
          setInitialDate(eventDate);
          setInitialIsAllDay(eventData.isAllDay || false);
          
          setSelectedDay(eventDate.getDate());
          setSelectedMonth(eventDate.getMonth());
          setSelectedYear(eventDate.getFullYear());
          setSelectedHour(eventDate.getHours());
          setSelectedMinute(eventDate.getMinutes());
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
    return (
      title !== initialTitle ||
      description !== initialDescription ||
      isAllDay !== initialIsAllDay ||
      date.getTime() !== initialDate.getTime()
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
      Alert.alert('Erreur', 'Veuillez entrer un titre pour l\'événement');
      return;
    }

    setSaving(true);
    try {
      if (typeof eventId !== 'string') return;

      await updateDoc(doc(db, 'events', eventId), {
        title: title.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(date),
        isAllDay: isAllDay,
        updatedAt: Timestamp.now(),
      });

      // Redirection immédiate sans alert
      router.replace('/(tabs)/Agenda');
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'événement');
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

  const confirmTime = () => {
    const newDate = new Date(date);
    newDate.setHours(selectedHour);
    newDate.setMinutes(selectedMinute);
    setDate(newDate);
    setShowTimePicker(false);
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" />
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
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Titre *</Text>
                <TextInput style={styles.input} placeholder="Ex: Rendez-vous médecin" value={title} onChangeText={setTitle} placeholderTextColor="#999" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => { setSelectedDay(date.getDate()); setSelectedMonth(date.getMonth()); setSelectedYear(date.getFullYear()); setShowDatePicker(true); }}>
                  <Text style={styles.dateButtonText}>{date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.toggleContainer}>
                <Text style={styles.label}>Toute la journée</Text>
                <TouchableOpacity style={[styles.toggle, isAllDay && styles.toggleActive]} onPress={() => setIsAllDay(!isAllDay)}>
                  <View style={[styles.toggleCircle, isAllDay && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>

              {!isAllDay && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Heure</Text>
                  <TouchableOpacity style={styles.dateButton} onPress={() => { setSelectedHour(date.getHours()); setSelectedMinute(date.getMinutes()); setShowTimePicker(true); }}>
                    <Text style={styles.dateButtonText}>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Ajouter une description..." value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top" placeholderTextColor="#999" />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButtonStyle} onPress={handleBack}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.updateButtonStyle, (saving || !hasChanges()) && styles.disabled]} onPress={handleUpdateEvent} disabled={saving || !hasChanges()}>
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

        <Modal visible={showTimePicker} transparent={true} animationType="slide" onShow={() => {
          setTimeout(() => {
            const itemHeight = 56;
            const visibleItems = 3.5;
            const centerOffset = (itemHeight * visibleItems) / 2 - itemHeight / 2;
            
            hourScrollRef.current?.scrollTo({ 
              y: Math.max(0, selectedHour * itemHeight - centerOffset), 
              animated: true 
            });
            minuteScrollRef.current?.scrollTo({ 
              y: Math.max(0, selectedMinute * itemHeight - centerOffset), 
              animated: true 
            });
          }, 300);
        }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sélectionner l'heure</Text>
              <View style={styles.pickerRow}>
                <ScrollView ref={hourScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {hours.map((hour) => (
                    <TouchableOpacity key={hour} style={[styles.pickerItem, selectedHour === hour && styles.pickerItemSelected]} onPress={() => setSelectedHour(hour)}>
                      <Text style={[styles.pickerText, selectedHour === hour && styles.pickerTextSelected]}>{hour.toString().padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.timeSeparator}>:</Text>
                <ScrollView ref={minuteScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                  {minutes.map((minute) => (
                    <TouchableOpacity key={minute} style={[styles.pickerItem, selectedMinute === minute && styles.pickerItemSelected]} onPress={() => setSelectedMinute(minute)}>
                      <Text style={[styles.pickerText, selectedMinute === minute && styles.pickerTextSelected]}>{minute.toString().padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmTime}>
                  <Text style={styles.modalConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
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
  modalCancelButton: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  modalConfirmButton: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
