
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getPersistedSession } from '../constants/sessionManager';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [href, setHref] = useState('/(auth)/WelcomeScreen');

  useEffect(() => {
    const check = async () => {
      try {
        const session = await getPersistedSession();
        if (session) {
          setHref(session.userType === 'professionnel' ? '/(pro-tabs)' : '/(tabs)');
        } else {
          setHref('/(auth)/WelcomeScreen');
        }
      } finally {
        setReady(true);
      }
    };
    check();
  }, []);

  if (!ready) return null;
  return <Redirect href={href} />;
}
