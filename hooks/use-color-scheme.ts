import { useEffect, useState } from 'react';
import { Appearance, useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const rnColorScheme = useRNColorScheme();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    return rnColorScheme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    // Update when rnColorScheme changes
    const scheme = rnColorScheme === 'dark' ? 'dark' : 'light';
    setColorScheme(scheme);
  }, [rnColorScheme]);

  useEffect(() => {
    // Listener for theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme: newColorScheme }) => {
      const scheme = newColorScheme === 'dark' ? 'dark' : 'light';
      setColorScheme(scheme);
    });

    return () => subscription.remove();
  }, []);

  return colorScheme;
}
