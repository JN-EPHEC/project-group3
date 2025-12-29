import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { db } from '../constants/firebase'; // Pas besoin de auth ici

export type UserDocData = Record<string, any> | null;

export function useUserDoc(userId?: string | null) {
  const [data, setData] = useState<UserDocData>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<Error | null>(null);

  // Pour éviter les mises à jour d'état sur un composant démonté
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Si pas d'userId, on reset tout et on ne lance pas de listener
    if (!userId) {
      setData(null);
      setLoading(false);
      setError(null);
      return () => { mountedRef.current = false; };
    }

    setLoading(true);

    const ref = doc(db, 'users', userId);

    const unsubscribe: Unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!mountedRef.current) return;
        setData(snap.exists() ? (snap.data() as UserDocData) : null);
        setLoading(false);
        setError(null);
      },
      (err: any) => {
        if (!mountedRef.current) return;

        // C'est ICI qu'on ignore l'erreur de permission lors de la déconnexion
        if (err.code === 'permission-denied') {
          console.log('[useUserDoc] Permission denied (Logout probable) - Ignoré');
          setLoading(false);
          // On ne set PAS l'erreur pour ne pas casser l'UI
          return;
        }

        console.error('[useUserDoc] Error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      unsubscribe(); // Nettoyage immédiat quand userId change ou unmount
    };
  }, [userId]); // Dépendance critique : userId

  return { data, loading, error };
}