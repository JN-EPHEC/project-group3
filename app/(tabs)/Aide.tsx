import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

// Type definitions
type ProfessionalType = 'avocat' | 'psychologue';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface DayAvailability {
  isOpen: boolean;
  slots: TimeSlot[];
}

interface AvailabilitySchedule {
  lundi: DayAvailability | string;
  mardi: DayAvailability | string;
  mercredi: DayAvailability | string;
  jeudi: DayAvailability | string;
  vendredi: DayAvailability | string;
  samedi: DayAvailability | string;
  dimanche: DayAvailability | string;
}

interface Professional {
  id: string;
  name: string;
  type: ProfessionalType;
  location: string;
  specialty: string;
  phone: string;
  email: string;
  description: string;
  availability: AvailabilitySchedule;
}

// Helper function to load professionals from Firebase
async function loadProfessionalsFromFirebase(): Promise<Professional[]> {
  try {
    const professionalsSnapshot = await getDocs(collection(db, 'professionals'));
    const professionals: Professional[] = [];
    
    professionalsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Only include professionals with a defined type
      if (data.type && (data.type === 'avocat' || data.type === 'psychologue')) {
        professionals.push({
          id: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Professionnel',
          type: data.type,
          location: data.address || 'Non renseignée',
          specialty: data.specialty || 'Non spécifiée',
          phone: data.phone || 'Non renseigné',
          email: data.email || '',
          description: data.description || 'Aucune description disponible',
          availability: data.availability || {
            lundi: '9h - 18h',
            mardi: '9h - 18h',
            mercredi: '9h - 18h',
            jeudi: '9h - 18h',
            vendredi: '9h - 18h',
            samedi: 'Fermé',
            dimanche: 'Fermé'
          }
        });
      }
    });
    
    return professionals;
  } catch (error) {
    console.error('Error loading professionals:', error);
    return [];
  }
}

// Mock data for professionals (fallback if Firebase is empty)
const MOCK_PROFESSIONALS: Professional[] = [
  {
    id: '1',
    name: 'Me. Marie Dubois',
    type: 'avocat',
    location: 'Paris, 75008',
    specialty: 'Droit de la Famille',
    phone: '+33 1 23 45 67 89',
    email: 'marie.dubois@cabinet.fr',
    description: 'Spécialisée en droit de la famille avec 15 ans d\'expérience. Je vous accompagne dans tous vos démarches.',
    availability: {
      lundi: '9h - 18h',
      mardi: '9h - 18h',
      mercredi: '9h - 17h',
      jeudi: '9h - 18h',
      vendredi: '9h - 17h',
      samedi: 'Sur rendez-vous',
      dimanche: 'Fermé'
    }
  },
  {
    id: '2',
    name: 'Me. Pierre Lefebvre',
    type: 'avocat',
    location: 'Lyon, 69003',
    specialty: 'Médiation Familiale',
    phone: '+33 4 72 98 76 54',
    email: 'pierre.lefebvre@cabinet.fr',
    description: 'Médiateur familial diplômé. Je facilite la communication entre parents.',
    availability: {
      lundi: '8h - 17h',
      mardi: '8h - 17h',
      mercredi: '8h - 17h',
      jeudi: '8h - 19h',
      vendredi: '8h - 17h',
      samedi: 'Fermé',
      dimanche: 'Fermé'
    }
  },
  {
    id: '3',
    name: 'Me. Isabelle Rousseau',
    type: 'avocat',
    location: 'Marseille, 13001',
    specialty: 'Droit de la Garde',
    phone: '+33 4 91 55 44 33',
    email: 'isabelle.rousseau@cabinet.fr',
    description: 'Experte en questions de garde et de pension alimentaire.',
    availability: {
      lundi: '9h - 19h',
      mardi: '9h - 19h',
      mercredi: '9h - 18h',
      jeudi: '9h - 19h',
      vendredi: '9h - 18h',
      samedi: 'Sur rendez-vous',
      dimanche: 'Fermé'
    }
  },
  {
    id: '4',
    name: 'Dr. Sophie Moreau',
    type: 'psychologue',
    location: 'Paris, 75010',
    specialty: 'Psychologie Familiale',
    phone: '+33 1 98 76 54 32',
    email: 'sophie.moreau@psycare.fr',
    description: 'Psychologue clinicienne spécialisée en thérapie familiale.',
    availability: {
      lundi: '10h - 20h',
      mardi: '10h - 20h',
      mercredi: '14h - 20h',
      jeudi: '10h - 20h',
      vendredi: '10h - 19h',
      samedi: '10h - 17h',
      dimanche: 'Fermé'
    }
  },
  {
    id: '5',
    name: 'Dr. Thomas Leclerc',
    type: 'psychologue',
    location: 'Bordeaux, 33000',
    specialty: 'Thérapie Enfants et Ados',
    phone: '+33 5 56 12 34 56',
    email: 'thomas.leclerc@psycare.fr',
    description: 'Spécialiste de l\'accompagnement des enfants et adolescents.',
    availability: {
      lundi: '9h - 18h',
      mardi: '9h - 18h',
      mercredi: '9h - 18h',
      jeudi: '9h - 20h',
      vendredi: '9h - 18h',
      samedi: 'Sur rendez-vous',
      dimanche: 'Fermé'
    }
  },
  {
    id: '6',
    name: 'Dr. Véronique Gibert',
    type: 'psychologue',
    location: 'Toulouse, 31000',
    specialty: 'Médiation Parent-Enfant',
    phone: '+33 5 61 23 45 67',
    email: 'veronique.gibert@psycare.fr',
    description: 'Experte en médiation et en amélioration de la relation parent-enfant.',
    availability: {
      lundi: '9h - 19h',
      mardi: '9h - 19h',
      mercredi: '10h - 19h',
      jeudi: '9h - 19h',
      vendredi: '9h - 18h',
      samedi: '10h - 14h',
      dimanche: 'Fermé'
    }
  }
];

