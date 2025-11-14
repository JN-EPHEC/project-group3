import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { auth, signOut } from '../../constants/firebase';
import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    } else {
      router.replace('/(auth)/LoginScreen');
    }
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/LoginScreen');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Bonjour {user?.email}</ThemedText>
      </ThemedView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/explore')} style={styles.button}>
          <ThemedText>Go to Explore</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.button}>
          <ThemedText>Logout</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#DDDDDD',
    padding: 16,
    borderRadius: 8,
  },
});
