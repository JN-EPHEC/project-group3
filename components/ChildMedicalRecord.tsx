import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

  const SectionHeader = ({ title, id }: { title: string; id: NonNullable<typeof expandedSectionId> }) => (
    <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(id)} activeOpacity={0.85}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <IconSymbol name={expandedSectionId === id ? 'chevron.up' : 'chevron.down'} size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header: Child name left, actions right */}
      <View style={styles.headerRow}>
        <Text style={[styles.childNameText, { color: colors.textSecondary }]}>{record.general.fullName || childName || 'Enfant'}</Text>
        {editMode ? (
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity
              disabled={!!saving || submitting}
              onPress={() => {
                if (originalRecord) setRecord(originalRecord);
                setEditMode(false);
                setOriginalRecord(null);
              }}
            >
              <Text style={[styles.editButtonText, { color: colors.textSecondary, fontStyle: 'normal' }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!!saving || submitting}
              onPress={async () => {
                try {
                  setSubmitting(true);
                  await onConfirm?.(record);
                  setEditMode(false);
                  setOriginalRecord(null);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <Text style={[styles.editButtonText, { color: colors.tint, fontStyle: 'normal' }]}>{saving || submitting ? 'Enregistrement...' : 'Confirmer'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setOriginalRecord(record); setEditMode(true); }}>
            <Text style={[styles.editButtonText, { color: colors.tint }]}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 1. Informations générales */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionHeader title="Informations générales" id="general" />
        {expandedSectionId === 'general' && (
          <View style={styles.sectionBody}>
            {editMode ? (
              <>
                <LabeledInput label="Nom / Prénom" value={record.general.fullName} onChangeText={(t) => onChangeGeneral('fullName', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
                <LabeledInput label="Date de naissance" value={record.general.dateOfBirth} onChangeText={(t) => onChangeGeneral('dateOfBirth', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
                <LabeledInput label="Identifiant national" value={record.general.nationalRegistryId} onChangeText={(t) => onChangeGeneral('nationalRegistryId', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
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
                />
                <LabeledInput label="Groupe sanguin" value={record.general.bloodType} onChangeText={(t) => onChangeGeneral('bloodType', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
                <LabeledInput label="Allergies connues (résumé)" value={record.general.knownAllergiesSummary} onChangeText={(t) => onChangeGeneral('knownAllergiesSummary', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
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
                <LabeledInput label="Nom" value={record.contacts.primaryPhysician.name} onChangeText={(t) => onChangePrimaryPhysician('name', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
                <LabeledInput label="Téléphone" value={record.contacts.primaryPhysician.phone} onChangeText={(t) => onChangePrimaryPhysician('phone', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
                <LabeledInput label="Adresse" value={record.contacts.primaryPhysician.address || ''} onChangeText={(t) => onChangePrimaryPhysician('address', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
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
                <LabeledInput label="Nom" value={record.contacts.specialist?.name || ''} onChangeText={(t) => onChangeSpecialist('name', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
                <LabeledInput label="Type" value={record.contacts.specialist?.type || ''} onChangeText={(t) => onChangeSpecialist('type', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
                <LabeledInput label="Téléphone" value={record.contacts.specialist?.phone || ''} onChangeText={(t) => onChangeSpecialist('phone', t)} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
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
              <LabeledInput label="Hôpital" value={record.contacts.referenceHospital || ''} onChangeText={(t) => setRecord(prev => ({ ...prev, contacts: { ...prev.contacts, referenceHospital: t } }))} placeholderColor={colors.textSecondary} inputBg={colors.background} inputText={colors.text} inputBorder={colors.border} />
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
                <View key={`trt-${idx}`} style={styles.dualRow}>
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
              ) : (
                <ReadRow key={`trt-${idx}`} label={t.medicineName} value={`${t.dosage} • ${t.duration}`} colors={colors} />
              )
            ))}

            <Text style={[styles.subTitle, { marginTop: 12, color: colors.text }]}>Historique des visites</Text>
            {record.currentTracking.visits.map((v, idx) => (
              editMode ? (
                <View key={`vis-${idx}`} style={styles.dualRow}>
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
              ) : (
                <ReadRow key={`vis-${idx}`} label={v.date} value={v.notes || '—'} colors={colors} />
              )
            ))}
          </View>
        )}
      </View>

      {/* 5. Fichiers/documents médicaux */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionHeader title="Fichiers / documents médicaux" id="files" />
        {expandedSectionId === 'files' && (
          <View style={styles.sectionBody}>
            {record.files.map((f) => (
              <View key={f.id} style={styles.fileRow}>
                <IconSymbol name="doc.text" size={18} color={colors.tint} />
                <Text style={[styles.fileLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => {/* Could implement file view */}}>
                  <IconSymbol name="eye" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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

function LabeledInput({ label, value, onChangeText, placeholderColor, inputBg, inputText, inputBorder }: { label: string; value: string; onChangeText: (t: string) => void; placeholderColor: string; inputBg: string; inputText: string; inputBorder: string }) {
  return (
    <View style={styles.inputRow}>
      <Text style={[styles.readLabel]}>{label}</Text>
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
    inputBorder
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
  }
) {
  return (
    <View style={styles.dualRow}>
      <View style={styles.dualItem}>
        <Text style={[styles.readLabel]}>{leftLabel}</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, color: inputText, borderColor: inputBorder }]} value={leftValue} onChangeText={onLeftChange} placeholderTextColor={placeholderColor} />
      </View>
      <View style={styles.dualItem}>
        <Text style={[styles.readLabel]}>{rightLabel}</Text>
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
    padding: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  childNameText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButtonText: {
    fontStyle: 'italic',
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionBody: {
    marginTop: 12,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  readRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: 8,
    gap: 8,
  },
  readLabel: {
    fontSize: 13,
    flexBasis: '45%',
  },
  readValue: {
    fontSize: 13,
    flexBasis: '55%',
    textAlign: 'right',
  },
  inputRow: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
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
    gap: 8,
    marginTop: 8,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  fileLabel: {
    fontSize: 13,
  },
});
