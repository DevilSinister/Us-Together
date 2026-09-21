# Copy to set-build-env.local.ps1 (gitignored), fill the values, then: . .\set-build-env.local.ps1
$env:WIDGET_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:WIDGET_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_..."
$env:WIDGET_WEB_BASE_URL = "https://<your-deployed-origin>"
$env:WIDGET_FIREBASE_SENDER_ID = "<project_info.project_number>"
$env:WIDGET_FIREBASE_PROJECT_ID = "<project_info.project_id>"
$env:WIDGET_FIREBASE_APP_ID = "<client[0].client_info.mobilesdk_app_id>"
$env:WIDGET_FIREBASE_API_KEY = "<client[0].api_key[0].current_key>"
$env:WIDGET_KEYSTORE_PATH = "C:\keys\us-together-release.jks"
$env:WIDGET_KEY_ALIAS = "ustogether"
$env:WIDGET_KEYSTORE_PASSWORD = Read-Host -AsSecureString "Keystore password" | ConvertFrom-SecureString -AsPlainText
$env:WIDGET_KEY_PASSWORD = $env:WIDGET_KEYSTORE_PASSWORD
$env:JAVA_HOME = "<path to a JDK 17>"
