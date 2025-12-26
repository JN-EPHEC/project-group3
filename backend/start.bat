@echo off
REM Script de démarrage rapide pour le backend Stripe (Windows)

echo 🚀 Demarrage du backend Stripe...

REM Vérifier si les dépendances sont installées
if not exist "node_modules\" (
  echo 📦 Installation des dependances...
  call npm install
)

REM Vérifier si le fichier .env existe
if not exist ".env" (
  echo ⚠️  Fichier .env manquant!
  echo Creez un fichier .env avec vos cles Stripe
  exit /b 1
)

REM Lancer le serveur en mode dev
echo ✅ Lancement du serveur sur http://localhost:3000
call npm run dev
