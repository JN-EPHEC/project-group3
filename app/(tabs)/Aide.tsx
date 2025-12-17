import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SAFE_BOTTOM_SPACING, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Linking, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

// Type definitions
type ProfessionalType = 'avocat' | 'psychologue';

interface Professional {
  id: string;
  name: string;
  type: ProfessionalType;
  location: string;
  specialty: string;
  phone: string;
  email: string;
  description: string;
  availability: {
    lundi: string;
    mardi: string;
    mercredi: string;
    jeudi: string;
    vendredi: string;
    samedi: string;
    dimanche: string;
  };
}

// Mock data for professionals
const PROFESSIONALS: Professional[] = [
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
              Disponibilités
            </Text>
            <View style={{ backgroundColor: colors.border, borderRadius: BORDER_RADIUS.medium, padding: SPACING.large, gap: V_SPACING.small }}>
              {Object.entries(professional.availability).map(([day, hours]) => (
                <View key={day} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZES.medium, fontWeight: '500' }}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: FONT_SIZES.medium, fontWeight: '400' }}>
                    {hours}
                  </Text>
                </View>
              ))}
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

  const filteredProfessionals = selectedCategory
    ? PROFESSIONALS.filter(p => p.type === selectedCategory)
    : [];

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

      // Create conversation
      const conversationRef = await addDoc(collection(db, 'conversations'), {
        participants: [user.uid],
        professionalId: professional.id,
        professionalName: professional.name,
        professionalType: professional.type,
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageTime: null
      });

      // Navigate to message
      router.push(`/(tabs)/Message?conversationId=${conversationRef.id}&professionalName=${professional.name}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Erreur lors de la création de la conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (professional: Professional) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Veuillez vous connecter');
        return;
      }

      // Create appointment booking
      await addDoc(collection(db, 'appointments'), {
        userId: user.uid,
        professionalId: professional.id,
        professionalName: professional.name,
        professionalType: professional.type,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      alert(`Demande de rendez-vous envoyée à ${professional.name}`);
      setExpandedProfessionalId(null);
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Erreur lors de la demande de rendez-vous');
    } finally {
      setLoading(false);
    }
  };

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
    </SafeAreaView>
  );
}
