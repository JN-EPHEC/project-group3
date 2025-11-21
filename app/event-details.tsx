import { Colors } from '@/constants/theme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { db } from '../constants/firebase';

export default function EventDetailsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { eventId } = useLocalSearchParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId || typeof eventId !== 'string') return;
      
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Événement introuvable</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
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
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.cardBackground }]} onPress={() => router.back()}>
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.tint }]}>{event.title}</Text>
            </View>

            <View style={styles.infoSection}>
              <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📅 Date</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {event.date?.toDate().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>

              <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>🕐 Heure</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {event.isAllDay 
                    ? 'Toute la journée' 
                    : event.startTime && event.endTime
                      ? `${event.startTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${event.endTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                      : event.date?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  }
                </Text>
              </View>

              {event.category && (
                <View style={[styles.infoRow, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>🏷️ Catégorie</Text>
                  <View style={styles.categoryContainer}>
                    <View style={[styles.categoryDot, { backgroundColor: event.category.color }]} />
                    <Text style={[styles.infoValue, { color: colors.text }]}>{event.category.name}</Text>
                  </View>
                </View>
              )}

              {event.description && (
                <View style={[styles.descriptionSection, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.descriptionLabel, { color: colors.textSecondary }]}>📝 Description</Text>
                  <Text style={[styles.descriptionText, { color: colors.text }]}>{event.description}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push(`/edit-event?eventId=${event.id}`)}
            >
              <Text style={styles.editButtonText}>Modifier l'événement</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  closeButton: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  closeButtonText: { fontSize: 24, color: '#666', fontWeight: '300' },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '700', color: '#87CEEB' },
  infoSection: { marginBottom: 32 },
  infoRow: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '600' },
  infoValue: { fontSize: 16, color: '#111', textTransform: 'capitalize' },
  categoryContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  categoryDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  descriptionSection: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16 },
  descriptionLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '600' },
  descriptionText: { fontSize: 16, color: '#111', lineHeight: 24 },
  editButton: { backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  editButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  errorText: { fontSize: 18, color: '#666', marginBottom: 20 },
  backButton: { backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
