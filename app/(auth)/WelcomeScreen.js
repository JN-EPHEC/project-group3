import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WelcomeScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>WeKid</Text>
        <Text style={styles.subtitle}>
          La platforme qui facilite la co-parentalité et met le bien-être de vos enfants au centre
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('UserTypeScreen')}
        >
          <Text style={styles.buttonText}>Inscription</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('LoginScreen')}
        >
          <Text style={styles.loginText}>J'ai déjà un compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BBE1FA',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 20,
    lineHeight: 32,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
