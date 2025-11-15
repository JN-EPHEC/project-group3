import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const RegisterScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUri, setImageUri] = useState(null);

  const { userType } = useLocalSearchParams();
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    if (!firstName || !lastName || !email || !password) {
      setError('Veuillez remplir tous les champs obligatoires');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let photoURL = null;
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
          await uploadBytes(storageRef, blob);
          photoURL = await getDownloadURL(storageRef);
        } catch (uploadError) {
          setError('Inscription réussie mais échec upload image: ' + uploadError.message);
        }
      }

      const userDoc = {
        uid: user.uid,
        firstName,
        lastName,
        email: email.toLowerCase(),
        userType: userType || 'parent',
        createdAt: serverTimestamp(),
      };
      if (photoURL) userDoc.photoURL = photoURL;

      await setDoc(doc(db, 'users', user.uid), userDoc);

      // Redirection selon le type d'utilisateur
      if (userType === 'professionnel') {
        router.replace('/(pro-tabs)');
      } else {
        router.replace('FamilyCodeScreen');
      }
    } catch (error) {
      const msg = error?.code ? `${error.code} - ${error.message}` : error.message || String(error);
      setError('Erreur lors de l\'inscription : ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès aux images pour choisir une photo de profil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      setError('Erreur ouverture sélection images: ' + (err.message || String(err)));
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Inscription</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Nom*</Text>
          <TextInput
            style={styles.input}
            placeholder="Dupont"
            placeholderTextColor="#999"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Prénom*</Text>
          <TextInput
            style={styles.input}
            placeholder="Maya"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email*</Text>
          <TextInput
            style={styles.input}
            placeholder="votre@email.be"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Mot de passe*</Text>
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Photo de profil</Text>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoPlaceholder} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>✎</Text>
              </View>
            )}
          </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Créer le compte" onPress={handleRegister} disabled={loading} />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BBE1FA'
  },
  contentContainer: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 20
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
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#FFFFFF',
    marginBottom: 40
  },
  formContainer: {
    width: '100%'
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16
  },
  photoContainer: {
    marginBottom: 30
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  photoIcon: {
    fontSize: 24,
    color: '#999'
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  registerButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600'
  },
  loader: {
    marginTop: 20
  },
  error: {
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center'
  }
});

export default RegisterScreen;
