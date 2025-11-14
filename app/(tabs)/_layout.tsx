import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#87CEEB',
        tabBarInactiveTintColor: '#87CEEB',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          paddingBottom: 5,
          paddingTop: 5,
          height: 70,
        },
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
        name="message"
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

      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}