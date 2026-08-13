$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here

Start-Process "http://127.0.0.1:8765/"

if (Get-Command py -ErrorAction SilentlyContinue) {
    py -3 -m http.server 8765
}
elseif (Get-Command python -ErrorAction SilentlyContinue) {
    python -m http.server 8765
}
else {
    throw "Python no encontrado"
}
