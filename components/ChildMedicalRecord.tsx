import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Types
export type SeverityLevel = 'Faible' | 'Modérée' | 'Sévère';

export interface AllergyEntry {
  name: string;
  severity: SeverityLevel;
}

export interface MedicalContact {
  name: string;
  phone: string;
  address?: string;
  type?: string; // for specialist
}

export interface TreatmentEntry {
  medicineName: string;
  dosage: string; // e.g., "5mg 2x/jour"
  duration: string; // e.g., "14 jours"
}

export interface VisitEntry {
  date: string; // ISO or human-readable for simplicity
  notes?: string;
}

export interface MedicalFile {
  id: string;
  label: string;
  url?: string;
}

export interface GeneralInfo {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD for simplicity
  nationalRegistryId: string;
  heightCm: string;
  weightKg: string;
  bloodType: string;
  knownAllergiesSummary: string;
  shoeSize: string;
  clothingSize: string;
}

export interface ChildMedicalRecordData {
  general: GeneralInfo;
  contacts: {
    primaryPhysician: MedicalContact;
    specialist?: MedicalContact;
    referenceHospital?: string;
  };
  history: {
    allergies: AllergyEntry[];
    diseases: string[];
    medicalHistory: string[];
  };
  currentTracking: {
    treatments: TreatmentEntry[];
    visits: VisitEntry[];
  };
  files: MedicalFile[];
}

// Mock Data
const MOCK_MEDICAL_RECORD: ChildMedicalRecordData = {
  general: {
    fullName: 'Jean Dupont',
    dateOfBirth: '2017-03-12',
    nationalRegistryId: 'FR-1234-5678-AB',
    heightCm: '128',
    weightKg: '28',
    bloodType: 'O+',
    knownAllergiesSummary: 'Pollens (printemps), arachides (faible).',
    shoeSize: '33',
    clothingSize: '8 ans'
  },
  contacts: {
    primaryPhysician: { name: 'Dr. Martin', phone: '+33 1 23 45 67 89', address: '12 Rue de la Santé, Paris' },
    specialist: { name: 'Dr. Leroy', type: 'Allergologue', phone: '+33 4 56 78 12 34' },
    referenceHospital: 'Hôpital Necker-Enfants Malades'
  },
  history: {
    allergies: [
      { name: 'Pollens', severity: 'Modérée' },
      { name: 'Arachides', severity: 'Faible' }
    ],
    diseases: ['Asthme léger'],
    medicalHistory: ['Bronchiolite (2019)', 'Entorse cheville (2023)']
  },
  currentTracking: {
    treatments: [
      { medicineName: 'Ventoline', dosage: '2 inhalations si besoin', duration: 'PRN' },
      { medicineName: 'Cetirizine', dosage: '5mg le soir', duration: 'Saison pollinique' }
    ],
    visits: [
      { date: '2025-09-21', notes: 'Contrôle annuel, RAS' },
      { date: '2024-11-03', notes: 'Suivi allergie, ajustement posologie' }
    ]
  },
  files: [
    { id: 'file-1', label: 'Carnet de vaccinations', url: 'https://example.com/vaccinations.pdf' },
    { id: 'file-2', label: 'Certificat médical (sport)', url: 'https://example.com/certificat-sport.pdf' }
  ]
};