// Professional Card Component with expandable view
interface ProfessionalCardProps {
  professional: Professional;
  colors: typeof Colors.light | typeof Colors.dark;
  expanded: boolean;
  onPress: () => void;
  onContact: (professional: Professional) => void;
  onBooking: (professional: Professional) => void;
}

function ProfessionalCard({
  professional,
  colors,
  expanded,
  onPress,
  onContact,
  onBooking
}: ProfessionalCardProps) {
  if (expanded) {
    return (
      <View
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: BORDER_RADIUS.large,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: V_SPACING.large,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <TouchableOpacity
          onPress={onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: SPACING.large,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
          }}
        >
          <View
            style={{
              width: hs(50),
              height: hs(50),
              borderRadius: BORDER_RADIUS.medium,
              backgroundColor: colors.border,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: SPACING.large
            }}
          >
            <IconSymbol
              name={professional.type === 'avocat' ? 'doc.text' : 'person.fill'}
              size={hs(24)}
              color={colors.tint}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: FONT_SIZES.large, fontWeight: '600' }}>
              {professional.name}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: FONT_SIZES.small,
                fontWeight: '400',
                marginTop: vs(2)
              }}
            >
              {professional.specialty}
            </Text>
          </View>
          <IconSymbol name="chevron.up" size={hs(20)} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Content */}
        <View style={{ padding: SPACING.large, gap: V_SPACING.medium }}>
          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.large }}>
            <IconSymbol name="mappin" size={hs(18)} color={colors.tint} />
            <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '500', flex: 1 }}>
              {professional.location}
            </Text>
          </View>

          {/* Contact Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.large }}>
            <IconSymbol name="phone.fill" size={hs(18)} color={colors.tint} />
            <Text
              style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '400', flex: 1 }}
              onPress={() => Linking.openURL(`tel:${professional.phone}`)}
            >
              {professional.phone}
            </Text>
          </View>

          {/* Email */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.large }}>
            <IconSymbol name="envelope.fill" size={hs(18)} color={colors.tint} />
            <Text
              style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '400', flex: 1 }}
              onPress={() => Linking.openURL(`mailto:${professional.email}`)}
            >
              {professional.email}
            </Text>
          </View>

          {/* Description */}
          <View style={{ backgroundColor: colors.border, borderRadius: BORDER_RADIUS.medium, padding: SPACING.large }}>
            <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '400', lineHeight: vs(20) }}>
              {professional.description}
            </Text>
          </View>

          {/* Availability */}
          <View>
            <Text style={{ color: colors.text, fontSize: FONT_SIZES.large, fontWeight: '600', marginBottom: vs(8) }}>
              Créneaux disponibles
            </Text>
            <View style={{ backgroundColor: colors.border, borderRadius: BORDER_RADIUS.medium, padding: SPACING.large }}>
              {Object.entries(professional.availability).map(([day, dayData]) => {
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                
                // Handle both old format (string) and new format (object)
                if (typeof dayData === 'string') {
                  return (
                    <View key={day} style={{ marginBottom: vs(12) }}>
                      <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '600', marginBottom: vs(4) }}>
                        {dayName}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.small }}>
                        {dayData}
                      </Text>
                    </View>
                  );
                }
                
                // New format with time slots
                const availableSlots = dayData.isOpen 
                  ? dayData.slots.filter((slot: TimeSlot) => slot.available)
                  : [];
                
                return (
                  <View key={day} style={{ marginBottom: vs(12) }}>
                    <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '600', marginBottom: vs(4) }}>
                      {dayName}
                    </Text>
                    {!dayData.isOpen ? (
                      <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.small, fontStyle: 'italic' }}>
                        Fermé
                      </Text>
                    ) : availableSlots.length === 0 ? (
                      <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.small, fontStyle: 'italic' }}>
                        Aucun créneau disponible
                      </Text>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: hs(6) }}>
                        {availableSlots.map((slot: TimeSlot, idx: number) => (
                          <View 
                            key={idx} 
                            style={{ 
                              backgroundColor: colors.tint + '30', 
                              paddingHorizontal: hs(10), 
                              paddingVertical: vs(4), 
                              borderRadius: BORDER_RADIUS.small,
                              borderWidth: 1,
                              borderColor: colors.tint
                            }}
                          >
                            <Text style={{ color: colors.tint, fontSize: FONT_SIZES.tiny, fontWeight: '600' }}>
                              {slot.start} - {slot.end}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: SPACING.large, marginTop: V_SPACING.medium }}>
            <TouchableOpacity
              onPress={() => onContact(professional)}
              style={{
                flex: 1,
                borderRadius: BORDER_RADIUS.medium,
                paddingVertical: vs(12),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.tint
              }}
            >
              <Text style={{ color: colors.background, fontSize: FONT_SIZES.medium, fontWeight: '600' }}>
                Contacter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onBooking(professional)}
              style={{
                flex: 1,
                borderRadius: BORDER_RADIUS.medium,
                paddingVertical: vs(12),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#8ECAE6'
              }}
            >
              <Text style={{ color: '#151718', fontSize: FONT_SIZES.medium, fontWeight: '600' }}>
                Rendez-vous
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Collapsed view
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.large,
        paddingVertical: vs(14),
        borderRadius: BORDER_RADIUS.large,
        borderWidth: 1,
        backgroundColor: colors.cardBackground,
        borderColor: colors.border,
        gap: SPACING.large,
        marginBottom: V_SPACING.medium
      }}
    >
      <View
        style={{
          width: hs(40),
          height: hs(40),
          borderRadius: BORDER_RADIUS.medium,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.border
        }}
      >
        <IconSymbol
          name={professional.type === 'avocat' ? 'doc.text' : 'person.fill'}
          size={hs(20)}
          color={colors.tint}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '600' }}>
          {professional.name}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: FONT_SIZES.small,
            fontWeight: '400',
            marginTop: vs(2)
          }}
        >
          {professional.specialty}
        </Text>
      </View>
      <IconSymbol name="chevron.right" size={hs(16)} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// Main Aide Screen Component
