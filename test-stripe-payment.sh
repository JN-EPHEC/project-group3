#!/bin/bash

# 🧪 Script de Test - Vérification Paiement Stripe

echo "════════════════════════════════════════════════"
echo "🧪 Test du Flux de Paiement Stripe"
echo "════════════════════════════════════════════════"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
API_URL="${1:-http://localhost:3000}"
TEST_USER_ID="test-user-$(date +%s)"
TEST_EMAIL="test+$TEST_USER_ID@example.com"

echo ""
echo -e "${BLUE}📋 Configuration${NC}"
echo "API URL: $API_URL"
echo "Test User ID: $TEST_USER_ID"
echo "Test Email: $TEST_EMAIL"
echo ""

# ============================================
# 1. Test de connexion au backend
# ============================================
echo -e "${YELLOW}1️⃣  Test de connexion au backend...${NC}"
HEALTH=$(curl -s -w "\n%{http_code}" "$API_URL/health")
HTTP_CODE=$(echo "$HEALTH" | tail -n 1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend accessible${NC}"
else
    echo -e "${RED}❌ Backend non accessible (HTTP $HTTP_CODE)${NC}"
    echo "Assurez-vous que le backend est lancé sur $API_URL"
    exit 1
fi

# ============================================
# 2. Test Firebase
# ============================================
echo ""
echo -e "${YELLOW}2️⃣  Test de connexion Firebase...${NC}"
FB_TEST=$(curl -s "$API_URL/test-firebase")
if echo "$FB_TEST" | grep -q "true"; then
    echo -e "${GREEN}✅ Firebase accessible${NC}"
    echo "Collections: $(echo $FB_TEST | grep -o '"collections":\[[^]]*\]')"
else
    echo -e "${RED}❌ Firebase non accessible${NC}"
    exit 1
fi

# ============================================
# 3. Test de création de session Checkout
# ============================================
echo ""
echo -e "${YELLOW}3️⃣  Test de création de session Checkout...${NC}"

# Montant en cents (9.99 EUR)
SESSION_RESPONSE=$(curl -s -X POST "$API_URL/api/create-checkout-session" \
  -H "Content-Type: application/json" \
  -d "{
    \"priceId\": \"price_1SiXfe2OiYebg9QDRWHm63We\",
    \"userId\": \"$TEST_USER_ID\",
    \"userEmail\": \"$TEST_EMAIL\",
    \"successUrl\": \"myapp://payment-success?session_id={CHECKOUT_SESSION_ID}\",
    \"cancelUrl\": \"myapp://payment-cancelled\"
  }")

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
SESSION_URL=$(echo "$SESSION_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SESSION_ID" ]; then
    echo -e "${GREEN}✅ Session Checkout créée${NC}"
    echo "Session ID: $SESSION_ID"
    echo "URL Checkout: $SESSION_URL"
    echo ""
    echo -e "${YELLOW}📝 Pour tester le paiement :${NC}"
    echo "1. Ouvrir l'URL ci-dessus dans un navigateur"
    echo "2. Utiliser la carte test: 4242 4242 4242 4242"
    echo "3. Exp: 12/25, CVC: 123"
    echo "4. Soumettre le formulaire"
else
    echo -e "${RED}❌ Échec de création de session${NC}"
    echo "Réponse: $SESSION_RESPONSE"
    exit 1
fi

# ============================================
# 4. Test d'endpoint subscription-status
# ============================================
echo ""
echo -e "${YELLOW}4️⃣  Test de vérification du statut d'abonnement...${NC}"

STATUS_RESPONSE=$(curl -s "$API_URL/api/subscription-status/$TEST_USER_ID")
echo "Réponse: $STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | grep -q "hasActiveSubscription"; then
    echo -e "${GREEN}✅ Endpoint subscription-status fonctionne${NC}"
else
    echo -e "${RED}❌ Endpoint subscription-status erreur${NC}"
fi

# ============================================
# 5. Résumé
# ============================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Tests préliminaires réussis${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📊 Prochaines étapes :${NC}"
echo "1. Complétez le paiement via la session Checkout"
echo "2. Vérifiez que Firestore est mis à jour"
echo "3. Vérifiez les logs du backend (cherchez 'User $TEST_USER_ID')"
echo ""
echo "Pour vérifier Firestore:"
echo "firebase console → Firestore → users/$TEST_USER_ID"
echo ""

