import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Standalone pro help center, not part of the tab bar
export const href = null;
export const options = { headerShown: false };

export default function HelpCenterPro() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const accentColor = '#FFCEB0';

  const openMail = async () => {
    const mailto = 'mailto:support@wekid.be?subject=Aide%20Pro%20WeKid&body=Décrivez votre question:';
    const can = await Linking.canOpenURL(mailto);
    if (!can) return;
    await Linking.openURL(mailto);
  };

  const openFaq = async () => {
    const url = 'https://wekid.be/faq-pro';
    try { await Linking.openURL(url); } catch (error) { /* no-op */ }
  };

  const openWhatsapp = async () => {
    const url = 'https://wa.me/33600000000?text=Bonjour%20WeKid';
    try { await Linking.openURL(url); } catch (error) { /* no-op */ }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: '#0f172a' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: accentColor }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.heroTitle, { color: '#fff' }]}>Centre d'aide Pro</Text>
          <Text style={[styles.heroSubtitle, { color: '#e2e8f0' }]}>Guides rapides, assistance et réglages adaptés aux professionnels.</Text>
          <View style={styles.heroBadges}>
            <View style={[styles.badge, { backgroundColor: accentColor }]}> 
              <Text style={[styles.badgeText, { color: '#0f172a' }]}>Support 7j/7</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: accentColor }]}> 
              <Text style={[styles.badgeText, { color: '#0f172a' }]}>Temps de réponse &lt; 24h</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Accès rapide</Text>
          <View style={styles.cardGrid}>
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.cardBackground }]} onPress={openMail} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
                <IconSymbol name="envelope.fill" size={24} color={accentColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Nous écrire</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>support@wekid.be</Text>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: accentColor + '10' }]}>
                <IconSymbol name="arrow.right" size={14} color={accentColor} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.cardBackground }]} onPress={openWhatsapp} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
                <IconSymbol name="message.fill" size={24} color={accentColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Chat Whatsapp</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Réponses rapides</Text>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: accentColor + '10' }]}>
                <IconSymbol name="arrow.right" size={14} color={accentColor} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.cardBackground }]} onPress={openFaq} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
                <IconSymbol name="questionmark.circle.fill" size={24} color={accentColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>FAQ Pro</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Guides et tutoriels</Text>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: accentColor + '10' }]}>
                <IconSymbol name="arrow.right" size={14} color={accentColor} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Guides essentiels</Text>
          <View style={[styles.listCard, { backgroundColor: colors.cardBackground }]}>
            {[ 
              'Configurer vos disponibilités',
              'Gérer vos notifications et alertes',
              'Sécurité et confidentialité des dossiers',
              'Exporter vos données professionnelles',
            ].map((item, idx) => (
              <View key={idx} style={styles.listRow}>
                <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
                <Text style={[styles.listText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Besoin d'aide immédiate ?</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Préférez l'email pour un suivi, le chat pour une réponse rapide.</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accentColor }]} onPress={openMail}>
              <Text style={styles.primaryText}>Contacter le support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: accentColor }]} onPress={openWhatsapp}>
              <Text style={[styles.secondaryText, { color: accentColor }]}>Ouvrir le chat</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  hero: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { marginBottom: 12, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  backText: { fontSize: 20, fontWeight: '700' },
  heroTitle: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  heroSubtitle: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  heroBadges: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  section: { paddingHorizontal: 20, paddingTop: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  sectionSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardGrid: { flexDirection: 'column', gap: 14 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 18, 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowRadius: 12, 
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  cardContent: {
    flex: 1,
    gap: 4
  },
  cardTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  cardDesc: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  listCard: { borderRadius: 14, padding: 14, gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listText: { fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  primaryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '800' },
});
