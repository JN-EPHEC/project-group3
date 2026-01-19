import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// --- TYPES (Identiques) ---
export type SeverityLevel = 'Faible' | 'Modérée' | 'Sévère';

export interface AllergyEntry {
  name: string;
  severity: SeverityLevel;
}

export interface MedicalContact {
  name: string;
  phone: string;
  address?: string;
  type?: string;
}

export interface TreatmentEntry {
  medicineName: string;
  dosage: string;
  duration: string;
}

export interface VisitEntry {
  date: string;
  notes?: string;
}

export interface MedicalFile {
  id: string;
  label: string;
  url?: string;
}

export interface GeneralInfo {
  fullName: string;
  dateOfBirth: string;
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

// Layout Animation pour Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- MOCK DATA ---
const MOCK_MEDICAL_RECORD: ChildMedicalRecordData = {
  general: {
    fullName: 'Jean Dupont',
    dateOfBirth: '12/03/2017',
    nationalRegistryId: '17.03.12-123.45',
    heightCm: '128',
    weightKg: '28',
    bloodType: 'O+',
    knownAllergiesSummary: 'Pollens, arachides',
    shoeSize: '33',
    clothingSize: '8 ans'
  },
  contacts: {
    primaryPhysician: { name: 'Dr. Martin', phone: '0470 12 34 56', address: 'Av. de la Gare 12, Bruxelles' },
    specialist: { name: 'Dr. Leroy', type: 'Allergologue', phone: '02 345 67 89' },
    referenceHospital: 'Cliniques Universitaires Saint-Luc'
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
      { medicineName: 'Ventoline', dosage: '2 puffs si besoin', duration: 'En cas de crise' },
      { medicineName: 'Cetirizine', dosage: '5mg le soir', duration: 'Printemps' }
    ],
    visits: [
      { date: '21/09/2025', notes: 'Contrôle annuel, RAS' },
    ]
  },
  files: [
    { id: 'file-1', label: 'Carnet de vaccinations.pdf', url: 'https://example.com/vaccinations.pdf' },
  ]
};

