#!/bin/bash

# Script de démarrage rapide pour le backend Stripe

echo "🚀 Démarrage du backend Stripe..."

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
fi

# Vérifier si le fichier .env existe
if [ ! -f ".env" ]; then
  echo "⚠️  Fichier .env manquant!"
  echo "Créez un fichier .env avec vos clés Stripe"
  exit 1
fi

# Lancer le serveur en mode dev
echo "✅ Lancement du serveur sur http://localhost:3000"
npm run dev
