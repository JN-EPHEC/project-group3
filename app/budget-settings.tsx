import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily } from '../constants/firebase';

export default function BudgetSettingsScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBudget = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userFamily = await getUserFamily(currentUser.uid);
        if (userFamily?.id) {
          const budgetDoc = await getDoc(doc(db, 'budgets', userFamily.id));
          if (budgetDoc.exists()) {
            setCategories(budgetDoc.data().categories || []);
          } else {
            // Catégories par défaut
            setCategories([
              { name: 'Vêtements', limit: 50 },
              { name: 'Alimentation', limit: 100 },
              { name: 'Santé', limit: 150 },
              { name: 'Éducation', limit: 200 },
              { name: 'Loisirs', limit: 80 },
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching budget:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, []);

  const handleAddCategory = () => {
    setCategories([...categories, { name: '', limit: 0 }]);
  };

  const handleRemoveCategory = (index: number) => {
    const newCategories = categories.filter((_, i) => i !== index);
    setCategories(newCategories);
  };

  const handleUpdateCategory = (index: number, field: 'name' | 'limit', value: string) => {
    const newCategories = [...categories];
    if (field === 'limit') {
      newCategories[index][field] = parseFloat(value) || 0;
    } else {
      newCategories[index][field] = value;
    }
    setCategories(newCategories);
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Validation
    const invalidCategories = categories.filter(c => !c.name.trim() || c.limit <= 0);
    if (invalidCategories.length > 0) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs avec des valeurs valides');
      return;
    }

    setSaving(true);
    try {
      const userFamily = await getUserFamily(currentUser.uid);
      if (userFamily?.id) {
        await setDoc(doc(db, 'budgets', userFamily.id), {
          familyId: userFamily.id,
          categories: categories,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid,
        });

        Alert.alert('Succès', 'Paramètres de budget sauvegardés', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color="#87CEEB" />
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Paramètres de budget</Text>
              <Text style={styles.subtitle}>Définissez les limites de dépenses par catégorie selon votre convention</Text>
            </View>

            <View style={styles.categoriesSection}>
              {categories.map((category, index) => (
                <View key={index} style={styles.categoryCard}>
                  <View style={styles.categoryInputs}>
                    <TextInput
                      style={styles.categoryNameInput}
                      placeholder="Nom de la catégorie"
                      value={category.name}
                      onChangeText={(value) => handleUpdateCategory(index, 'name', value)}
                      placeholderTextColor="#999"
                    />
                    <View style={styles.limitInputContainer}>
                      <TextInput
                        style={styles.limitInput}
                        placeholder="0"
                        value={category.limit.toString()}
                        onChangeText={(value) => handleUpdateCategory(index, 'limit', value)}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.currencySymbol}>€</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => handleRemoveCategory(index)}
                  >
                    <IconSymbol name="trash" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addCategoryButton} onPress={handleAddCategory}>
                <IconSymbol name="plus.circle" size={24} color="#87CEEB" />
                <Text style={styles.addCategoryText}>Ajouter une catégorie</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <IconSymbol name="info.circle" size={20} color="#87CEEB" />
              <Text style={styles.infoText}>
                Ces limites seront visibles par les deux parents et permettront de suivre les dépenses selon votre convention de divorce.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.disabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
              </TouchableOpacity>
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
  backButton: { marginBottom: 20 },
  backButtonText: { fontSize: 32, color: '#87CEEB', fontWeight: '300' },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#87CEEB', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22 },
  categoriesSection: { marginBottom: 24 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 12 },
  categoryInputs: { flex: 1, gap: 12 },
  categoryNameInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, color: '#111' },
  limitInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12 },
  limitInput: { flex: 1, padding: 12, fontSize: 16, color: '#111' },
  currencySymbol: { fontSize: 16, fontWeight: '600', color: '#666', marginLeft: 8 },
  removeButton: { marginLeft: 12, padding: 8 },
  addCategoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F7FF', borderRadius: 12, padding: 16, gap: 8 },
  addCategoryText: { fontSize: 16, fontWeight: '600', color: '#87CEEB' },
  infoCard: { flexDirection: 'row', backgroundColor: '#E7F7FF', borderRadius: 12, padding: 16, marginBottom: 24, gap: 12 },
  infoText: { flex: 1, fontSize: 14, color: '#666', lineHeight: 20 },
  buttonContainer: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveButton: { flex: 1, backgroundColor: '#87CEEB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.5 },
});
