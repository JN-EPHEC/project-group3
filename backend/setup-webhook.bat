@echo off
echo.
echo ========================================
echo   Configuration Webhook Stripe
echo ========================================
echo.
echo ETAPE 1: Connexion a Stripe
echo Une page web va s'ouvrir pour l'authentification
echo.
pause

stripe login

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Erreur lors de la connexion!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ETAPE 2: Lancement du webhook listener
echo ========================================
echo.
echo IMPORTANT: Copie le webhook secret qui s'affiche
echo           Il commence par whsec_...
echo.
echo Laisse ce terminal ouvert!
echo.
pause

stripe listen --forward-to localhost:3000/webhook/stripe
