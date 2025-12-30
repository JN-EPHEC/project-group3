import { FONT_SIZES, SPACING, V_SPACING } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES } from '../constants/currencies';

export default function CurrenciesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Devises supportées</Text>
        <View style={styles.list}>
          {Object.entries(CURRENCIES).map(([code, name]) => (
            <View key={code} style={[styles.item, { borderBottomColor: colors.border }]}>
              <Text style={[styles.code, { color: colors.text }]}>{code}</Text>
              <Text style={[styles.name, { color: colors.textSecondary }]}>{String(name)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.large,
  },
  title: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '600',
    marginBottom: V_SPACING.medium,
  },
  list: {
    gap: V_SPACING.small,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: V_SPACING.small,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  code: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  name: {
    fontSize: FONT_SIZES.medium,
  },
});
