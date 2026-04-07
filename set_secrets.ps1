$secrets = @{
    "FIREBASE_API_KEY" = "AIzaSyDadazHFf525KrsOoQWUP5yJ7q7uxyf3lw"
    "GROQ_API_KEY" = "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"
    "CLOUDFLARE_TOKEN" = "YgjDGPr4Kt2A2lnTVI71vaJqDPs70LAue9c1ZGMK"
    "CLOUDFLARE_ZONE_ID" = "17279e3699e4721a9952206ddbe8b1ee"
    "CLOUDFLARE_ACCOUNT_ID" = "5d8eb51cd96c11f376ee4dd94e3009f3"
    "RESEND_API_KEY" = "re_frUajX2k_7oWbz3faKEkzYcH4hfJetQnw"
    "IMAGEKIT_PUBLIC_KEY" = "public_A7ZHxCiIBfl/fxzXlk1tXUUR+B4="
    "GEMINI_API_KEY" = "AIzaSyDVSn3L5_JyFOol8IsnGDktYiv1znqFmdA"
    "IMGBB_KEY" = "dbcb9de125850fefa4337db8d1f37ab6"
}

foreach ($key in $secrets.Keys) {
    Write-Host "Setting secret: $key"
    echo "$($secrets[$key])" | wrangler pages secret put $key --project-name expense-manager
}
