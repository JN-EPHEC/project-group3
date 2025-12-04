import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { auth, db } from '../constants/firebase';

export default function EventDetailsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { eventId } = useLocalSearchParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [childrenNames, setChildrenNames] = useState<string[]>([]);
  const [parentNames, setParentNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId || typeof eventId !== 'string') {
        setLoading(false);
        return;
      }

      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          setEvent(eventData);

          // Fetch children names
          if (eventData.familyId && eventData.childrenIds && eventData.childrenIds.length > 0) {
            const familyDoc = await getDoc(doc(db, 'families', eventData.familyId));
            if (familyDoc.exists()) {
              const familyData = familyDoc.data();
              const allChildren = familyData.children || [];
              const names = allChildren
                .filter((child: any) => eventData.childrenIds.includes(child.id))
                .map((child: any) => child.name);
              setChildrenNames(names);
            }
          }

          // Fetch parent names
          if (eventData.parentIds && eventData.parentIds.length > 0) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('__name__', 'in', eventData.parentIds));
            const querySnapshot = await getDocs(q);
            const pNames = querySnapshot.docs.map(doc => doc.data().firstName);
            setParentNames(pNames);
          }
          
          // Vérifier si l'utilisateur actuel est le créateur
          const currentUser = auth.currentUser;
          if (currentUser && eventData.userID === currentUser.uid) {
            setIsOwner(true);
          }
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        Alert.alert('Erreur', 'Impossible de charger l\'événement');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleDeleteEvent = async () => {
    if (!isOwner) {
      Alert.alert('Permission refusée', 'Vous n\'êtes pas autorisé à supprimer cet événement.');
      return;
    }

    if (!eventId || typeof eventId !== 'string') {
      Alert.alert('Erreur', 'ID d\'événement invalide');
      return;
    }

    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const eventRef = doc(db, 'events', eventId);
              await deleteDoc(eventRef);
              
              // Délai pour permettre la mise à jour de l'interface utilisateur avant de revenir en arrière
              setTimeout(() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  // Fallback si router.back() n'est pas possible
                  router.replace('/(tabs)/Agenda'); 
                }
              }, 500);

            } catch (error: any) {
              console.error('Error deleting event:', error);
              Alert.alert(
                'Erreur', 
                `Impossible de supprimer l\'événement.\nCode: ${error?.code}\nMessage: ${error?.message}`
              );
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={styles.containerCentered}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={styles.containerCentered}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>Événement introuvable</Text>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.container}>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.cardBackground }]} onPress={() => router.back()}>
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
            </View>

            {/* Catégorie */}
            {event.category && (
              <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📂 Catégorie</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{event.category.name}</Text>
              </View>
            )}

            {/* Date */}
            <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📅 Date</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {event.date?.toDate ? event.date.toDate().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }) : 'Date inconnue'}
              </Text>
            </View>

            {/* Horaire */}
            <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>🕐 Horaire</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {event.isAllDay 
                  ? 'Toute la journée' 
                  : event.startTime && event.endTime
                    ? `${event.startTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${event.endTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Heure non disponible'
                }
              </Text>
            </View>

            {/* Enfants concernés */}
            {childrenNames.length > 0 && (
              <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>👧👦 Enfants concernés</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{childrenNames.join(', ')}</Text>
              </View>
            )}

            {/* Parents concernés */}
            {parentNames.length > 0 && (
              <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>👥 Parents concernés</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{parentNames.join(', ')}</Text>
              </View>
            )}

            {/* Description */}
            {event.description && (
              <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📝 Description</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{event.description}</Text>
              </View>
            )}

            <View style={styles.infoSection} />

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: colors.tint }]} 
                onPress={() => router.push(`/edit-event?eventId=${event.id}`)}
              >
                <IconSymbol name="pencil" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>

              {isOwner && (
                <TouchableOpacity 
                  style={[styles.deleteButton, deleting && styles.disabled]}
                  onPress={handleDeleteEvent}
                  disabled={deleting}
                >
                  <IconSymbol name="trash" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  closeButton: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  closeButtonText: { fontSize: 24, color: '#666', fontWeight: '300' },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111', textAlign: 'center' },
  infoSection: { marginBottom: 32 },
  infoRow: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '600' },
  infoValue: { fontSize: 16, color: '#111' },
  buttonContainer: { flexDirection: 'row', gap: 12 },
  editButton: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  editButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  deleteButton: { flex: 1, backgroundColor: '#FF6B6B', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  deleteButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.5 },
  errorText: { fontSize: 18, color: '#666', marginBottom: 20 },
  backButton: { backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
