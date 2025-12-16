import { IconSymbol } from '@/components/ui/icon-symbol';
import { BORDER_RADIUS, FONT_SIZES, hs, SPACING, V_SPACING, vs, wp } from '@/constants/responsive';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScanBarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [isCameraActive, setIsCameraActive] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsCameraActive(true);
      return () => {
        setIsCameraActive(false);
      };
    }, [])
  );

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const fetchProductInfo = async (barcode: string) => {
    setLoading(true);
    try {
      // Utiliser l'API Open Food Facts
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        
        // Extraire les informations pertinentes
        const productInfo = {
          name: product.product_name || product.generic_name || 'Produit inconnu',
          brand: product.brands || '',
          category: product.categories_tags?.[0]?.replace('en:', '') || 'Alimentation',
          barcode: barcode,
          image: product.image_url || null
        };

        // Rediriger vers l'écran d'ajout de dépense avec les infos
        router.replace({
          pathname: '/add-expense',
          params: {
            scannedProduct: JSON.stringify(productInfo)
          }
        });
      } else {
        Alert.alert(
          'Produit non trouvé',
          'Ce code-barres n\'est pas reconnu. Voulez-vous ajouter manuellement la dépense ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Ajouter manuellement', 
              onPress: () => router.replace('/add-expense')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les informations du produit');
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    fetchProductInfo(data);
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.tint} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.tint }]}>Scanner un produit</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.permissionContainer}>
            <IconSymbol name="camera.fill" size={64} color={colors.textTertiary} />
            <Text style={[styles.permissionText, { color: colors.text }]}>
              Permission caméra requise
            </Text>
            <Text style={[styles.permissionSubtext, { color: colors.textSecondary }]}>
              Nous avons besoin d'accéder à votre caméra pour scanner les codes-barres
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primaryButton }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#000' }]}>
      <View style={styles.cameraContainer}>
        {isCameraActive && (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
        >
          <View style={styles.overlay}>
            {/* Header */}
            <View style={styles.cameraHeader}>
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={styles.closeButton}
              >
                <IconSymbol name="xmark" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Scanner un code-barres</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Scanning Frame */}
            <View style={styles.scanningArea}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.instructionText}>
                Placez le code-barres dans le cadre
              </Text>
            </View>

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Recherche du produit...</Text>
              </View>
            )}

            {/* Rescan Button */}
            {scanned && !loading && (
              <View style={styles.rescanContainer}>
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={() => setScanned(false)}
                >
                  <Text style={styles.rescanButtonText}>Scanner à nouveau</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </CameraView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '700' },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10.7),
  },
  permissionText: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    marginTop: V_SPACING.xlarge,
    marginBottom: V_SPACING.medium,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: FONT_SIZES.medium,
    textAlign: 'center',
    marginBottom: V_SPACING.xxlarge,
    lineHeight: vs(24),
  },
  permissionButton: {
    paddingHorizontal: SPACING.xxlarge,
    paddingVertical: V_SPACING.regular,
    borderRadius: BORDER_RADIUS.large,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5.3),
    paddingTop: vs(60),
    paddingBottom: vs(20),
  },
  closeButton: {
    width: hs(44),
    height: hs(44),
    borderRadius: hs(22),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    color: '#fff',
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: wp(74.7),
    height: wp(74.7),
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: hs(40),
    height: hs(40),
    borderColor: '#fff',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: hs(8),
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: hs(8),
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: hs(8),
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: hs(8),
  },
  instructionText: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginTop: V_SPACING.xxlarge,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    marginTop: V_SPACING.regular,
  },
  rescanContainer: {
    position: 'absolute',
    bottom: vs(60),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rescanButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: SPACING.xxlarge,
    paddingVertical: V_SPACING.regular,
    borderRadius: hs(25),
  },
  rescanButtonText: {
    color: '#000',
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
});
