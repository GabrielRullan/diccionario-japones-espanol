# Deploy directly to Google Cloud Run using gcloud CLI
param(
    [string]$ProjectId,
    [string]$Region = "europe-west1",
    [string]$ServiceName = "diccionario-japones-espanol"
)

if (-not $ProjectId) {
    $ProjectId = gcloud config get-value project 2>$null
}

if (-not $ProjectId) {
    Write-Host "Por favor especifica un Project ID: .\deploy-cloudrun.ps1 -ProjectId TU_PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "==> Desplegando en Google Cloud Run en el proyecto: $ProjectId ($Region)..." -ForegroundColor Cyan

gcloud run deploy $ServiceName `
    --source . `
    --project $ProjectId `
    --region $Region `
    --platform managed `
    --allow-unauthenticated

Write-Host "==> ¡Despliegue completado!" -ForegroundColor Green
