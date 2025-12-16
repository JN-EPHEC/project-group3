import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { auth, createFamilyForUser } from '../../constants/firebase';
import { Colors } from '../../constants/theme';

export default function CreationFamilyCodeScreen() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [familyCode, setFamilyCode] = useState(null);
  const [error, setError] = useState(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/(auth)/LoginScreen');
      return;
    }
    setUid(user.uid);
  }, [router]);

  async function handleCreateFamily() {
    if (!uid) {
      setError('Utilisateur non connecté.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const family = await createFamilyForUser(uid);
      if (family) {
        setFamilyCode(family.code);
      } else {
        setError('Erreur lors de la création de la famille.');
      }
    } catch (e) {
      setError('Erreur lors de la création de la famille.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleShareCode = async () => {
    if (!familyCode) return;
    
    try {
      await Share.share({
        message: `Rejoins ma famille sur WeKid avec le code : ${familyCode}\n\nPour télécharger l'application : https://wekid.com/app`,
        title: 'Code famille WeKid',
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const handleGoToHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
      </TouchableOpacity>

      <View style={styles.contentWrapper}>
        {!familyCode ? (
          <>
            <Text style={[styles.title, { color: colors.tint }]}>Créer une famille</Text>
            <Text style={[styles.subtitle, { color: colors.tint }]}>
              Un code unique sera généré pour votre famille. Partagez-le avec vos proches !
            </Text>

            <TouchableOpacity
              onPress={handleCreateFamily}
              disabled={loading}
              style={[styles.createButton, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.createButtonText, { color: '#fff' }]}>
                {loading ? 'Création en cours...' : 'Créer ma famille'}
              </Text>
            </TouchableOpacity>

            {error && <Text style={[styles.error, { color: colors.dangerButton }]}>{error}</Text>}
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.tint }]}>Famille créée !</Text>
            <Text style={[styles.subtitle, { color: colors.tint }]}>
              Votre code famille a été généré avec succès
            </Text>

            <View style={styles.codeContainer}>
              <Text style={[styles.codeLabel, { color: colors.text }]}>Votre code famille</Text>
              <View style={[styles.codeBox, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.codeText, { color: colors.tint }]}>{familyCode}</Text>
              </View>
              <Text style={[styles.codeHint, { color: colors.text }]}>
                Partagez ce code avec les membres de votre famille
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: colors.tint }]}
              onPress={handleShareCode}
            >
              <Text style={[styles.shareButtonText, { color: '#fff' }]}>Partager le code</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.homeButton, { borderColor: colors.text }]}
              onPress={handleGoToHome}
            >
              <Text style={[styles.homeButtonText, { color: colors.text }]}>Accéder à mon espace</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BBE1FA',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold'
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  createButton: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  createButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  codeContainer: {
    width: '90%',
    alignItems: 'center',
    marginBottom: 30,
  },
  codeLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: '600',
  },
  codeBox: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  codeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#87CEEB',
    letterSpacing: 4,
  },
  codeHint: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  shareButton: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  shareButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  homeButton: {
    width: '90%',
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});
