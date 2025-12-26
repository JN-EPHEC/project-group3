# Script pour configurer et lancer le webhook Stripe

Write-Host "🔧 Configuration du Webhook Stripe..." -ForegroundColor Cyan

# Rafraîchir le PATH pour inclure Scoop
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Vérifier si Stripe CLI est accessible
if (!(Get-Command stripe -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Stripe CLI non trouvé dans le PATH" -ForegroundColor Yellow
    Write-Host "📝 Ajoute manuellement Stripe au PATH ou redémarre PowerShell" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ensuite, exécute ces commandes :" -ForegroundColor Green
    Write-Host "  1. stripe login" -ForegroundColor White
    Write-Host "  2. stripe listen --forward-to localhost:3000/webhook/stripe" -ForegroundColor White
    exit
}

Write-Host "✅ Stripe CLI détecté" -ForegroundColor Green
Write-Host ""

# Login Stripe
Write-Host "🔐 Connexion à Stripe..." -ForegroundColor Cyan
Write-Host "Une page web va s'ouvrir pour t'authentifier" -ForegroundColor Yellow
stripe login

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Connexion réussie !" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎧 Démarrage du webhook listener..." -ForegroundColor Cyan
    Write-Host "⚠️  IMPORTANT : Copie le webhook secret (whsec_...) qui s'affiche ci-dessous" -ForegroundColor Yellow
    Write-Host ""
    
    # Lancer le webhook listener
    stripe listen --forward-to localhost:3000/webhook/stripe
} else {
    Write-Host "❌ Échec de la connexion" -ForegroundColor Red
}
