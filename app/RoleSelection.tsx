import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../constants/firebase';
import { createAndPersistSession } from '../constants/sessionManager';

export default function RoleSelectionScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [loading, setLoading] = useState(true);
  const [userDoc, setUserDoc] = useState<any>(null);
  const uid = useMemo(() => (typeof userId === 'string' ? userId : auth.currentUser?.uid), [userId]);

  useEffect(() => {
    const load = async () => {
      if (!uid) {
        router.replace('/(auth)/LoginScreen');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          setUserDoc({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error('Error loading user for role selection', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [uid, router]);

  const handleSelect = async (role: 'parent' | 'professionnel') => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/(auth)/LoginScreen');
      return;
    }
    await createAndPersistSession(user, role);

    if (role === 'parent') {
      const hasFamily = (userDoc?.familyIds?.length || userDoc?.familyId) ? true : false;
      router.replace(hasFamily ? '/(tabs)' : '/FamilyCodeScreen');
    } else {
      router.replace('/(pro-tabs)');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.tint }]}>Choisissez votre mode</Text>
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.cardBackground }]}
          onPress={() => handleSelect('parent')}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>Continuer en tant que Parent</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Accéder à l'espace famille</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.cardBackground }]}
          onPress={() => handleSelect('professionnel')}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>Continuer en tant que professionnel</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Accéder à l'espace professionnel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  cardContainer: { width: '100%', gap: 16 },
  card: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { fontSize: 14 },
});
