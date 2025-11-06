import { router } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const UserTypeScreen = () => {
  const buttonScale1 = new Animated.Value(1);
  const buttonScale2 = new Animated.Value(1);

  const handlePressIn = (scale) => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scale) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleUserTypeSelection = (type) => {
    router.push({
      pathname: 'RegisterScreen',
      params: { userType: type }
    });
  };

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </Pressable>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>WeKid</Text>
        <Text style={styles.subtitle}>
          La plateforme qui facilite la co-parentalité et met le bien-être de vos enfants au centre
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <AnimatedPressable
          style={[
            styles.button,
            { transform: [{ scale: buttonScale1 }] }
          ]}
          onPressIn={() => handlePressIn(buttonScale1)}
          onPressOut={() => handlePressOut(buttonScale1)}
          onPress={() => handleUserTypeSelection('parent')}
        >
          <Text style={styles.buttonText}>Je suis parent</Text>
        </AnimatedPressable>
        
        <AnimatedPressable
          style={[
            styles.button,
            { transform: [{ scale: buttonScale2 }] }
          ]}
          onPressIn={() => handlePressIn(buttonScale2)}
          onPressOut={() => handlePressOut(buttonScale2)}
          onPress={() => handleUserTypeSelection('professionnel')}
        >
          <Text style={styles.buttonText}>Je suis professionnel</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
};

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
    padding: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
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
  button: {
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
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default UserTypeScreen;