// --- MAIN COMPONENT ---
export default function ChildMedicalRecord({ 
  childName, 
  initialRecord, 
  onConfirm, 
  saving 
}: { 
  childName?: string; 
  initialRecord?: ChildMedicalRecordData; 
  onConfirm?: (record: ChildMedicalRecordData) => Promise<void> | void; 
  saving?: boolean 
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  
  const [editMode, setEditMode] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>('general');
  const [, forceUpdate] = useState({});

  // Force update when color scheme changes
  useEffect(() => {
    forceUpdate({});
  }, [colorScheme]);
  
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Mettre à jour le nom dans le record quand childName change
  useEffect(() => {
    if (childName && childName !== record.general.fullName) {
      setRecord(prev => ({
        ...prev,
        general: {
          ...prev.general,
          fullName: childName
        }
      }));
    }
  }, [childName]);

  // Temporary Inputs
  const [newAllergyName, setNewAllergyName] = useState('');

  const toggleSection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSectionId(prev => (prev === id ? null : id));
  };

  const handleSave = async () => {
    if (onConfirm) {
      await onConfirm(record);
    }
    setEditMode(false);
  };

  // --- HELPER FUNCTIONS ---
  const updateGeneral = (key: keyof GeneralInfo, val: string) => 
    setRecord(p => ({ ...p, general: { ...p.general, [key]: val } }));
  
  const updatePhysician = (key: keyof MedicalContact, val: string) => 
    setRecord(p => ({ ...p, contacts: { ...p.contacts, primaryPhysician: { ...p.contacts.primaryPhysician, [key]: val } } }));

  const updateSpecialist = (key: keyof MedicalContact, val: string) => 
    setRecord(p => ({ ...p, contacts: { ...p.contacts, specialist: { ...(p.contacts.specialist || {name:'', phone:''}), [key]: val } } }));

  const addAllergy = () => {
    if(!newAllergyName.trim()) return;
    setRecord(p => ({...p, history: {...p.history, allergies: [...p.history.allergies, {name: newAllergyName, severity: 'Faible'}]}}));
    setNewAllergyName('');
  };

  const sanitizeFileName = (name: string) => name.replace(/[^a-z0-9._-]/gi, '_');

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      
      setUploadingFile(true);
      // Simulation d'upload pour l'exemple (à remplacer par la logique Firebase réelle si configurée)
      setTimeout(() => {
         const asset = result.assets[0];
         const path = `local/${asset.name}`;
         setRecord(p => ({ ...p, files: [...p.files, { id: path, label: asset.name, url: asset.uri }] }));
         setUploadingFile(false);
         Alert.alert('Succès', 'Document ajouté (Simulation)');
      }, 1000);
      
    } catch(e) {
      Alert.alert('Erreur', "Échec de l'envoi");
      setUploadingFile(false);
    }
  };

  const handleDownloadFile = async (file: MedicalFile) => {
     if (!file.url) return;
     Alert.alert("Ouverture", `Ouverture de ${file.label}...`);
  };

  // --- RENDER HELPERS ---
  const renderHeader = (title: string, icon: string, sectionKey: string) => (
    <TouchableOpacity 
      style={[styles.sectionHeader, { borderBottomColor: expandedSectionId === sectionKey ? colors.border : 'transparent', borderBottomWidth: 1 }]} 
      onPress={() => toggleSection(sectionKey)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
          <IconSymbol name={icon as any} size={24} color={colors.tint} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <IconSymbol 
        name={expandedSectionId === sectionKey ? 'chevron.up' : 'chevron.down'} 
        size={20} 
        color={colors.textSecondary} 
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="always"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: styles.scrollContent.paddingTop || 0,
              paddingBottom: (styles.scrollContent.paddingBottom || 0) + insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          
          {/* EN-TÊTE PROFIL */}
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarText}>
                {record.general.fullName ? record.general.fullName.substring(0,2).toUpperCase() : 'EF'}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {record.general.fullName || 'Nouvelle fiche'}
              </Text>
              <Text style={[styles.profileSub, { color: colors.textSecondary }]}>
                {record.general.dateOfBirth}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: editMode ? colors.secondaryCardBackground : colors.tint }]}
              onPress={() => editMode ? handleSave() : setEditMode(true)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <IconSymbol name={editMode ? "checkmark" : "pencil"} size={22} color={editMode ? colors.tint : "#fff"} />
              )}
            </TouchableOpacity>
          </View>

          {/* 1. SIGNES VITAUX (GRANDS ENCADRÉS) */}
          <View style={[styles.cardContainer, { backgroundColor: colors.cardBackground }]}>
            {renderHeader("Signes Vitaux", "heart.fill", "general")}
            {expandedSectionId === "general" && (
              <View style={styles.cardBody}>
                <View style={styles.vitalGrid}>
                  <VitalCard 
                    label="Taille" 
                    value={record.general.heightCm} 
                    unit="cm" 
                    color={colors.tint} 
                    isEdit={editMode} 
                    onChange={(t: string) => updateGeneral('heightCm', t)} 
                    colors={colors}
                  />
                  <VitalCard 
                    label="Poids" 
                    value={record.general.weightKg} 
                    unit="kg" 
                    color="#E67E22" 
                    isEdit={editMode} 
                    onChange={(t: string) => updateGeneral('weightKg', t)} 
                    colors={colors}
                  />
                </View>
                <View style={[styles.vitalGrid, { marginTop: 12 }]}>
                  <VitalCard 
                    label="Sang" 
                    value={record.general.bloodType} 
                    unit="" 
                    color="#E74C3C" 
                    isEdit={editMode} 
                    onChange={(t: string) => updateGeneral('bloodType', t)} 
                    colors={colors}
                  />
                  <VitalCard 
                    label="Pointure" 
                    value={record.general.shoeSize} 
                    unit="" 
                    color="#9B59B6" 
                    isEdit={editMode} 
                    onChange={(t: string) => updateGeneral('shoeSize', t)} 
                    colors={colors}
                  />
                </View>
                
                <View style={[styles.separator, { backgroundColor: colors.border }]} />

                <InputItemBig 
                  label="Numéro National" 
                  value={record.general.nationalRegistryId} 
                  isEdit={editMode} 
                  onChange={(t: string) => updateGeneral('nationalRegistryId', t)} 
                  colors={colors} 
                />
                
                <View style={{ marginTop: 16 }}>
                   <InputItemBig 
                     label="Taille Vêtement" 
                     value={record.general.clothingSize} 
                     isEdit={editMode} 
                     onChange={(t: string) => updateGeneral('clothingSize', t)} 
                     colors={colors} 
                   />
                </View>
              </View>
            )}
          </View>

          {/* 2. CONTACTS MEDICAUX */}
          <View style={[styles.cardContainer, { backgroundColor: colors.cardBackground }]}>
            {renderHeader("Contacts", "phone.fill", "contacts")}
            {expandedSectionId === "contacts" && (
              <View style={styles.cardBody}>
                 <ContactCard 
                    title="Médecin Traitant" 
                    data={record.contacts.primaryPhysician} 
                    isEdit={editMode} 
                    onChange={updatePhysician} 
                    colors={colors} 
                 />
                 <View style={[styles.separator, { backgroundColor: colors.border }]} />
                 <ContactCard 
                    title="Spécialiste" 
                    data={record.contacts.specialist} 
                    isEdit={editMode} 
                    onChange={updateSpecialist} 
                    colors={colors} 
                    placeholder="Ajouter spécialiste"
                 />
                 <View style={[styles.separator, { backgroundColor: colors.border }]} />
                 <View>
                    <Text style={[styles.contactRole, {color: colors.tint}]}>Hôpital de référence</Text>
                    {editMode ? (
                       <TextInput 
                          style={[styles.inputLarge, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]} 
                          value={record.contacts.referenceHospital} 
                          onChangeText={t => setRecord(p => ({...p, contacts: {...p.contacts, referenceHospital: t}}))}
                        />
                    ) : (
                       <Text style={[styles.contactName, {color: colors.text}]}>{record.contacts.referenceHospital || 'Non renseigné'}</Text>
                    )}
                 </View>
              </View>
            )}
          </View>

          {/* 3. ALLERGIES & ANTECEDENTS */}
          <View style={[styles.cardContainer, { backgroundColor: colors.cardBackground }]}>
            {renderHeader("Santé & Allergies", "exclamationmark.triangle.fill", "history")}
            {expandedSectionId === "history" && (
              <View style={styles.cardBody}>
                <Text style={[styles.subSectionTitle, {color: colors.textSecondary}]}>Allergies connues</Text>
                
                <View style={styles.chipContainer}>
                  {record.history.allergies.map((a, i) => (
                     <View key={i} style={[styles.chip, { backgroundColor: getSeverityColor(a.severity) + '15', borderColor: getSeverityColor(a.severity) }]}>
                        <Text style={[styles.chipText, { color: getSeverityColor(a.severity) }]}>{a.name}</Text>
                        {editMode && (
                          <TouchableOpacity 
                            style={{ padding: 4 }}
                            onPress={() => {
                              const newArr = [...record.history.allergies];
                              newArr.splice(i, 1);
                              setRecord(p => ({...p, history: {...p.history, allergies: newArr}}));
                          }}>
                             <IconSymbol name="xmark.circle.fill" size={18} color={getSeverityColor(a.severity)} />
                          </TouchableOpacity>
                        )}
                     </View>
                  ))}
                  {record.history.allergies.length === 0 && !editMode && (
                     <Text style={[styles.emptyText, {color: colors.textSecondary}]}>Aucune allergie signalée.</Text>
                  )}
                </View>

                {editMode && (
                  <View style={styles.addInlineRow}>
                     <TextInput 
                        style={[styles.inputLarge, {color: colors.text, borderColor: colors.border, flex: 1, backgroundColor: colors.background}]} 
                        placeholder="Ajouter une allergie..."
                        placeholderTextColor={colors.textSecondary}
                        value={newAllergyName}
                        onChangeText={setNewAllergyName}
                     />
                     <TouchableOpacity onPress={addAllergy} style={[styles.addButtonSquare, {backgroundColor: colors.tint}]}>
                        <IconSymbol name="plus" size={24} color="#fff" />
                     </TouchableOpacity>
                  </View>
                )}

                <View style={[styles.separator, { backgroundColor: colors.border }]} />

                <Text style={[styles.subSectionTitle, {color: colors.textSecondary}]}>Conditions & Maladies</Text>
                 {record.history.diseases.length > 0 ? (
                    record.history.diseases.map((d, i) => (
                      <View key={i} style={styles.bulletRow}>
                         <IconSymbol name="circle.fill" size={8} color={colors.textSecondary} />
                         <Text style={[styles.bulletText, {color: colors.text}]}>{d}</Text>
                      </View>
                    ))
                 ) : (
                   <Text style={[styles.emptyText, {color: colors.textSecondary}]}>Aucune condition chronique.</Text>
                 )}
              </View>
            )}
          </View>

          {/* 4. TRAITEMENTS COURANTS */}
          <View style={[styles.cardContainer, { backgroundColor: colors.cardBackground }]}>
             {renderHeader("Traitements en cours", "pills.fill", "current")}
             {expandedSectionId === "current" && (
                <View style={styles.cardBody}>
                   {record.currentTracking.treatments.map((t, i) => (
                      <View key={i} style={[styles.treatmentCard, {backgroundColor: colors.secondaryCardBackground}]}>
                         {editMode ? (
                            <View style={{gap: 12}}>
                               <View>
                                  <Text style={[styles.labelSmall, {color: colors.textSecondary}]}>Médicament</Text>
                                  <TextInput style={[styles.inputLarge, {backgroundColor: colors.background, color: colors.text, borderColor: colors.border}]} value={t.medicineName} onChangeText={v => {
                                    const arr = [...record.currentTracking.treatments]; arr[i].medicineName = v;
                                    setRecord(p => ({...p, currentTracking: {...p.currentTracking, treatments: arr}}));
                                 }} />
                               </View>
                               <View style={{flexDirection: 'row', gap: 10}}>
                                  <View style={{flex: 1}}>
                                     <Text style={[styles.labelSmall, {color: colors.textSecondary}]}>Dosage</Text>
                                     <TextInput style={[styles.inputLarge, {backgroundColor: colors.background, color: colors.text, borderColor: colors.border}]} value={t.dosage} onChangeText={v => {
                                        const arr = [...record.currentTracking.treatments]; arr[i].dosage = v;
                                        setRecord(p => ({...p, currentTracking: {...p.currentTracking, treatments: arr}}));
                                     }} />
                                  </View>
                                  <TouchableOpacity onPress={() => {
                                     const arr = [...record.currentTracking.treatments]; arr.splice(i, 1);
                                     setRecord(p => ({...p, currentTracking: {...p.currentTracking, treatments: arr}}));
                                  }} style={{justifyContent: 'flex-end', paddingBottom: 10}}>
                                     <IconSymbol name="trash.fill" size={24} color="#FF6B6B" />
                                  </TouchableOpacity>
                               </View>
                            </View>
                         ) : (
                            <>
                              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                <Text style={[styles.treatmentName, {color: colors.text}]}>{t.medicineName}</Text>
                                <IconSymbol name="info.circle" size={20} color={colors.tint} />
                              </View>
                              <Text style={[styles.treatmentDetail, {color: colors.textSecondary}]}>{t.dosage}</Text>
                              <Text style={[styles.treatmentDuration, {color: colors.text}]}>Durée: {t.duration}</Text>
                            </>
                         )}
                      </View>
                   ))}
                   {editMode && (
                      <TouchableOpacity 
                         style={[styles.bigActionButton, {borderColor: colors.tint, borderStyle: 'dashed', borderWidth: 2, backgroundColor: 'transparent'}]}
                         onPress={() => setRecord(p => ({...p, currentTracking: {...p.currentTracking, treatments: [...p.currentTracking.treatments, {medicineName: 'Nouveau', dosage: '', duration: ''}]}}))}
                      >
                         <Text style={{color: colors.tint, fontSize: 16, fontWeight: '600'}}>+ Ajouter un traitement</Text>
                      </TouchableOpacity>
                   )}
                   {record.currentTracking.treatments.length === 0 && !editMode && (
                      <Text style={[styles.emptyText, {color: colors.textSecondary}]}>Aucun traitement en cours.</Text>
                   )}
                </View>
             )}
          </View>

          {/* 5. DOCUMENTS */}
          <View style={[styles.cardContainer, { backgroundColor: colors.cardBackground, marginBottom: 40 }]}>
             {renderHeader("Documents", "doc.text.fill", "files")}
             {expandedSectionId === "files" && (
                <View style={styles.cardBody}>
                   {record.files.map((f, i) => (
                      <TouchableOpacity key={i} style={[styles.fileRow, {borderBottomColor: colors.border}]} onPress={() => handleDownloadFile(f)}>
                         <View style={[styles.iconBox, {backgroundColor: colors.secondaryCardBackground}]}>
                            <IconSymbol name="doc.fill" size={24} color={colors.tint} />
                         </View>
                         <View style={{flex: 1}}>
                            <Text style={[styles.fileName, {color: colors.text}]} numberOfLines={1}>{f.label}</Text>
                            <Text style={{fontSize: 12, color: colors.textSecondary}}>PDF • 1.2 MB</Text>
                         </View>
                         {downloadingFileId === f.id ? (
                            <ActivityIndicator size="small" color={colors.tint} />
                         ) : (
                            <IconSymbol name="arrow.down.circle.fill" size={28} color={colors.tint} />
                         )}
                      </TouchableOpacity>
                   ))}
                   {editMode && (
                      <TouchableOpacity 
                         style={[styles.bigActionButton, {backgroundColor: colors.tint}]}
                         onPress={handlePickFile}
                         disabled={uploadingFile}
                      >
                         {uploadingFile ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>Importer un document</Text>}
                      </TouchableOpacity>
                   )}
                   {record.files.length === 0 && !editMode && (
                      <Text style={[styles.emptyText, {color: colors.textSecondary}]}>Aucun document joint.</Text>
                   )}
                </View>
             )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- SOUS-COMPOSANTS ---

const VitalCard = ({ label, value, unit, color, isEdit, onChange, colors }: any) => (
  <View style={[styles.vitalCard, { backgroundColor: isEdit ? 'transparent' : color + '10', borderColor: isEdit ? colors.border : color, borderWidth: isEdit ? 0 : 2 }]}>
    <Text style={[styles.vitalLabel, { color: colors.textSecondary }]}>{label}</Text>
    {isEdit ? (
       <TextInput 
         style={[styles.vitalInputEdit, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]} 
         value={value} 
         onChangeText={onChange} 
         keyboardType="default"
       />
    ) : (
       <Text style={[styles.vitalValue, { color: color }]}>
         {value} <Text style={{ fontSize: 16, fontWeight: '500' }}>{unit}</Text>
       </Text>
    )}
  </View>
);

const InputItemBig = ({label, value, isEdit, onChange, colors}: any) => (
   <View>
      <Text style={[styles.label, {color: colors.textSecondary}]}>{label}</Text>
      {isEdit ? (
         <TextInput style={[styles.inputLarge, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]} value={value} onChangeText={onChange} />
      ) : (
         <Text style={[styles.valueTextBig, {color: colors.text}]}>{value}</Text>
      )}
   </View>
);

const ContactCard = ({title, data, isEdit, onChange, colors, placeholder}: any) => {
   if (!data && !isEdit) return null;
   return (
     <View style={styles.contactContainer}>
        <Text style={[styles.contactRole, {color: colors.tint}]}>{title}</Text>
        {isEdit ? (
           <View style={{gap: 12, marginTop: 8}}>
              <TextInput placeholder="Nom complet" placeholderTextColor={colors.textSecondary} style={[styles.inputLarge, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]} value={data?.name} onChangeText={t => onChange('name', t)} />
              <TextInput placeholder="Téléphone" placeholderTextColor={colors.textSecondary} style={[styles.inputLarge, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]} value={data?.phone} onChangeText={t => onChange('phone', t)} />
           </View>
        ) : (
           <View>
              <Text style={[styles.contactName, {color: colors.text}]}>{data?.name || placeholder || 'Non renseigné'}</Text>
              {data?.phone && <Text style={[styles.contactDetail, {color: colors.textSecondary}]}>{data.phone}</Text>}
              {data?.address && <Text style={[styles.contactDetail, {color: colors.textSecondary}]}>{data.address}</Text>}
           </View>
        )}
     </View>
   );
}

const getSeverityColor = (s: SeverityLevel) => {
   switch(s) {
      case 'Sévère': return '#E74C3C';
      case 'Modérée': return '#E67E22';
      default: return '#27AE60';
   }
}

// --- STYLES XL ---
const styles = StyleSheet.create({
  // Utilisation de SafeAreaView en amont, mais padding au cas où
  scrollContent: { paddingHorizontal: 0, paddingBottom: 80, paddingTop: 10 },
  
  // Header
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  profileName: { fontSize: 22, fontWeight: '800' },
  profileSub: { fontSize: 16, marginTop: 4 },
  editButton: { marginLeft: 'auto', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, elevation: 2 },

  // Containers
  cardContainer: { borderRadius: 20, marginBottom: 16, overflow: 'hidden', shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { padding: 8, borderRadius: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '700' }, // Texte agrandi
  cardBody: { paddingHorizontal: 28, paddingBottom: 16, paddingTop: 6 },

  // Vitals
  vitalGrid: { flexDirection: 'row', gap: 12 },
  vitalCard: { flex: 1, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  vitalLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  vitalValue: { fontSize: 26, fontWeight: '800' }, // Texte très grand
  vitalInputEdit: { fontSize: 20, fontWeight: '700', textAlign: 'center', width: '100%', paddingVertical: 8, borderWidth: 1, borderRadius: 10 },

  // Inputs & Labels
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  labelSmall: { fontSize: 13, fontWeight: '600' },
  valueTextBig: { fontSize: 18, fontWeight: '600' },
  inputLarge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 }, // Zones de touche agrandies

  // Separators
  separator: { height: 1, marginVertical: 20, opacity: 0.6 },

  // Contacts
  contactContainer: { paddingVertical: 5 },
  contactRole: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  contactName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  contactDetail: { fontSize: 16, marginTop: 2, lineHeight: 22 },

  // Chips & Lists
  subSectionTitle: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipText: { fontSize: 15, fontWeight: '700' },
  
  addInlineRow: { flexDirection: 'row', gap: 10, marginTop: 5, alignItems: 'center' },
  addButtonSquare: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  bulletText: { fontSize: 17, fontWeight: '500' },

  // Treatments
  treatmentCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  treatmentName: { fontSize: 18, fontWeight: '700' },
  treatmentDetail: { fontSize: 16, marginTop: 4, fontWeight: '500' },
  treatmentDuration: { fontSize: 14, marginTop: 6, fontStyle: 'italic', opacity: 0.8 },
  bigActionButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, justifyContent: 'center' },

  // Files
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16, borderBottomWidth: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  fileName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  emptyText: { fontStyle: 'italic', fontSize: 15, marginTop: 8, opacity: 0.7 }
});
