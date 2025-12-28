@echo off
echo.
echo ====================================
echo  Backend Stripe + Firebase
echo ====================================
echo.

REM Vérifier si node_modules existe
if not exist "node_modules\" (
    echo ⚠️  node_modules introuvable
    echo 📦 Installation des dependances...
    echo.
    call npm install
    echo.
)

REM Vérifier si serviceAccountKey.json existe
if not exist "serviceAccountKey.json" (
    echo.
    echo ❌ serviceAccountKey.json introuvable!
    echo.
    echo 📚 Consultez: DOWNLOAD_SERVICE_ACCOUNT_KEY.md
    echo.
    echo 🔧 Étapes rapides:
    echo    1. Firebase Console ^> Settings ^> Service Accounts
    echo    2. Generate new private key
    echo    3. Sauvegarder en: backend/serviceAccountKey.json
    echo.
    pause
    exit /b 1
)

REM Vérifier la configuration
echo 🔧 Vérification de la configuration...
node setup-backend.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Configuration incomplète
    echo.
    pause
    exit /b 1
)

echo.
echo 🚀 Démarrage du serveur...
echo.
echo    API: http://localhost:3000
echo    Health: http://localhost:3000/health
echo    Firebase Test: http://localhost:3000/test-firebase
echo.
echo    Webhook: http://localhost:3000/webhook/stripe
echo.
echo Pour arrêter: Ctrl+C
echo.

npm run dev
