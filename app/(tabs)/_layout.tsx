import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#87CEEB' : '#87CEEB',
        tabBarInactiveTintColor: isDark ? '#666' : '#999',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../ImageAndLogo/LogoWeKid.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../ImageAndLogo/Logoagenda.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Message"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../ImageAndLogo/logomessage.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Dépenses"
        options={{
          title: 'Dépenses',
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../ImageAndLogo/LogoDepense.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Aide"
        options={{
          title: 'Aide',
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../ImageAndLogo/LogoaideWeKid.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color, size }) => (
            <Image 
              source={require('../../ImageAndLogo/logoprofil.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}