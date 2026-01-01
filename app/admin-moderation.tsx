import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { auth, db } from '../constants/firebase';
import { Colors } from '../constants/theme';

export default function AdminAccessScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    router.replace('/(auth)/LoginScreen');
                    return;
                }

                // Vérifier si l'utilisateur est admin
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                const isAdminUser = userDoc.exists() && userDoc.data()?.isAdmin === true;
                
                setIsAdmin(isAdminUser);
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdminStatus();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                </View>
            </SafeAreaView>
        );
    }

    if (!isAdmin) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContainer}>
                    <IconSymbol name="xmark.circle.fill" size={48} color="#f44336" />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Accès refusé</Text>
                    <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
                        Vous n'avez pas les permissions pour accéder à cette section.
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.tint }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.buttonText}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={[styles.backButtonText, { color: colors.tint }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Panneau Modération</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.menuContainer}>
                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    onPress={() => router.push('/admin-message-reports')}
                >
                    <View style={styles.menuItemContent}>
                        <IconSymbol name="flag.fill" size={24} color="#FF9800" />
                        <View style={styles.menuItemText}>
                            <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                                Signalements de messages
                            </Text>
                            <Text style={[styles.menuItemDescription, { color: colors.textSecondary }]}>
                                Gérer les rapports abusifs
                            </Text>
                        </View>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    backButtonText: {
        fontSize: 24,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 32,
    },
    menuContainer: {
        padding: 16,
        gap: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    menuItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    menuItemDescription: {
        fontSize: 12,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 14,
        marginBottom: 24,
        textAlign: 'center',
    },
    button: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
