param([Parameter(Mandatory=$true)][string]$PlantUmlJar)
$ErrorActionPreference = 'Stop'
$jar = (Resolve-Path -LiteralPath $PlantUmlJar).Path
$sources = @('class-diagram','deployment-diagram') | ForEach-Object { Join-Path $PSScriptRoot ($_ + '.puml') }
& java -jar $jar -checkonly @sources
if ($LASTEXITCODE -ne 0) { throw 'PlantUML syntax check failed' }
foreach ($format in 'svg','png') {
    & java -jar $jar "-t$format" @sources
    if ($LASTEXITCODE -ne 0) { throw "PlantUML $format rendering failed" }
}
foreach ($source in $sources) {
    $svgPath = [IO.Path]::ChangeExtension($source, 'svg')
    [xml]$svg = Get-Content -LiteralPath $svgPath -Raw
    if ($svg.DocumentElement.LocalName -ne 'svg') { throw "Invalid SVG: $svgPath" }
    $pngPath = [IO.Path]::ChangeExtension($source, 'png')
    $bytes = [IO.File]::ReadAllBytes($pngPath)
    if ($bytes.Length -lt 24 -or [BitConverter]::ToString($bytes[0..7]) -ne '89-50-4E-47-0D-0A-1A-0A') { throw "Invalid PNG: $pngPath" }
    Write-Output ((Split-Path $source -Leaf) + ': syntax, SVG XML and PNG signature passed. Visually inspect both exports after edits.')
}
