import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProMessageScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Messages Professionnels</Text>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#FFCEB0' }]}>Mes conversations</Text>
            <Text style={styles.emptyText}>Fonctionnalité à venir</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFCEB0' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  emptyText: { color: '#B0B0B0', textAlign: 'center', fontSize: 15 },
});
