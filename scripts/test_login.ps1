$body = @{
    email = "student1@gmail.com"
    password = "wrongpassword"
    mac_address = "AA:BB:CC:DD:EE:FF"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "Success Response:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error Response:"
    $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 5
}
