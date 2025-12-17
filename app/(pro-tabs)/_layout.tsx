import { HapticTab } from '@/components/haptic-tab';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Image, Platform, useColorScheme } from 'react-native';
import { auth, db } from '../../constants/firebase';

export default function ProTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      const total = snapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.unreadCount?.[currentUser.uid] || 0);
      }, 0);
      setUnreadCount(total);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFCEB0', // Professional accent color
        tabBarInactiveTintColor: isDark ? '#666' : '#999',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 10,
          right: 10,
          marginBottom: Platform.OS === 'ios' ? 20 : 10,
          backgroundColor: 'transparent',
          borderRadius: 25,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          height: 75,
          paddingBottom: 10,
          paddingTop: 10,
          overflow: 'hidden',
        },
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 25,
              overflow: 'hidden',
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
            }}
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../ImageAndLogo/LogoWeKid.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: null,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Agenda"
        options={{
          title: 'Agenda',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={require('../../ImageAndLogo/Logoagenda.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: color,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Message"
        options={{
          title: 'Messages',
          headerShown: false,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={require('../../ImageAndLogo/logomessage.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: color,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          title: 'Localisation',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../ImageAndLogo/LogoWeKid.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: null,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={require('../../ImageAndLogo/logoprofil.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: color,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
