import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { deleteUserProfile, getDeleteProfileSummary } from '../constants/firebase';
import { Colors } from '../constants/theme';

interface DeleteProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

interface DeleteSummary {
  userFound: boolean;
  userType: string | null;
  email: string | null;
  familiesCount: number;
  conversationsCount: number;
  eventsCount: number;
  willDeleteFamilies: any[];
  willKeepFamilies: any[];
}

/**
 * Modal de suppression de profil
 * Affiche un résumé des données à supprimer et demande confirmation
 */
export default function DeleteProfileModal({ visible, onClose, userId }: DeleteProfileModalProps) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DeleteSummary | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [step, setStep] = useState('confirm'); // 'confirm' ou 'final'
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      loadSummary();
    }
  }, [visible, userId]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data: any = await getDeleteProfileSummary(userId);
      setSummary(data);
    } catch (error) {
      console.error('Erreur lors du chargement du résumé:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep('confirm');
    setConfirmationText('');
    setSummary(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleNextStep = () => {
    setStep('final');
  };

  const handleConfirmDelete = async () => {
    if (confirmationText !== 'SUPPRIMER MON PROFIL') {
      Alert.alert('Erreur', 'Veuillez taper exactement "SUPPRIMER MON PROFIL" pour confirmer');
      return;
    }

    try {
      setDeleting(true);
      const result: any = await deleteUserProfile(userId);

      if (result.success) {
        Alert.alert(
          'Profil supprimé',
          'Votre profil a été supprimé avec succès.',
          [
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                router.replace('/(auth)/WelcomeScreen');
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'La suppression a échoué');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={[styles.closeIcon, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: '#E74C3C' }]}>Supprimer mon profil</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : step === 'confirm' ? (
              // Étape 1: Confirmation et résumé
              <>
                <View style={[styles.warningBox, { backgroundColor: '#FFF3CD' }]}>
                  <Text style={[styles.warningTitle, { color: '#856404' }]}>⚠️ Attention</Text>
                  <Text style={[styles.warningText, { color: '#856404' }]}>
                    La suppression de votre profil est définitive et irréversible. Toutes vos données seront supprimées.
                  </Text>
                </View>

                {summary && summary.userFound ? (
                  <>
                    <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{summary.email}</Text>
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type de compte</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {summary.userType === 'professionnel' ? 'Professionnel' : 'Parent'}
                      </Text>
                    </View>

                    {summary.familiesCount > 0 && (
                      <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                          📋 Familles ({summary.familiesCount})
                        </Text>
                        
                        {summary.willDeleteFamilies.length > 0 && (
                          <View style={[styles.sectionBox, { backgroundColor: '#FADBD8' }]}>
                            <Text style={[styles.sectionLabel, { color: '#A93226' }]}>
                              ❌ Sera supprimée ({summary.willDeleteFamilies.length})
                            </Text>
                            {summary.willDeleteFamilies.map((family: any, idx: number) => (
                              <Text key={idx} style={[styles.familyItem, { color: '#A93226' }]}>
                                • {family.name}
                              </Text>
                            ))}
                          </View>
                        )}

                        {summary.willKeepFamilies.length > 0 && (
                          <View style={[styles.sectionBox, { backgroundColor: '#D5F4E6' }]}>
                            <Text style={[styles.sectionLabel, { color: '#145A32' }]}>
                              ✓ Vous serez retiré ({summary.willKeepFamilies.length})
                            </Text>
                            {summary.willKeepFamilies.map((family: any, idx: number) => (
                              <Text key={idx} style={[styles.familyItem, { color: '#145A32' }]}>
                                • {family.name}
                              </Text>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    {summary.conversationsCount > 0 && (
                      <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                          Conversations à supprimer
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {summary.conversationsCount} conversation(s)
                        </Text>
                      </View>
                    )}

                    {summary.eventsCount > 0 && (
                      <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                          Événements à supprimer
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {summary.eventsCount} événement(s)
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={[styles.errorText, { color: '#E74C3C' }]}>
                    Erreur: Impossible de charger les données
                  </Text>
                )}
              </>
            ) : (
              // Étape 2: Confirmation finale
              <>
                <View style={[styles.finalWarning, { backgroundColor: '#FADBD8' }]}>
                  <Text style={[styles.finalWarningTitle, { color: '#A93226' }]}>
                    ⚠️ Dernière chance
                  </Text>
                  <Text style={[styles.finalWarningText, { color: '#A93226' }]}>
                    Vous êtes sur le point de supprimer votre profil de manière définitive.
                  </Text>
                </View>

                <Text style={[styles.confirmLabel, { color: colors.text }]}>
                  Tapez exactement "{'\n'}SUPPRIMER MON PROFIL{'\n'}" pour confirmer:
                </Text>

                <TextInput
                  style={[
                    styles.confirmInput,
                    {
                      backgroundColor: colors.cardBackground,
                      color: colors.text,
                      borderColor: confirmationText === 'SUPPRIMER MON PROFIL' ? '#27AE60' : '#E74C3C'
                    }
                  ]}
                  placeholder="Taper ici..."
                  placeholderTextColor={colors.textSecondary}
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  editable={!deleting}
                  autoCapitalize="none"
                />

                {confirmationText === 'SUPPRIMER MON PROFIL' && (
                  <Text style={[styles.confirmSuccess, { color: '#27AE60' }]}>
                    ✓ Confirmation reçue
                  </Text>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.buttonCancel, { backgroundColor: colors.cardBackground }]}
              onPress={handleClose}
              disabled={deleting}
            >
              <Text style={[styles.buttonCancelText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>

            {step === 'confirm' ? (
              <TouchableOpacity
                style={[styles.buttonNext, { backgroundColor: '#E74C3C' }]}
                onPress={handleNextStep}
                disabled={loading}
              >
                <Text style={styles.buttonNextText}>Continuer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.buttonDelete,
                  {
                    backgroundColor: confirmationText === 'SUPPRIMER MON PROFIL' ? '#E74C3C' : '#BDC3C7',
                    opacity: confirmationText === 'SUPPRIMER MON PROFIL' ? 1 : 0.6
                  }
                ]}
                onPress={handleConfirmDelete}
                disabled={confirmationText !== 'SUPPRIMER MON PROFIL' || deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.buttonDeleteText}>Supprimer définitivement</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  container: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1'
  },
  closeButton: {
    padding: 8,
    marginRight: 10
  },
  closeIcon: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    maxHeight: '70%'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200
  },
  warningBox: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12'
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20
  },
  finalWarning: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E74C3C'
  },
  finalWarningTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8
  },
  finalWarningText: {
    fontSize: 14,
    lineHeight: 20
  },
  infoCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 10
  },
  sectionBox: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10
  },
  familyItem: {
    fontSize: 13,
    marginVertical: 3,
    paddingLeft: 10
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center'
  },
  confirmInput: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
    minHeight: 50
  },
  confirmSuccess: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
    gap: 10
  },
  buttonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BDC3C7'
  },
  buttonCancelText: {
    fontSize: 14,
    fontWeight: '600'
  },
  buttonNext: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonNextText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },
  buttonDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonDeleteText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  }
});