// Component
export default function ChildMedicalRecord({ childName, initialRecord, onConfirm, saving }: { childName?: string; initialRecord?: ChildMedicalRecordData; onConfirm?: (record: ChildMedicalRecordData) => Promise<void> | void; saving?: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [editMode, setEditMode] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<null | 'general' | 'contacts' | 'history' | 'current' | 'files'>(null);
  const computedInitialRecord = useMemo<ChildMedicalRecordData>(() => {
    if (initialRecord) return initialRecord;
    return {
      ...MOCK_MEDICAL_RECORD,
      general: {
        ...MOCK_MEDICAL_RECORD.general,
        fullName: childName || MOCK_MEDICAL_RECORD.general.fullName,
      },
    };
  }, [childName, initialRecord]);
  const [record, setRecord] = useState<ChildMedicalRecordData>(computedInitialRecord);
  const [submitting, setSubmitting] = useState(false);
  const [originalRecord, setOriginalRecord] = useState<ChildMedicalRecordData | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Temp inputs for adding entries in history
  const [newHistoryEntry, setNewHistoryEntry] = useState('');
  const [newAllergyName, setNewAllergyName] = useState('');
  const [newAllergySeverity, setNewAllergySeverity] = useState<SeverityLevel>('Faible');

  const toggleSection = (id: NonNullable<typeof expandedSectionId>) => {
    setExpandedSectionId(prev => (prev === id ? null : id));
  };

  const onChangeGeneral = (key: keyof GeneralInfo, value: string) => {
    setRecord(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [key]: value,
      }
    }));
  };

  const onChangePrimaryPhysician = (key: keyof MedicalContact, value: string) => {
    setRecord(prev => ({
      ...prev,
      contacts: {
        ...prev.contacts,
        primaryPhysician: {
          ...prev.contacts.primaryPhysician,
          [key]: value,
        }
      }
    }));
  };

  const onChangeSpecialist = (key: keyof MedicalContact, value: string) => {
    setRecord(prev => ({
      ...prev,
      contacts: {
        ...prev.contacts,
        specialist: {
          ...(prev.contacts.specialist || { name: '', phone: '', type: '' }),
          [key]: value,
        }
      }
    }));
  };

  const addHistoryEntry = () => {
    const trimmed = newHistoryEntry.trim();
    if (!trimmed) return;
    setRecord(prev => ({
      ...prev,
      history: {
        ...prev.history,
        medicalHistory: [...prev.history.medicalHistory, trimmed]
      }
    }));
    setNewHistoryEntry('');
  };

  const addAllergy = () => {
    const name = newAllergyName.trim();
    if (!name) return;
    setRecord(prev => ({
      ...prev,
      history: {
        ...prev.history,
        allergies: [...prev.history.allergies, { name, severity: newAllergySeverity }]
      }
    }));
    setNewAllergyName('');
    setNewAllergySeverity('Faible');
  };

  const handleAddTreatment = () => {
    setRecord(prev => ({
      ...prev,
      currentTracking: {
        ...prev.currentTracking,
        treatments: [...prev.currentTracking.treatments, { medicineName: '', dosage: '', duration: '' }],
      },
    }));
  };

  const handleRemoveTreatment = (index: number) => {
    setRecord(prev => ({
      ...prev,
      currentTracking: {
        ...prev.currentTracking,
        treatments: prev.currentTracking.treatments.filter((_, i) => i !== index),
      },
    }));
  };

  const handleAddVisit = () => {
    setRecord(prev => ({
      ...prev,
      currentTracking: {
        ...prev.currentTracking,
        visits: [...prev.currentTracking.visits, { date: '', notes: '' }],
      },
    }));
  };

  const handleRemoveVisit = (index: number) => {
    setRecord(prev => ({
      ...prev,
      currentTracking: {
        ...prev.currentTracking,
        visits: prev.currentTracking.visits.filter((_, i) => i !== index),
      },
    }));
  };

  const sanitizeFileName = (name: string) => name.replace(/[^a-z0-9._-]/gi, '_');

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploadingFile(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const storage = getStorage();
      const safeChild = sanitizeFileName(record.general.fullName || childName || 'enfant');
      const safeName = sanitizeFileName(asset.name || 'document');
      const path = `medical_files/${safeChild}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      const newFile: MedicalFile = { id: path, label: asset.name || 'Document', url: downloadUrl };
      setRecord(prev => ({ ...prev, files: [...prev.files, newFile] }));
      Alert.alert('Document importé', 'Le fichier a été ajouté à la fiche médicale.');
    } catch (e) {
      console.error('Error uploading medical file', e);
      Alert.alert('Erreur', 'Impossible d\'importer le document.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadFile = async (file: MedicalFile) => {
    if (!file.url) {
      Alert.alert('Erreur', 'Aucun lien disponible pour ce fichier.');
      return;
    }
    setDownloadingFileId(file.id);
    try {
      const safeName = sanitizeFileName(file.label || 'document');
      const destination = `${FileSystem.cacheDirectory || ''}${safeName}`;
      await FileSystem.downloadAsync(file.url, destination);
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(destination, {
          mimeType: 'application/pdf',
          dialogTitle: 'Enregistrer le document',
          UTI: 'public.item'
        });
      } else {
        Alert.alert('Téléchargé', `Fichier téléchargé dans le cache temporaire.`);
      }
    } catch (e) {
      console.error('Error downloading medical file', e);
      Alert.alert('Erreur', 'Téléchargement impossible.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const SectionHeader = ({ title, id }: { title: string; id: NonNullable<typeof expandedSectionId> }) => (
    <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(id)} activeOpacity={0.85}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <IconSymbol name={expandedSectionId === id ? 'chevron.up' : 'chevron.down'} size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
      {/* 1. Informations générales */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionHeader title="Informations générales" id="general" />
        {expandedSectionId === 'general' && (
          <View style={styles.sectionBody}>
            {editMode ? (
              <>
                <LabeledInput label="Nom / Prénom" value={record.general.fullName} onChangeText={(t) => onChangeGeneral('fullName', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <LabeledInput label="Date de naissance" value={record.general.dateOfBirth} onChangeText={(t) => onChangeGeneral('dateOfBirth', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <LabeledInput label="Identifiant national" value={record.general.nationalRegistryId} onChangeText={(t) => onChangeGeneral('nationalRegistryId', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <DualInputs
                  leftLabel="Taille (cm)"
                  leftValue={record.general.heightCm}
                  onLeftChange={(t) => onChangeGeneral('heightCm', t)}
                  rightLabel="Poids (kg)"
                  rightValue={record.general.weightKg}
                  onRightChange={(t) => onChangeGeneral('weightKg', t)}
                  placeholderColor={colors.textSecondary}
                  inputBg={colors.background}
                  inputText={colors.text}
                  inputBorder={colors.border}
                  labelColor={colors.textSecondary}
                />
                <LabeledInput label="Groupe sanguin" value={record.general.bloodType} onChangeText={(t) => onChangeGeneral('bloodType', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <LabeledInput label="Allergies connues (résumé)" value={record.general.knownAllergiesSummary} onChangeText={(t) => onChangeGeneral('knownAllergiesSummary', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <DualInputs
                  leftLabel="Pointure"
                  leftValue={record.general.shoeSize}
                  onLeftChange={(t) => onChangeGeneral('shoeSize', t)}
                  rightLabel="Taille vêt." 
                  rightValue={record.general.clothingSize}
                  onRightChange={(t) => onChangeGeneral('clothingSize', t)}
                  placeholderColor={colors.textSecondary}
                  inputBg={colors.background}
                  inputText={colors.text}
                  inputBorder={colors.border}
                  labelColor={colors.textSecondary}
                />
              </>
            ) : (
              <>
                <ReadRow label="Nom / Prénom" value={record.general.fullName} colors={colors} />
                <ReadRow label="Date de naissance" value={record.general.dateOfBirth} colors={colors} />
                <ReadRow label="Identifiant national" value={record.general.nationalRegistryId} colors={colors} />
                <ReadRow label="Taille (cm)" value={record.general.heightCm} colors={colors} />
                <ReadRow label="Poids (kg)" value={record.general.weightKg} colors={colors} />
                <ReadRow label="Groupe sanguin" value={record.general.bloodType} colors={colors} />
                <ReadRow label="Allergies connues" value={record.general.knownAllergiesSummary} colors={colors} />
                <ReadRow label="Pointure" value={record.general.shoeSize} colors={colors} />
                <ReadRow label="Taille vêt." value={record.general.clothingSize} colors={colors} />
              </>
            )}
          </View>
        )}
      </View>

      {/* 2. Informations médicales */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionHeader title="Informations médicales" id="contacts" />
        {expandedSectionId === 'contacts' && (
          <View style={styles.sectionBody}>
            <Text style={[styles.subTitle, { color: colors.text }]}>Médecin traitant</Text>
            {editMode ? (
              <>
                <LabeledInput label="Nom" value={record.contacts.primaryPhysician.name} onChangeText={(t) => onChangePrimaryPhysician('name', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <LabeledInput label="Téléphone" value={record.contacts.primaryPhysician.phone} onChangeText={(t) => onChangePrimaryPhysician('phone', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <LabeledInput label="Adresse" value={record.contacts.primaryPhysician.address || ''} onChangeText={(t) => onChangePrimaryPhysician('address', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
              </>
            ) : (
              <>
                <ReadRow label="Nom" value={record.contacts.primaryPhysician.name} colors={colors} />
                <ReadRow label="Téléphone" value={record.contacts.primaryPhysician.phone} colors={colors} />
                <ReadRow label="Adresse" value={record.contacts.primaryPhysician.address || '—'} colors={colors} />
              </>
            )}

            <Text style={[styles.subTitle, { marginTop: 12, color: colors.text }]}>Spécialiste</Text>
            {editMode ? (
              <>
                <LabeledInput label="Nom" value={record.contacts.specialist?.name || ''} onChangeText={(t) => onChangeSpecialist('name', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <LabeledInput label="Type" value={record.contacts.specialist?.type || ''} onChangeText={(t) => onChangeSpecialist('type', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
                <LabeledInput label="Téléphone" value={record.contacts.specialist?.phone || ''} onChangeText={(t) => onChangeSpecialist('phone', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
              </>
            ) : (
              <>
                <ReadRow label="Nom" value={record.contacts.specialist?.name || '—'} colors={colors} />
                <ReadRow label="Type" value={record.contacts.specialist?.type || '—'} colors={colors} />
                <ReadRow label="Téléphone" value={record.contacts.specialist?.phone || '—'} colors={colors} />
              </>
            )}

            <Text style={[styles.subTitle, { marginTop: 12, color: colors.text }]}>Hôpital de référence</Text>
            {editMode ? (
              <LabeledInput label="Hôpital" value={record.contacts.referenceHospital || ''} onChangeText={(t) => setRecord(prev => ({ ...prev, contacts: { ...prev.contacts, referenceHospital: t } }))} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} labelColor={colors.textSecondary} />
            ) : (
              <ReadRow label="Hôpital" value={record.contacts.referenceHospital || '—'} colors={colors} />
            )}
          </View>
        )}
      </View>

      {/* 3. Santé et antécédents */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionHeader title="Santé et antécédents" id="history" />
        {expandedSectionId === 'history' && (
          <View style={styles.sectionBody}>
            <Text style={[styles.subTitle, { color: colors.text }]}>Allergies</Text>
            {record.history.allergies.map((a, idx) => (
              <ReadRow key={`alg-${idx}`} label={a.name} value={`Sévérité: ${a.severity}`} colors={colors} />
            ))}
            {editMode && (
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Allergie"
                  placeholderTextColor={colors.textSecondary}
                  value={newAllergyName}
                  onChangeText={setNewAllergyName}
                />
                <TextInput
                  style={[styles.input, { flexBasis: '40%', backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Sévérité (Faible/Modérée/Sévère)"
                  placeholderTextColor={colors.textSecondary}
                  value={newAllergySeverity}
                  onChangeText={(t) => setNewAllergySeverity((t as SeverityLevel) || 'Faible')}
                />
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]} onPress={addAllergy}>
                  <Text style={[styles.addButtonText, { color: '#fff' }]}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.subTitle, { marginTop: 12, color: colors.text }]}>Maladies / Conditions</Text>
            {record.history.diseases.map((d, idx) => (
              <ReadRow key={`dis-${idx}`} label={`Condition #${idx + 1}`} value={d} colors={colors} />
            ))}

            <Text style={[styles.subTitle, { marginTop: 12, color: colors.text }]}>Antécédents médicaux</Text>
            {record.history.medicalHistory.map((h, idx) => (
              <ReadRow key={`hist-${idx}`} label={`Entrée #${idx + 1}`} value={h} colors={colors} />
            ))}
            {editMode && (
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Ajouter un antécédent"
                  placeholderTextColor={colors.textSecondary}
                  value={newHistoryEntry}
                  onChangeText={setNewHistoryEntry}
                />
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]} onPress={addHistoryEntry}>
                  <Text style={[styles.addButtonText, { color: '#fff' }]}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 4. Suivi médical courant */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionHeader title="Suivi médical courant" id="current" />
        {expandedSectionId === 'current' && (
          <View style={styles.sectionBody}>
            <Text style={[styles.subTitle, { color: colors.text }]}>Traitements en cours</Text>
            {record.currentTracking.treatments.map((t, idx) => (
              editMode ? (
                <View key={`trt-${idx}`} style={{ marginBottom: 10 }}>
                  <View style={[styles.dualRow, { alignItems: 'flex-start' }]}>
                    <TextInput style={[styles.input, styles.flexItem, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={t.medicineName} onChangeText={(val) => {
                      setRecord(prev => ({
                        ...prev,
                        currentTracking: { ...prev.currentTracking, treatments: prev.currentTracking.treatments.map((item, i) => i === idx ? { ...item, medicineName: val } : item) }
                      }));
                    }} />
                    <TextInput style={[styles.input, styles.flexItem, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={t.dosage} onChangeText={(val) => {
                      setRecord(prev => ({
                        ...prev,
                        currentTracking: { ...prev.currentTracking, treatments: prev.currentTracking.treatments.map((item, i) => i === idx ? { ...item, dosage: val } : item) }
                      }));
                    }} />
                    <TextInput style={[styles.input, styles.flexItem, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={t.duration} onChangeText={(val) => {
                      setRecord(prev => ({
                        ...prev,
                        currentTracking: { ...prev.currentTracking, treatments: prev.currentTracking.treatments.map((item, i) => i === idx ? { ...item, duration: val } : item) }
                      }));
                    }} />
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveTreatment(idx)} style={styles.inlineAction}>
                    <Text style={[styles.inlineActionText, { color: colors.dangerButton }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ReadRow key={`trt-${idx}`} label={t.medicineName} value={`${t.dosage} • ${t.duration}`} colors={colors} />
              )
            ))}
            {editMode && (
              <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint, alignSelf: 'flex-start', marginTop: 4 }]} onPress={handleAddTreatment}>
                <IconSymbol name="plus" size={16} color="#fff" />
                <Text style={[styles.addButtonText, { color: '#fff' }]}>Ajouter un traitement</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.subTitle, { marginTop: 12, color: colors.text }]}>Historique des visites</Text>
            {record.currentTracking.visits.map((v, idx) => (
              editMode ? (
                <View key={`vis-${idx}`} style={{ marginBottom: 10 }}>
                  <View style={[styles.dualRow, { alignItems: 'flex-start' }]}>
                    <TextInput style={[styles.input, styles.flexItem, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={v.date} onChangeText={(val) => {
                      setRecord(prev => ({
                        ...prev,
                        currentTracking: { ...prev.currentTracking, visits: prev.currentTracking.visits.map((item, i) => i === idx ? { ...item, date: val } : item) }
                      }));
                    }} />
                    <TextInput style={[styles.input, styles.flexItem, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={v.notes || ''} onChangeText={(val) => {
                      setRecord(prev => ({
                        ...prev,
                        currentTracking: { ...prev.currentTracking, visits: prev.currentTracking.visits.map((item, i) => i === idx ? { ...item, notes: val } : item) }
                      }));
                    }} />
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveVisit(idx)} style={styles.inlineAction}>
                    <Text style={[styles.inlineActionText, { color: colors.dangerButton }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ReadRow key={`vis-${idx}`} label={v.date} value={v.notes || '—'} colors={colors} />
              )
            ))}
            {editMode && (
              <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint, alignSelf: 'flex-start', marginTop: 4 }]} onPress={handleAddVisit}>
                <IconSymbol name="plus" size={16} color="#fff" />
                <Text style={[styles.addButtonText, { color: '#fff' }]}>Ajouter une visite</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 5. Fichiers/documents médicaux */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionHeader title="Fichiers / documents médicaux" id="files" />
        {expandedSectionId === 'files' && (
          <View style={styles.sectionBody}>
            {record.files.map((f) => (
              <View key={f.id} style={[styles.fileRow, { borderBottomColor: colors.border }]}>
                <IconSymbol name="doc.text" size={18} color={colors.tint} />
                <Text style={[styles.fileLabel, { color: colors.text }]} numberOfLines={1}>{f.label}</Text>
                <View style={{ flex: 1 }} />
                {f.url ? (
                  <TouchableOpacity onPress={() => handleDownloadFile(f)} disabled={downloadingFileId === f.id} style={styles.iconButton}>
                    <IconSymbol name="arrow.down.to.line" size={18} color={colors.tint} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {editMode && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.tint, alignSelf: 'flex-start', marginTop: 8 }]}
                onPress={handlePickFile}
                disabled={uploadingFile}
              >
                <IconSymbol name="paperclip" size={16} color="#fff" />
                <Text style={[styles.addButtonText, { color: '#fff' }]}>{uploadingFile ? 'Import en cours...' : 'Importer un document'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

function ReadRow({ label, value, colors }: { label: string; value: string; colors: typeof Colors.light }) {
  return (
    <View style={[styles.readRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.readLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.readValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function LabeledInput({ label, value, onChangeText, placeholderColor, inputBg, inputText, inputBorder, labelColor }: { label: string; value: string; onChangeText: (t: string) => void; placeholderColor: string; inputBg: string; inputText: string; inputBorder: string; labelColor: string }) {
  return (
    <View style={styles.inputRow}>
      <Text style={[styles.readLabel, { color: labelColor }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, color: inputText, borderColor: inputBorder }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={placeholderColor}
      />
    </View>
  );
}

function DualInputs(
  {
    leftLabel,
    leftValue,
    onLeftChange,
    rightLabel,
    rightValue,
    onRightChange,
    placeholderColor,
    inputBg,
    inputText,
    inputBorder,
    labelColor
  }:
  {
    leftLabel: string;
    leftValue: string;
    onLeftChange: (t: string) => void;
    rightLabel: string;
    rightValue: string;
    onRightChange: (t: string) => void;
    placeholderColor: string;
    inputBg: string;
    inputText: string;
    inputBorder: string;
    labelColor: string;
  }
) {
  return (
    <View style={styles.dualRow}>
      <View style={styles.dualItem}>
        <Text style={[styles.readLabel, { color: labelColor }]}>{leftLabel}</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, color: inputText, borderColor: inputBorder }]} value={leftValue} onChangeText={onLeftChange} placeholderTextColor={placeholderColor} />
      </View>
      <View style={styles.dualItem}>
        <Text style={[styles.readLabel, { color: labelColor }]}>{rightLabel}</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, color: inputText, borderColor: inputBorder }]} value={rightValue} onChangeText={onRightChange} placeholderTextColor={placeholderColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.large,
    paddingTop: V_SPACING.medium,
    paddingBottom: V_SPACING.large,
  },
  card: {
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.regular,
    borderWidth: 1,
    marginBottom: V_SPACING.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
  },
  sectionBody: {
    marginTop: V_SPACING.medium,
  },
  subTitle: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginBottom: V_SPACING.tiny,
  },
  readRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: V_SPACING.small,
    gap: SPACING.regular,
  },
  readLabel: {
    fontSize: FONT_SIZES.small,
    flexBasis: '45%',
  },
  readValue: {
    fontSize: FONT_SIZES.small,
    flexBasis: '55%',
    textAlign: 'right',
  },
  inputRow: {
    marginBottom: V_SPACING.small,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.small,
    paddingVertical: V_SPACING.small,
    fontSize: FONT_SIZES.small,
  },
  dualRow: {
    flexDirection: 'row',
    gap: SPACING.regular,
    marginBottom: V_SPACING.small,
  },
  dualItem: {
    flex: 1,
  },
  flexItem: {
    flex: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.regular,
    marginTop: V_SPACING.small,
  },
  addButton: {
    paddingHorizontal: SPACING.small,
    paddingVertical: V_SPACING.small,
    borderRadius: BORDER_RADIUS.medium,
  },
  addButtonText: {
    fontWeight: '600',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.regular,
    paddingVertical: V_SPACING.small,
    borderBottomWidth: 1,
  },
  fileLabel: {
    fontSize: FONT_SIZES.small,
  },
  iconButton: {
    padding: hs(4),
  },
  inlineAction: {
    alignSelf: 'flex-end',
    marginTop: V_SPACING.tiny,
  },
  inlineActionText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '600',
  },
});