export default function AideScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [screen, setScreen] = useState<'category' | 'list' | 'detail'>('category');
  const [selectedCategory, setSelectedCategory] = useState<'avocat' | 'psychologue' | null>(null);
  const [expandedProfessionalId, setExpandedProfessionalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  
  // Booking modal state
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [selectedProfessionalForBooking, setSelectedProfessionalForBooking] = useState<Professional | null>(null);
  const [selectedDayForBooking, setSelectedDayForBooking] = useState<keyof AvailabilitySchedule | null>(null);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<TimeSlot | null>(null);
  const [selectedDateForBooking, setSelectedDateForBooking] = useState<Date | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);

  // Load professionals from Firebase on mount
  useEffect(() => {
    const loadProfessionals = async () => {
      setLoadingProfessionals(true);
      const profs = await loadProfessionalsFromFirebase();
      // If no professionals in Firebase, use mock data
      setProfessionals(profs.length > 0 ? profs : MOCK_PROFESSIONALS);
      setLoadingProfessionals(false);
    };
    loadProfessionals();
  }, []);

  const filteredProfessionals = selectedCategory
    ? professionals.filter(p => p.type === selectedCategory)
    : [];

  // Charger les créneaux réservés quand un professionnel ou une date est sélectionné
  useEffect(() => {
    const loadBookedSlots = async () => {
      if (!selectedProfessionalForBooking || !selectedDateForBooking) {
        setBookedSlots([]);
        return;
      }

      try {
        const bookedSlotsQuery = query(
          collection(db, 'bookedSlots'),
          where('professionalId', '==', selectedProfessionalForBooking.id)
        );
        
        const snapshot = await getDocs(bookedSlotsQuery);
        const slots = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setBookedSlots(slots);
      } catch (error) {
        console.error('Error loading booked slots:', error);
        setBookedSlots([]);
      }
    };

    loadBookedSlots();
  }, [selectedProfessionalForBooking, selectedDateForBooking]);

  const handleSelectCategory = (category: 'avocat' | 'psychologue') => {
    setSelectedCategory(category);
    setScreen('list');
    setExpandedProfessionalId(null);
  };

  const handleBackToCategories = () => {
    setScreen('category');
    setSelectedCategory(null);
    setExpandedProfessionalId(null);
  };

  const handleExpandProfessional = (professionalId: string) => {
    setExpandedProfessionalId(expandedProfessionalId === professionalId ? null : professionalId);
  };

  const handleContact = async (professional: Professional) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Veuillez vous connecter');
        return;
      }

      // Vérifier si une conversation existe déjà entre ce parent et ce professionnel
      const existingConvQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid),
        where('professionalId', '==', professional.id)
      );
      
      const existingConvSnapshot = await getDocs(existingConvQuery);
      
      let conversationId;
      
      if (!existingConvSnapshot.empty) {
        // Conversation existante trouvée
        conversationId = existingConvSnapshot.docs[0].id;
      } else {
        // Créer une nouvelle conversation (propre à ce parent uniquement)
        const conversationRef = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, professional.id],
          professionalId: professional.id,
          professionalName: professional.name,
          professionalType: professional.type,
          createdAt: serverTimestamp(),
          lastMessage: null,
          lastMessageTime: serverTimestamp()
        });
        conversationId = conversationRef.id;
      }

      // Naviguer vers la conversation
      router.push({
        pathname: '/conversation',
        params: {
          conversationId: conversationId,
          otherUserId: professional.id,
          otherUserName: professional.name
        }
      });
    } catch (error) {
      console.error('Error handling conversation:', error);
      alert('Erreur lors de l\'ouverture de la conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = (professional: Professional) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erreur', 'Veuillez vous connecter');
      return;
    }

    setSelectedProfessionalForBooking(professional);
    setSelectedDayForBooking(null);
    setSelectedSlotForBooking(null);
    setSelectedDateForBooking(null);
    setIsBookingModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedProfessionalForBooking || !selectedDayForBooking || !selectedSlotForBooking || !selectedDateForBooking) {
      Alert.alert('Erreur', 'Veuillez sélectionner une date et un créneau');
      return;
    }

    setBookingLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Veuillez vous connecter');
        return;
      }

      // Create appointment document
      await addDoc(collection(db, 'appointments'), {
        userId: user.uid,
        professionalId: selectedProfessionalForBooking.id,
        professionalName: selectedProfessionalForBooking.name,
        professionalType: selectedProfessionalForBooking.type,
        selectedDay: selectedDayForBooking,
        selectedTimeSlot: selectedSlotForBooking,
        selectedDate: selectedDateForBooking,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Fermer le modal et réinitialiser les états
      setIsBookingModalVisible(false);
      setExpandedProfessionalId(null);
      setSelectedProfessionalForBooking(null);
      setSelectedDayForBooking(null);
      setSelectedSlotForBooking(null);
      setSelectedDateForBooking(null);
      
      // Afficher un message de succès
      Alert.alert('Succès', `Demande de rendez-vous envoyée à ${selectedProfessionalForBooking.name}`);
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Erreur', 'Erreur lors de la demande de rendez-vous');
    } finally {
      setBookingLoading(false);
    }
  };

  const getAvailableSlotsForDay = (availability: AvailabilitySchedule | undefined): TimeSlot[] => {
    if (!availability || !selectedDayForBooking || !selectedDateForBooking) return [];

    const dayAvailability = availability[selectedDayForBooking];
    if (typeof dayAvailability === 'string') return [];

    if (!dayAvailability.isOpen) return [];
    
    // Filtrer les créneaux disponibles et non réservés à cette date
    return dayAvailability.slots.filter(slot => {
      if (!slot.available) return false;
      
      // Vérifier si ce créneau est déjà réservé à cette date
      const isBooked = bookedSlots.some(booked => {
        const bookedDate = booked.date instanceof Date ? booked.date : booked.date.toDate();
        const selectedDate = selectedDateForBooking;
        
        // Comparer les dates (même jour)
        const sameDate = bookedDate.getFullYear() === selectedDate.getFullYear() &&
                        bookedDate.getMonth() === selectedDate.getMonth() &&
                        bookedDate.getDate() === selectedDate.getDate();
        
        // Vérifier si le créneau horaire correspond
        const sameSlot = booked.timeSlot.start === slot.start && booked.timeSlot.end === slot.end;
        
        return sameDate && sameSlot;
      });
      
      return !isBooked;
    });
  };

  // Show loading screen while professionals are being loaded
  if (loadingProfessionals) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, marginTop: SPACING.large }}>
            Chargement des professionnels...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {screen === 'category' && (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SPACING.large,
            paddingTop: V_SPACING.large,
            paddingBottom: SAFE_BOTTOM_SPACING,
            gap: V_SPACING.huge
          }}
        >
          {/* Header */}
          <View>
            <Text
              style={{
                color: colors.text,
                fontSize: FONT_SIZES.xxlarge,
                fontWeight: '700',
                letterSpacing: -0.5
              }}
            >
              Je cherche un professionnel
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: FONT_SIZES.medium,
                fontWeight: '500',
                marginTop: vs(8)
              }}
            >
              Sélectionnez le type de professionnel dont vous avez besoin
            </Text>
          </View>

          {/* Category Buttons */}
          <View style={{ flexDirection: 'row', gap: SPACING.large, justifyContent: 'space-between' }}>
            {/* Lawyers */}
            <TouchableOpacity
              onPress={() => handleSelectCategory('avocat')}
              style={{
                flex: 1,
                borderRadius: BORDER_RADIUS.large,
                borderWidth: 1,
                paddingVertical: vs(24),
                alignItems: 'center',
                gap: vs(12),
                backgroundColor: colors.cardBackground,
                borderColor: colors.border
              }}
            >
              <IconSymbol name="doc.text" size={hs(32)} color={'#8ECAE6'} />
              <Text style={{ color: colors.text, fontSize: FONT_SIZES.large, fontWeight: '600' }}>
                Avocats
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: FONT_SIZES.small,
                  fontWeight: '500'
                }}
              >
                Juridique & Droit
              </Text>
            </TouchableOpacity>

            {/* Psychologists */}
            <TouchableOpacity
              onPress={() => handleSelectCategory('psychologue')}
              style={{
                flex: 1,
                borderRadius: BORDER_RADIUS.large,
                borderWidth: 1,
                paddingVertical: vs(24),
                alignItems: 'center',
                gap: vs(12),
                backgroundColor: colors.cardBackground,
                borderColor: colors.border
              }}
            >
              <IconSymbol name="person.fill" size={hs(32)} color={'#8ECAE6'} />
              <Text style={{ color: colors.text, fontSize: FONT_SIZES.large, fontWeight: '600' }}>
                Psychologues
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: FONT_SIZES.small,
                  fontWeight: '500'
                }}
              >
                Conseil & Support
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {screen === 'list' && (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SPACING.large,
            paddingTop: V_SPACING.medium,
            paddingBottom: SAFE_BOTTOM_SPACING
          }}
        >
          {/* Header with back button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: V_SPACING.large }}>
            <TouchableOpacity onPress={handleBackToCategories} style={{ marginRight: SPACING.large }}>
              <IconSymbol name="chevron.left" size={hs(24)} color={colors.tint} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: FONT_SIZES.xxlarge, fontWeight: '700', flex: 1 }}>
              {selectedCategory === 'avocat' ? 'Avocats' : 'Psychologues'}
            </Text>
          </View>

          {/* Professionals List */}
          <View style={{ gap: V_SPACING.medium }}>
            {filteredProfessionals.map(professional => (
              <ProfessionalCard
                key={professional.id}
                professional={professional}
                colors={colors}
                expanded={expandedProfessionalId === professional.id}
                onPress={() => handleExpandProfessional(professional.id)}
                onContact={handleContact}
                onBooking={handleBookAppointment}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      )}

      {/* Booking Modal */}
      <Modal
        visible={isBookingModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsBookingModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: SPACING.large,
              paddingTop: V_SPACING.medium,
              paddingBottom: SAFE_BOTTOM_SPACING
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: V_SPACING.large }}>
              <TouchableOpacity onPress={() => setIsBookingModalVisible(false)} style={{ marginRight: SPACING.large }}>
                <IconSymbol name="xmark" size={hs(24)} color={colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: FONT_SIZES.large, fontWeight: '700' }}>
                  Demander un rendez-vous
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.small, marginTop: vs(4) }}>
                  {selectedProfessionalForBooking?.name}
                </Text>
              </View>
            </View>

            {selectedProfessionalForBooking && (
              <>
                {/* Date selector */}
                <View style={{ marginBottom: V_SPACING.large }}>
                  <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '600', marginBottom: V_SPACING.small }}>
                    Sélectionner une date
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: V_SPACING.medium }}>
                    {[...Array(14)].map((_, index) => {
                      const date = new Date();
                      date.setDate(date.getDate() + index);
                      const isSelected = selectedDateForBooking?.toDateString() === date.toDateString();
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setSelectedDateForBooking(date)}
                          style={{
                            paddingVertical: vs(12),
                            paddingHorizontal: hs(16),
                            marginRight: SPACING.medium,
                            borderRadius: BORDER_RADIUS.medium,
                            backgroundColor: isSelected ? '#FFCEB0' : colors.cardBackground,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? '#FFCEB0' : colors.border,
                            minWidth: hs(80),
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{ color: isSelected ? '#FFFFFF' : colors.textSecondary, fontSize: FONT_SIZES.tiny, fontWeight: '600' }}>
                            {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </Text>
                          <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontSize: FONT_SIZES.medium, fontWeight: '700', marginTop: vs(4) }}>
                            {date.getDate()}
                          </Text>
                          <Text style={{ color: isSelected ? '#FFFFFF' : colors.textSecondary, fontSize: FONT_SIZES.tiny, marginTop: vs(2) }}>
                            {date.toLocaleDateString('fr-FR', { month: 'short' })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Day selector tabs */}
                <View style={{ marginBottom: V_SPACING.large }}>
                  <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '600', marginBottom: V_SPACING.small }}>
                    Jour de la semaine
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: V_SPACING.medium }}>
                    {Object.entries(selectedProfessionalForBooking.availability || {}).map(([dayKey, dayData]) => {
                      const dayLabels: { [key: string]: string } = {
                        'monday': 'Lun',
                        'tuesday': 'Mar',
                        'wednesday': 'Mer',
                        'thursday': 'Jeu',
                        'friday': 'Ven',
                        'saturday': 'Sam',
                        'sunday': 'Dim'
                      };

                      const dayData_ = dayData as DayAvailability | string;
                      const isOpen = typeof dayData_ === 'object' ? dayData_.isOpen : false;
                      const isSelected = selectedDayForBooking === dayKey;

                      return (
                        <TouchableOpacity
                          key={dayKey}
                          onPress={() => {
                            if (isOpen) {
                              setSelectedDayForBooking(dayKey as keyof AvailabilitySchedule);
                              setSelectedSlotForBooking(null);
                            }
                          }}
                          disabled={!isOpen}
                          style={{
                            paddingVertical: vs(8),
                            paddingHorizontal: hs(16),
                            marginRight: SPACING.medium,
                            borderRadius: BORDER_RADIUS.medium,
                            backgroundColor: isSelected ? '#FFCEB0' : isOpen ? colors.cardBackground : colors.textTertiary,
                            opacity: isOpen ? 1 : 0.5,
                            borderWidth: isSelected ? 2 : 0,
                            borderColor: '#FFCEB0'
                          }}
                        >
                          <Text style={{ color: isSelected ? '#FFCEB0' : colors.text, fontSize: FONT_SIZES.small, fontWeight: '600' }}>
                            {dayLabels[dayKey] || dayKey}
                          </Text>
                          <Text style={{ color: isSelected ? '#FFCEB0' : colors.textSecondary, fontSize: FONT_SIZES.tiny, marginTop: vs(2) }}>
                            {isOpen ? 'Ouvert' : 'Fermé'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Available slots */}
                {selectedDayForBooking && (
                  <View style={{ marginBottom: V_SPACING.large }}>
                    <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '600', marginBottom: V_SPACING.small }}>
                      Créneaux disponibles
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {getAvailableSlotsForDay(selectedProfessionalForBooking.availability).length > 0 ? (
                        getAvailableSlotsForDay(selectedProfessionalForBooking.availability).map((slot, idx) => {
                          const isSelected = selectedSlotForBooking?.start === slot.start && selectedSlotForBooking?.end === slot.end;

                          return (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => setSelectedSlotForBooking(slot)}
                              style={{
                                paddingVertical: vs(10),
                                paddingHorizontal: hs(12),
                                marginRight: SPACING.small,
                                marginBottom: V_SPACING.small,
                                borderRadius: BORDER_RADIUS.medium,
                                backgroundColor: isSelected ? '#FFCEB0' : colors.cardBackground,
                                borderWidth: 1,
                                borderColor: isSelected ? '#FFCEB0' : colors.border
                              }}
                            >
                              <Text style={{ color: isSelected ? '#FFCEB0' : colors.text, fontSize: FONT_SIZES.small, fontWeight: '600' }}>
                                {slot.start} - {slot.end}
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.small }}>
                          Aucun créneau disponible pour ce jour
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Selected slot confirmation */}
                {selectedSlotForBooking && selectedDayForBooking && selectedDateForBooking && (
                  <View
                    style={{
                      padding: SPACING.large,
                      borderRadius: BORDER_RADIUS.medium,
                      backgroundColor: colors.cardBackground,
                      marginBottom: V_SPACING.large,
                      borderLeftWidth: 4,
                      borderLeftColor: '#FFCEB0'
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.small, marginBottom: vs(4) }}>
                      Rendez-vous prévu
                    </Text>
                    <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '600' }}>
                      {selectedProfessionalForBooking.name}
                    </Text>
                    <View style={{ marginTop: V_SPACING.small }}>
                      <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.small }}>
                        📅 {selectedDateForBooking.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.small, marginTop: vs(4) }}>
                        🕐 {selectedSlotForBooking.start} - {selectedSlotForBooking.end}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: SPACING.medium, marginBottom: V_SPACING.large }}>
                  <TouchableOpacity
                    onPress={() => setIsBookingModalVisible(false)}
                    style={{
                      flex: 1,
                      paddingVertical: vs(14),
                      borderRadius: BORDER_RADIUS.medium,
                      backgroundColor: colors.cardBackground,
                      borderWidth: 1,
                      borderColor: colors.border
                    }}
                    disabled={bookingLoading}
                  >
                    <Text style={{ color: colors.text, textAlign: 'center', fontSize: FONT_SIZES.medium, fontWeight: '600' }}>
                      Annuler
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmBooking}
                    disabled={!selectedSlotForBooking || !selectedDateForBooking || bookingLoading}
                    style={{
                      flex: 1,
                      paddingVertical: vs(14),
                      borderRadius: BORDER_RADIUS.medium,
                      backgroundColor: (selectedSlotForBooking && selectedDateForBooking) ? '#FFCEB0' : colors.textTertiary,
                      opacity: (selectedSlotForBooking && selectedDateForBooking) ? 1 : 0.5
                    }}
                  >
                    {bookingLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: FONT_SIZES.medium, fontWeight: '600' }}>
                        Confirmer
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
