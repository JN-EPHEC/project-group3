import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, getUserFamily } from '../constants/firebase';

const DEFAULT_CATEGORIES = ['Santé', 'Vêtements', 'École', 'Alimentation', 'Transport'];
const DEFAULT_SEEDED_LIMIT = 100; // Montant par défaut pour les catégories nouvellement créées

type CategoryRule = { name: string; limit: number; allowOverLimit: boolean; period: 'monthly' | 'yearly' };

function CategoryLimitsManager({ familyId, colors }: { familyId: string | null; colors: any }) {
  const [categories, setCategories] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState(String(DEFAULT_SEEDED_LIMIT));
  const [newAllowOverLimit, setNewAllowOverLimit] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingCategoryRequests, setPendingCategoryRequests] = useState<any[]>([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!familyId) return;

    const budgetRef = doc(db, 'budgets', familyId);
    const unsubscribe = onSnapshot(budgetRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const rules = data.categoryRules || data.categoryLimits || {};
        // Si aucune règle n'existe, initialiser avec les catégories par défaut
        if (!rules || Object.keys(rules).length === 0) {
          const seed: any = {};
          DEFAULT_CATEGORIES.forEach((name) => {
            seed[name] = { limit: DEFAULT_SEEDED_LIMIT, allowOverLimit: true, period: 'monthly' };
          });
          await setDoc(budgetRef, { categoryRules: seed }, { merge: true });
        }
        const categoryArray = Object.entries(rules)
          .filter(([_, value]) => value !== null && value !== undefined)
          .map(([name, value]) => {
            if (typeof value === 'number') {
              return { name, limit: value as number, allowOverLimit: true, period: 'monthly' };
            }
            const obj = value as any;
            return { name, limit: obj?.limit ?? 0, allowOverLimit: !!obj?.allowOverLimit, period: obj?.period || 'monthly' };
          });
        setCategories(categoryArray);
      } else {
        // Créer le document avec les catégories par défaut
        const seed: any = {};
        DEFAULT_CATEGORIES.forEach((name) => {
          seed[name] = { limit: DEFAULT_SEEDED_LIMIT, allowOverLimit: true, period: 'monthly' };
        });
        await setDoc(budgetRef, { categoryRules: seed });
        setCategories(DEFAULT_CATEGORIES.map((name) => ({ name, limit: DEFAULT_SEEDED_LIMIT, allowOverLimit: true, period: 'monthly' })));
      }
      setLoading(false);
    }, (err) => {
      console.warn('[budget-settings] budgets onSnapshot error:', err?.code, err?.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  // Écouter les demandes de changement en attente
  useEffect(() => {
    if (!familyId || !currentUser) return;

    const requestsRef = collection(db, 'budgetChangeRequests');
    const q = query(
      requestsRef,
      where('familyId', '==', familyId),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requests: any[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        // Ne montrer que les demandes faites par d'autres utilisateurs
        if (data.requestedBy !== currentUser.uid) {
          let requestedByName = 'Utilisateur';
          try {
            const userDoc = await getDoc(doc(db, 'users', data.requestedBy));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              requestedByName = userData.firstName || userData.name || 'Utilisateur';
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }

          requests.push({
            id: docSnap.id,
            ...data,
            requestedByName,
          });
        }
      }
      setPendingRequests(requests);
    }, (err) => {
      console.warn('[budget-settings] budgetChangeRequests onSnapshot error:', err?.code, err?.message);
      setPendingRequests([]);
    });

    return () => unsubscribe();
  }, [familyId, currentUser]);

  // Écouter les demandes de nouvelles catégories en attente
  useEffect(() => {
    if (!familyId || !currentUser) return;

    const categoryApprovalsRef = collection(db, 'categoryApprovals');
    const q = query(
      categoryApprovalsRef,
      where('familyId', '==', familyId),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requests: any[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        // Ne montrer que les demandes faites par d'autres utilisateurs
        if (data.requestedBy !== currentUser.uid) {
          let requestedByName = 'Utilisateur';
          try {
            const userDoc = await getDoc(doc(db, 'users', data.requestedBy));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              requestedByName = userData.firstName || userData.name || 'Utilisateur';
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }

          requests.push({
            id: docSnap.id,
            ...data,
            requestedByName,
          });
        }
      }
      setPendingCategoryRequests(requests);
    }, (err) => {
      console.warn('[budget-settings] categoryApprovals onSnapshot error:', err?.code, err?.message);
      setPendingCategoryRequests([]);
    });

    return () => unsubscribe();
  }, [familyId, currentUser]);

  // Écouter les demandes de nouvelles catégories en attente
  useEffect(() => {
    if (!familyId || !currentUser) return;

    const categoryApprovalsRef = collection(db, 'categoryApprovals');
    const q = query(
      categoryApprovalsRef,
      where('familyId', '==', familyId),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requests: any[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        // Ne montrer que les demandes faites par d'autres utilisateurs
        if (data.requestedBy !== currentUser.uid) {
          let requestedByName = 'Utilisateur';
          try {
            const userDoc = await getDoc(doc(db, 'users', data.requestedBy));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              requestedByName = userData.firstName || userData.name || 'Utilisateur';
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }

          requests.push({
            id: docSnap.id,
            ...data,
            requestedByName,
          });
        }
      }
      setPendingCategoryRequests(requests);
    }, (err) => {
      console.warn('[budget-settings] categoryApprovals onSnapshot error:', err?.code, err?.message);
      setPendingCategoryRequests([]);
    });

    return () => unsubscribe();
  }, [familyId, currentUser]);

  const handleUpdateLimit = async (categoryName: string, newLimit: string) => {
    if (!familyId || !currentUser) {
      console.warn('[budget-settings] No familyId or user for update limit');
      Alert.alert('Session expirée', 'Reconnectez-vous pour modifier le budget.');
      return;
    }

    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    const current = categories.find((c) => c.name === categoryName);
    if (!current) return;

    // Si la limite ne change pas, annuler
    if (current.limit === limit) {
      setEditingCategory(null);
      setEditValue('');
      return;
    }

    try {
      // Créer une demande de changement au lieu de modifier directement
      const requestData = {
        familyId,
        categoryName,
        currentLimit: current.limit,
        newLimit: limit,
        allowOverLimit: current.allowOverLimit,
        requestedBy: currentUser.uid,
        status: 'PENDING',
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'budgetChangeRequests'), requestData);

      Alert.alert(
        '📬 Demande envoyée',
        `Votre demande de modification du budget "${categoryName}" (${current.limit.toFixed(2)} € → ${limit.toFixed(2)} €) a été envoyée à l'autre parent pour approbation.`
      );

      setEditingCategory(null);
      setEditValue('');
    } catch (error: any) {
      console.error('Error creating budget change request:', error);
      const code = error?.code || 'unknown';
      const message = error?.message || 'Erreur inconnue';
      Alert.alert(
        'Erreur demande budget',
        `Impossible de créer la demande.\nCode: ${code}\nMessage: ${message}\n\nAstuce: vérifiez les règles Firestore pour "budgetChangeRequests" et votre appartenance à la famille.`
      );
    }
  };

  const handleUpdateCategoryName = async (oldName: string, newName: string) => {
    if (!familyId) return;

    const trimmedName = newName.trim();
    if (!trimmedName) {
      Alert.alert('Erreur', 'Le nom de la catégorie ne peut pas être vide');
      return;
    }

    if (trimmedName === oldName) {
      setEditingCategoryName(null);
      setEditNameValue('');
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.name !== oldName)) {
      Alert.alert('Erreur', 'Une catégorie avec ce nom existe déjà');
      return;
    }

    try {
      const budgetRef = doc(db, 'budgets', familyId);
      const current = categories.find((c) => c.name === oldName);
      
      if (current) {
        // Supprimer l'ancienne catégorie et créer la nouvelle
        const budgetDoc = await getDoc(budgetRef);
        const rules = budgetDoc.data()?.categoryRules || {};
        delete rules[oldName];
        rules[trimmedName] = { limit: current.limit, allowOverLimit: true, period: current.period };
        
        await updateDoc(budgetRef, { categoryRules: rules });
      }
      
      setEditingCategoryName(null);
      setEditNameValue('');
    } catch (error) {
      console.error('Error updating category name:', error);
      Alert.alert('Erreur', 'Impossible de renommer la catégorie');
    }
  };

  const handleApproveRequest = async (request: any) => {
    if (!familyId || !currentUser) {
      console.warn('[budget-settings] No familyId or user for approve request');
      Alert.alert('Session expirée', 'Reconnectez-vous pour approuver la demande.');
      return;
    }

    try {
      // Mettre à jour le budget
      const budgetRef = doc(db, 'budgets', familyId);
      
      if (request.changeType === 'period') {
        // Changement de période
        await updateDoc(budgetRef, {
          [`categoryRules.${request.categoryName}`]: {
            limit: request.currentLimit,
            allowOverLimit: true,
            period: request.newPeriod,
          },
        });
      } else {
        // Changement de limite (comportement existant)
        await updateDoc(budgetRef, {
          [`categoryRules.${request.categoryName}`]: {
            limit: request.newLimit,
            allowOverLimit: true,
            period: request.newPeriod || request.currentPeriod || 'monthly',
          },
        });
      }

      // Mettre à jour le statut de la demande
      const requestRef = doc(db, 'budgetChangeRequests', request.id);
      await updateDoc(requestRef, {
        status: 'APPROVED',
        approvedBy: currentUser.uid,
        approvedAt: new Date(),
      });

      if (request.changeType === 'period') {
        Alert.alert(
          '✅ Demande approuvée',
          `La période de "${request.categoryName}" a été changée en ${request.newPeriod === 'monthly' ? 'mensuel' : 'annuel'}.`
        );
      } else {
        Alert.alert(
          '✅ Demande approuvée',
          `Le budget "${request.categoryName}" a été modifié de ${request.currentLimit.toFixed(2)} € à ${request.newLimit.toFixed(2)} €.`
        );
      }
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Erreur', 'Impossible d\'approuver la demande');
    }
  };

  const handleRejectRequest = async (request: any) => {
    if (!currentUser) {
      console.warn('[budget-settings] No user for reject request');
      Alert.alert('Session expirée', 'Reconnectez-vous pour rejeter la demande.');
      return;
    }

    Alert.alert(
      'Rejeter la demande',
      `Êtes-vous sûr de vouloir rejeter la modification du budget "${request.categoryName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            try {
              const requestRef = doc(db, 'budgetChangeRequests', request.id);
              await updateDoc(requestRef, {
                status: 'REJECTED',
                rejectedBy: currentUser.uid,
                rejectedAt: new Date(),
              });

              Alert.alert('❌ Demande rejetée', 'La modification a été refusée.');
            } catch (error: any) {
              console.error('Error rejecting request:', error);
              const code = error?.code || 'unknown';
              const message = error?.message || 'Erreur inconnue';
              Alert.alert(
                'Erreur rejet demande',
                `Impossible de rejeter la demande.\nCode: ${code}\nMessage: ${message}`
              );
            }
          },
        },
      ]
    );
  };

  const handleApproveCategoryRequest = async (request: any) => {
    if (!familyId || !currentUser) {
      console.warn('[budget-settings] No familyId or user for approve category request');
      return;
    }
    try {
      if (request.action === 'DELETE') {
        // Supprimer la catégorie du budget
        const budgetRef = doc(db, 'budgets', familyId);
        await updateDoc(budgetRef, {
          [`categoryRules.${request.categoryName}`]: null,
        });

        // Mettre à jour toutes les dépenses qui utilisent cette catégorie
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('familyId', '==', familyId),
          where('category', '==', request.categoryName)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        
        const updatePromises = expensesSnapshot.docs.map((docSnapshot) => 
          updateDoc(doc(db, 'expenses', docSnapshot.id), {
            category: 'Non catégorisé',
          })
        );
        await Promise.all(updatePromises);

        // Mettre à jour le statut de la demande
        const requestRef = doc(db, 'categoryApprovals', request.id);
        await updateDoc(requestRef, {
          status: 'APPROVED',
          approvedBy: currentUser.uid,
          approvedAt: new Date(),
        });

        Alert.alert('Succès', `La catégorie "${request.categoryName}" a été supprimée. ${expensesSnapshot.size} dépense(s) ont été reclassées en "Non catégorisé".`);
      } else {
        // Ajouter la catégorie au budget
        const budgetRef = doc(db, 'budgets', familyId);
        await updateDoc(budgetRef, {
          [`categoryRules.${request.categoryName}`]: {
            limit: request.limit,
            allowOverLimit: request.allowOverLimit,
            period: 'monthly'
          },
        });

        // Mettre à jour le statut de la demande
        const requestRef = doc(db, 'categoryApprovals', request.id);
        await updateDoc(requestRef, {
          status: 'APPROVED',
          approvedBy: currentUser.uid,
          approvedAt: new Date(),
        });

        Alert.alert('Succès', `La catégorie "${request.categoryName}" a été ajoutée.`);
      }
    } catch (error) {
      console.error('Error approving category request:', error);
      Alert.alert('Erreur', 'Impossible d\'approuver la demande');
    }
  };

  const handleRejectCategoryRequest = async (request: any) => {
    if (!currentUser) {
      console.warn('[budget-settings] No user for reject category request');
      return;
    }
    try {
      const requestRef = doc(db, 'categoryApprovals', request.id);
      await updateDoc(requestRef, {
        status: 'REJECTED',
        rejectedBy: currentUser.uid,
        rejectedAt: new Date(),
      });
      Alert.alert('Refusé', `La demande de catégorie "${request.categoryName}" a été refusée.`);
    } catch (error) {
      console.error('Error rejecting category request:', error);
      Alert.alert('Erreur', 'Impossible de refuser la demande');
    }
  };

  const handleRequestDeleteCategory = async (categoryName: string) => {
    if (!familyId || !currentUser) {
      Alert.alert('Erreur', 'Vous devez être connecté.');
      return;
    }

    Alert.alert(
      'Supprimer la catégorie',
      `Voulez-vous demander la suppression de la catégorie "${categoryName}" ? L'autre parent devra approuver.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Demander la suppression',
          style: 'destructive',
          onPress: async () => {
            try {
              // Créer une demande d'approbation de suppression
              await addDoc(collection(db, 'categoryApprovals'), {
                familyId,
                categoryName,
                action: 'DELETE',
                requestedBy: currentUser.uid,
                status: 'PENDING',
                createdAt: new Date(),
              });

              Alert.alert(
                'Demande envoyée',
                'Votre demande de suppression a été envoyée. La catégorie sera supprimée une fois approuvée par l\'autre parent.'
              );
            } catch (error) {
              console.error('Error requesting category deletion:', error);
              Alert.alert('Erreur', 'Impossible de créer la demande de suppression');
            }
          },
        },
      ]
    );
  };

  const handleToggleAllow = async (categoryName: string, allow: boolean) => {
    if (!familyId) {
      console.warn('[budget-settings] No familyId for toggle allow');
      Alert.alert('Session expirée', 'Reconnectez-vous pour modifier les règles.');
      return;
    }
    try {
      const budgetRef = doc(db, 'budgets', familyId);
      const current = categories.find((c) => c.name === categoryName);
      const limit = current?.limit ?? 0;
      const period = current?.period || 'monthly';
      await updateDoc(budgetRef, {
        [`categoryRules.${categoryName}`]: { limit, allowOverLimit: true, period },
      });
    } catch (error) {
      console.error('Error updating rule:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la règle');
    }
  };

  const handleTogglePeriod = async (categoryName: string, newPeriod: 'monthly' | 'yearly') => {
    if (!familyId || !currentUser) {
      Alert.alert('Session expirée', 'Reconnectez-vous pour modifier la période.');
      return;
    }

    const current = categories.find((c) => c.name === categoryName);
    if (!current) return;

    const oldPeriod = current.period;
    if (oldPeriod === newPeriod) return;

    // Vérifier s'il y a d'autres membres dans la famille qui doivent approuver
    try {
      const familyDoc = await getDoc(doc(db, 'families', familyId));
      if (!familyDoc.exists()) {
        Alert.alert('Erreur', 'Famille introuvable');
        return;
      }

      const members = familyDoc.data().members || [];
      const otherMembers = members.filter((m: string) => m !== currentUser.uid);

      if (otherMembers.length > 0) {
        // Créer une demande d'approbation
        await addDoc(collection(db, 'budgetChangeRequests'), {
          familyId,
          categoryName,
          changeType: 'period',
          currentPeriod: oldPeriod,
          newPeriod: newPeriod,
          currentLimit: current.limit,
          newLimit: current.limit,
          allowOverLimit: true,
          requestedBy: currentUser.uid,
          status: 'PENDING',
          createdAt: new Date(),
        });

        Alert.alert(
          '📝 Demande envoyée',
          `Votre demande de changement de période pour "${categoryName}" (${oldPeriod === 'monthly' ? 'mensuel' : 'annuel'} → ${newPeriod === 'monthly' ? 'mensuel' : 'annuel'}) a été envoyée pour approbation.`
        );
      } else {
        // Pas d'autres membres, appliquer directement
        const budgetRef = doc(db, 'budgets', familyId);
        await updateDoc(budgetRef, {
          [`categoryRules.${categoryName}`]: {
            limit: current.limit,
            allowOverLimit: true,
            period: newPeriod,
          },
        });

        Alert.alert(
          '✅ Période modifiée',
          `La période de "${categoryName}" a été changée en ${newPeriod === 'monthly' ? 'mensuel' : 'annuel'}.`
        );
      }
    } catch (error) {
      console.error('Error toggling period:', error);
      Alert.alert('Erreur', 'Impossible de modifier la période');
    }
  };

  const handleAddCategory = async () => {
    if (!familyId) {
      console.warn('[budget-settings] No familyId for add category');
      Alert.alert('Session expirée', 'Reconnectez-vous pour ajouter une catégorie.');
      return;
    }
    if (!currentUser) {
      Alert.alert('Erreur', 'Vous devez être connecté.');
      return;
    }
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert('Erreur', 'Le nom de la catégorie est requis');
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Info', 'Cette catégorie existe déjà');
      return;
    }
    const limit = parseFloat(newCategoryLimit);
    if (isNaN(limit) || limit < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }
    try {
      // Créer une demande d'approbation pour la nouvelle catégorie
      await addDoc(collection(db, 'categoryApprovals'), {
        familyId,
        categoryName: name,
        limit,
        allowOverLimit: newAllowOverLimit,
        requestedBy: currentUser.uid,
        status: 'PENDING',
        createdAt: new Date(),
      });

      setShowAddCategory(false);
      setNewCategoryName('');
      setNewCategoryLimit(String(DEFAULT_SEEDED_LIMIT));
      setNewAllowOverLimit(false);
      
      Alert.alert(
        'Demande envoyée',
        'Votre demande de nouvelle catégorie a été envoyée. Elle sera visible une fois approuvée par l\'autre parent.'
      );
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la catégorie');
    }
  };

  if (loading) {
    return <ActivityIndicator size="small" color={colors.tint} />;
  }

  if (categories.length === 0) {
    return (
      <View>
        <View style={{ alignItems: 'flex-end', marginBottom: V_SPACING.small }}>
          <TouchableOpacity onPress={() => setShowAddCategory(true)} style={styles.addButton}>
            <IconSymbol name="plus" size={20} color={colors.tint} />
          </TouchableOpacity>
        </View>
        <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucune catégorie créée. Ajoutez-en une pour commencer.
          </Text>
        </View>
        {showAddCategory && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle catégorie</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Nom de la catégorie"
                placeholderTextColor={colors.textSecondary}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Plafond (ex: 100)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={newCategoryLimit}
                onChangeText={setNewCategoryLimit}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowAddCategory(false)}>
                  <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalPrimary]} onPress={handleAddCategory}>
                  <Text style={[styles.modalButtonText, { color: '#000' }]}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      {/* Demandes de nouvelles catégories en attente */}
      {pendingCategoryRequests.length > 0 && (
        <View style={styles.pendingRequestsSection}>
          <View style={[styles.pendingRequestsHeader, { backgroundColor: '#E3F2FD' }]}>
            <IconSymbol name="folder.badge.plus" size={20} color="#2196F3" />
            <Text style={[styles.pendingRequestsTitle, { color: '#2196F3' }]}>
              {pendingCategoryRequests.length === 1 ? 'Nouvelle catégorie en attente' : `${pendingCategoryRequests.length} nouvelles catégories en attente`}
            </Text>
          </View>
          {pendingCategoryRequests.map((request) => (
            <View key={request.id} style={[styles.requestCard, { backgroundColor: colors.cardBackground, borderColor: request.action === 'DELETE' ? '#FF3B30' : '#2196F3' }]}>
              <View style={styles.requestInfo}>
                <Text style={[styles.requestCategory, { color: colors.text }]}>
                  {request.action === 'DELETE' ? '🗑️ ' : ''}{request.categoryName}
                </Text>
                {request.action === 'DELETE' ? (
                  <Text style={[styles.requestChange, { color: '#FF3B30' }]}>
                    Demande de suppression
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.requestChange, { color: colors.textSecondary }]}>
                      Limite: {request.limit.toFixed(2)} €
                    </Text>
                    <Text style={[styles.requestChange, { color: colors.textSecondary }]}>
                      Dépassement autorisé: {request.allowOverLimit ? 'Oui' : 'Non'}
                    </Text>
                  </>
                )}
                <Text style={[styles.requestedBy, { color: colors.textSecondary }]}>
                  Demandé par {request.requestedByName}
                </Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.rejectRequestButton, { backgroundColor: '#FF3B30' }]}
                  onPress={() => handleRejectCategoryRequest(request)}
                >
                  <IconSymbol name="xmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveRequestButton, { backgroundColor: '#34C759' }]}
                  onPress={() => handleApproveCategoryRequest(request)}
                >
                  <IconSymbol name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Demandes en attente */}
      {pendingRequests.length > 0 && (
        <View style={styles.pendingRequestsSection}>
          <View style={[styles.pendingRequestsHeader, { backgroundColor: '#FFF3E0' }]}>
            <IconSymbol name="bell.badge.fill" size={20} color="#FF9500" />
            <Text style={[styles.pendingRequestsTitle, { color: '#FF9500' }]}>
              {pendingRequests.length === 1 ? 'Demande en attente' : `${pendingRequests.length} demandes en attente`}
            </Text>
          </View>
          {pendingRequests.map((request) => (
            <View key={request.id} style={[styles.requestCard, { backgroundColor: colors.cardBackground, borderColor: '#FF9500' }]}>
              <View style={styles.requestInfo}>
                <Text style={[styles.requestCategory, { color: colors.text }]}>{request.categoryName}</Text>
                {request.changeType === 'period' ? (
                  <Text style={[styles.requestChange, { color: colors.textSecondary }]}>
                    Période: {request.currentPeriod === 'monthly' ? '📅 Mensuel' : '📆 Annuel'} → {request.newPeriod === 'monthly' ? '📅 Mensuel' : '📆 Annuel'}
                  </Text>
                ) : (
                  <Text style={[styles.requestChange, { color: colors.textSecondary }]}>
                    {request.currentLimit.toFixed(2)} € → {request.newLimit.toFixed(2)} €
                  </Text>
                )}
                <Text style={[styles.requestedBy, { color: colors.textSecondary }]}>
                  Demandé par {request.requestedByName}
                </Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.rejectRequestButton, { backgroundColor: '#FF3B30' }]}
                  onPress={() => handleRejectRequest(request)}
                >
                  <IconSymbol name="xmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveRequestButton, { backgroundColor: '#34C759' }]}
                  onPress={() => handleApproveRequest(request)}
                >
                  <IconSymbol name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ alignItems: 'flex-end', marginBottom: V_SPACING.small }}>
        <TouchableOpacity onPress={() => setShowAddCategory(true)} style={styles.addButton}>
          <IconSymbol name="plus" size={20} color={colors.tint} />
        </TouchableOpacity>
      </View>
      {categories.map((cat) => (
        <View key={cat.name} style={[styles.categoryLimitCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.categoryLimitInfo}>
            {editingCategoryName === cat.name ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={[styles.editNameInput, { color: colors.text, borderColor: colors.border }]}
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  placeholder="Nom de la catégorie"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.tint }]}
                  onPress={() => handleUpdateCategoryName(cat.name, editNameValue)}
                >
                  <IconSymbol name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={() => {
                    setEditingCategoryName(null);
                    setEditNameValue('');
                  }}
                >
                  <IconSymbol name="xmark" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.categoryNameRow}>
                <Text style={[styles.categoryLimitName, { color: colors.text }]}>{cat.name}</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.small }}>
                  <TouchableOpacity
                    style={styles.editNameButton}
                    onPress={() => {
                      setEditingCategoryName(cat.name);
                      setEditNameValue(cat.name);
                    }}
                  >
                    <IconSymbol name="pencil" size={16} color={colors.tint} />
                    <Text style={[styles.editNameButtonText, { color: colors.tint }]}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editNameButton, { borderColor: '#FF3B30' }]}
                    onPress={() => handleRequestDeleteCategory(cat.name)}
                  >
                    <IconSymbol name="trash" size={16} color="#FF3B30" />
                    <Text style={[styles.editNameButtonText, { color: '#FF3B30' }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {editingCategory === cat.name ? (
              <View style={styles.editLimitContainer}>
                <TextInput
                  style={[styles.editLimitInput, { color: colors.text, borderColor: colors.border }]}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.tint }]}
                  onPress={() => handleUpdateLimit(cat.name, editValue)}
                >
                  <IconSymbol name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={() => {
                    setEditingCategory(null);
                    setEditValue('');
                  }}
                >
                  <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.limitDisplay}>
                  <Text style={[styles.categoryLimitAmount, { color: colors.tint }]}>
                    {cat.limit.toFixed(2)} €
                  </Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      setEditingCategory(cat.name);
                      setEditValue(cat.limit.toString());
                    }}
                  >
                    <IconSymbol name="pencil" size={18} color={colors.tint} />
                  </TouchableOpacity>
                </View>

                <View style={styles.ruleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Période du budget</Text>
                    <Text style={[styles.ruleSublabel, { color: colors.textSecondary }]}>
                      {cat.period === 'monthly' ? '📅 Mensuel (se remet à zéro chaque mois)' : '📆 Annuel (se remet à zéro chaque année)'}
                    </Text>
                  </View>
                  <Switch
                    value={cat.period === 'yearly'}
                    onValueChange={(val) => handleTogglePeriod(cat.name, val ? 'yearly' : 'monthly')}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      ))}
      {showAddCategory && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle catégorie</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Nom de la catégorie"
              placeholderTextColor={colors.textSecondary}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Plafond (ex: 100)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={newCategoryLimit}
              onChangeText={setNewCategoryLimit}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.cardBackground }]} onPress={() => setShowAddCategory(false)}>
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimary]} onPress={handleAddCategory}>
                <Text style={[styles.modalButtonText, { color: '#000' }]}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default function BudgetSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const fetchFamilySettings = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.replace('/(auth)/LoginScreen');
        return;
      }

      try {
        // Prioritize familyId from params (active family)
        const paramFamilyId = params.familyId as string | undefined;
        const paramFamilyName = params.familyName as string | undefined;
        
        if (paramFamilyId) {
          setFamilyId(paramFamilyId);
          setFamilyName(paramFamilyName || null);
        } else {
          // Fallback to user's first family if no param
          const userFamily = await getUserFamily(currentUser.uid);
          if (userFamily?.id) {
            setFamilyId(userFamily.id);
            setFamilyName(null);
          }
        }
      } catch (error) {
        console.error('Error fetching family settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilySettings();
  }, [router, params]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.tint} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.tint }]}>Paramètres Budget</Text>
              {familyName && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{familyName}</Text>}
            </View>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Règles par catégorie</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Fixez un plafond et choisissez si les dépenses au-dessus doivent être autorisées.
            </Text>
            <CategoryLimitsManager familyId={familyId} colors={colors} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACING.large, paddingTop: V_SPACING.large, paddingBottom: V_SPACING.xxlarge },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: V_SPACING.xlarge,
  },
  addButton: {
    width: hs(40),
    height: hs(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: hs(40),
    height: hs(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: { flex: 1, alignItems: 'center' },
  title: { fontSize: FONT_SIZES.huge, fontWeight: '700' },
  subtitle: { fontSize: FONT_SIZES.small, fontWeight: '600', marginTop: vs(2) },
  section: { marginBottom: V_SPACING.xxlarge },
  sectionTitle: { fontSize: FONT_SIZES.large, fontWeight: '700', marginBottom: V_SPACING.small },
  sectionDescription: { fontSize: FONT_SIZES.regular, marginBottom: V_SPACING.regular, lineHeight: vs(20) },
  categoryLimitCard: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.regular,
    marginBottom: V_SPACING.medium,
  },
  categoryLimitInfo: {
    flexDirection: 'column',
    gap: V_SPACING.small,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: V_SPACING.small,
  },
  categoryLimitName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    flex: 1,
  },
  editNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
    paddingHorizontal: SPACING.small,
    paddingVertical: vs(4),
  },
  editNameButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginBottom: V_SPACING.small,
  },
  editNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    padding: SPACING.small,
    fontSize: FONT_SIZES.medium,
  },
  limitDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  categoryLimitAmount: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginTop: vs(4),
  },
  ruleLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  ruleSublabel: {
    fontSize: FONT_SIZES.tiny,
    marginTop: vs(2),
    fontStyle: 'italic',
  },
  editButton: {
    padding: SPACING.small,
  },
  editLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  editLimitInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    padding: SPACING.small,
    fontSize: FONT_SIZES.medium,
    width: hs(100),
    textAlign: 'right',
  },
  saveButton: {
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS.small,
  },
  cancelButton: {
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
  },
  emptyCard: {
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.large,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.regular,
    textAlign: 'center',
    lineHeight: vs(22),
  },
  pendingRequestsSection: {
    marginBottom: V_SPACING.large,
  },
  pendingRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: V_SPACING.small,
  },
  pendingRequestsTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: V_SPACING.small,
    borderWidth: 2,
  },
  requestInfo: {
    flex: 1,
  },
  requestCategory: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
    marginBottom: vs(4),
  },
  requestChange: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
    marginBottom: vs(4),
  },
  requestedBy: {
    fontSize: FONT_SIZES.small,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  rejectRequestButton: {
    width: hs(44),
    height: hs(44),
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveRequestButton: {
    width: hs(44),
    height: hs(44),
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.large,
  },
  modalContent: {
    width: '100%',
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.large,
    gap: V_SPACING.small,
  },
  modalTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    marginBottom: V_SPACING.small,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    padding: SPACING.small,
    fontSize: FONT_SIZES.medium,
  },
  modalSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: V_SPACING.small,
  },
  modalSwitchLabel: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.small,
    marginTop: V_SPACING.medium,
  },
  modalButton: {
    flex: 1,
    paddingVertical: V_SPACING.regular,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
  },
  modalPrimary: {
    backgroundColor: '#fff',
  },
  modalButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
});
