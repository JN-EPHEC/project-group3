import { SafeAreaView, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

export default function ProMessageScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.tint }]}>Messages Professionnels</Text>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.tint }]}>Mes conversations</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Fonctionnalité à venir</Text>
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
