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

        // MODIFICATION ICI : On vérifie le code ET le message pour être sûr
        const isPermissionError = 
            err.code === 'permission-denied' || 
            err.message?.includes('permission-denied') ||
            err.message?.includes('Missing or insufficient permissions');

        if (isPermissionError) {
          // On ne fait RIEN (même pas de console.log pour garder le silence)
          setLoading(false);
          return;
        }

        console.error('[useUserDoc] Real Error:', err);
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