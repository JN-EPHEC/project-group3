import { BlurView } from 'expo-blur';
import { Tabs, useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Image, Platform, useColorScheme } from 'react-native';
import { auth, db, getUserFamily } from '../../constants/firebase';
import { StripeService } from '../../constants/stripeService';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingExpenseApprovals, setPendingExpenseApprovals] = useState(0);
  const router = useRouter();

  // Gate: redirect to subscription if user has no active subscription
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return; // auth flow will handle

        const hasActive = await StripeService.hasActiveSubscription(user.uid);
        if (!hasActive) {
          router.replace('/subscription');
        }
      } catch (e) {
        // In case of error, do not block the user; you may log it
        console.error('Subscription check failed:', e);
      }
    };

    checkSubscription();
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const setupUnreadListener = async () => {
      try {
        const userFamily = await getUserFamily(currentUser.uid);
        if (!userFamily?.id) return;

        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('familyId', '==', userFamily.id),
          where('participants', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
          const total = snapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.unreadCount?.[currentUser.uid] || 0);
          }, 0);
          setUnreadCount(total);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up unread listener:', error);
      }
    };

    setupUnreadListener();
  }, []);

  // Pending expense approvals badge for Dépenses tab
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    let unsubscribe: (() => void) | undefined;

    getDoc(userDocRef).then((userDoc) => {
      if (!userDoc.exists()) return;

      let familyIds: string[] = userDoc.data().familyIds || [];
      const legacy = userDoc.data().familyId;
      if (legacy && !familyIds.includes(legacy)) familyIds = [legacy, ...familyIds];

      if (!familyIds || familyIds.length === 0) {
        setPendingExpenseApprovals(0);
        return;
      }

      const expensesRef = collection(db, 'expenses');
      const qPending = query(
        expensesRef,
        where('familyId', 'in', familyIds.slice(0, 10)), // Firestore 'in' limit
        where('approvalStatus', '==', 'PENDING_APPROVAL')
      );

      unsubscribe = onSnapshot(qPending, (snapshot) => {
        const count = snapshot.docs.filter((d) => d.data().paidBy !== currentUser.uid).length;
        setPendingExpenseApprovals(count);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#87CEEB' : '#87CEEB',
        tabBarInactiveTintColor: isDark ? '#666' : '#999',
        tabBarShowLabel: true,
        tabBarBadgeStyle: {
          backgroundColor: isDark ? '#007AFF' : '#87CEEB',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: '700',
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          lineHeight: 20,
          textAlign: 'center',
          paddingHorizontal: 6,
        } as any,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: -4,
        },
        tabBarIconStyle: {
          marginTop: 2,
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
          headerShown: false,
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
          headerShown: false,
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
          headerShown: false,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
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
          headerShown: false,
          tabBarBadge: pendingExpenseApprovals > 0 ? pendingExpenseApprovals : undefined,
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
          headerShown: false,
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