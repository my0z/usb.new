# TradingView MCP 원클릭 설정 (Windows PowerShell)
# 사용법:  .\setup.ps1            → Claude Code + Claude Desktop + Cursor
#         .\setup.ps1 claude-code
#         .\setup.ps1 status
#         .\setup.ps1 remove
param([string]$Target = "all")
$ErrorActionPreference = "Stop"
$Name = "tradingview"
$Url  = "https://mcp.tradingview.com/mcp"
$Scope = if ($env:TV_SCOPE) { $env:TV_SCOPE } else { "user" }

function Merge-Json($Path) {
  $dir = Split-Path $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  $obj = if ((Test-Path $Path) -and (Get-Content $Path -Raw).Trim()) { Get-Content $Path -Raw | ConvertFrom-Json } else { [pscustomobject]@{} }
  if (-not $obj.PSObject.Properties["mcpServers"]) { $obj | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
  $obj.mcpServers | Add-Member -Force -NotePropertyName $Name -NotePropertyValue ([pscustomobject]@{ type = "http"; url = $Url })
  $obj | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $Path
  Write-Host "✔ $Path 에 등록됨" -ForegroundColor Green
}

function Do-ClaudeCode {
  if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { Write-Warning "claude CLI 없음 → npm install -g @anthropic-ai/claude-code"; return }
  Write-Host "▶ Claude Code 등록 (scope=$Scope)" -ForegroundColor Cyan
  claude mcp remove $Name -s $Scope 2>$null | Out-Null
  claude mcp add --transport http -s $Scope $Name $Url
  Write-Host "✔ 완료 → claude 실행 후 /mcp 에서 tradingview 선택 → 브라우저 로그인" -ForegroundColor Green
}
function Do-Desktop { Write-Host "▶ Claude Desktop 설정" -ForegroundColor Cyan; Write-Warning "설정 → 커넥터 → 커넥터 추가 에서 URL 입력이 가장 확실: $Url"; Merge-Json "$env:APPDATA\Claude\claude_desktop_config.json" }
function Do-Cursor  { Write-Host "▶ Cursor 설정" -ForegroundColor Cyan; Merge-Json "$env:USERPROFILE\.cursor\mcp.json" }
function Do-Status  { if (Get-Command claude -ErrorAction SilentlyContinue) { claude mcp list | Select-String $Name } }
function Do-Remove  { foreach ($s in "user","local") { claude mcp remove $Name -s $s 2>$null | Out-Null }; Write-Host "✔ Claude Code 에서 제거됨" -ForegroundColor Green }

switch ($Target) {
  "claude-code" { Do-ClaudeCode }
  "desktop"     { Do-Desktop }
  "cursor"      { Do-Cursor }
  "status"      { Do-Status }
  "remove"      { Do-Remove }
  default {
    Do-ClaudeCode
    if (Test-Path "$env:USERPROFILE\.cursor") { Do-Cursor }
    if (Test-Path "$env:APPDATA\Claude")      { Do-Desktop }
    Write-Host "`n다음 단계: 각 앱을 재시작하고 처음 호출 시 TradingView 로그인 창을 승인하세요" -ForegroundColor Cyan
  }
}
