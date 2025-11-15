import { HapticTab } from '@/components/haptic-tab';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';

export default function ProTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFCEB0',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
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
                tintColor: '#FFCEB0',
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
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../ImageAndLogo/Logoagenda.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: '#FFCEB0',
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
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../ImageAndLogo/logomessage.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: '#FFCEB0',
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
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../ImageAndLogo/logoprofil.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: '#FFCEB0',
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
