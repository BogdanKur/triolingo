param(
    [string]$SourceMarkdown = "C:\Users\banan\Desktop\triolingo\docs\triolingo_diagrams_fixed_source.md",
    [string]$TemplateDocx = "C:\Users\banan\Desktop\triolingo\.tmp_diagrams.docx",
    [string]$OutputDocx = "C:\Users\banan\Downloads\Triolingo_State_Diagrams_MVP_CODE_FIXED.docx"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SourceMarkdown)) {
    throw "Source markdown not found: $SourceMarkdown"
}

if (-not (Test-Path -LiteralPath $TemplateDocx)) {
    throw "Template DOCX not found: $TemplateDocx"
}

Copy-Item -LiteralPath $TemplateDocx -Destination $OutputDocx -Force

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($OutputDocx, [System.IO.Compression.ZipArchiveMode]::Update)
$documentEntry = $zip.GetEntry("word/document.xml")
if ($null -eq $documentEntry) {
    $zip.Dispose()
    throw "word/document.xml not found inside template docx"
}

$reader = New-Object System.IO.StreamReader($documentEntry.Open())
$documentXmlRaw = $reader.ReadToEnd()
$reader.Close()

[xml]$xmlDoc = $documentXmlRaw
$wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
$xmlNs = "http://www.w3.org/XML/1998/namespace"

$nsManager = New-Object System.Xml.XmlNamespaceManager($xmlDoc.NameTable)
$nsManager.AddNamespace("w", $wNs)

$body = $xmlDoc.SelectSingleNode("//w:body", $nsManager)
if ($null -eq $body) {
    throw "Cannot locate w:body in document.xml"
}

$sectPr = $body.SelectSingleNode("w:sectPr", $nsManager)

$childrenToRemove = @()
foreach ($child in $body.ChildNodes) {
    if ($child.Name -ne "w:sectPr") {
        $childrenToRemove += $child
    }
}

foreach ($child in $childrenToRemove) {
    [void]$body.RemoveChild($child)
}

$lines = Get-Content -LiteralPath $SourceMarkdown -Encoding UTF8

foreach ($line in $lines) {
    $p = $xmlDoc.CreateElement("w", "p", $wNs)

    if ($line.Length -gt 0) {
        $r = $xmlDoc.CreateElement("w", "r", $wNs)
        $t = $xmlDoc.CreateElement("w", "t", $wNs)
        [void]$t.SetAttribute("space", $xmlNs, "preserve")
        $t.InnerText = $line
        [void]$r.AppendChild($t)
        [void]$p.AppendChild($r)
    }

    if ($null -ne $sectPr) {
        [void]$body.InsertBefore($p, $sectPr)
    } else {
        [void]$body.AppendChild($p)
    }
}

$writerSettings = New-Object System.Xml.XmlWriterSettings
$writerSettings.Encoding = New-Object System.Text.UTF8Encoding($false)
$writerSettings.Indent = $false

$declaration = $xmlDoc.FirstChild
if ($declaration -is [System.Xml.XmlDeclaration]) {
    $declaration.Encoding = "utf-8"
}

$memory = New-Object System.IO.MemoryStream
$writer = [System.Xml.XmlWriter]::Create($memory, $writerSettings)
$xmlDoc.Save($writer)
$writer.Close()
$bytes = $memory.ToArray()

$documentEntry.Delete()
$newDocumentEntry = $zip.CreateEntry("word/document.xml")
$entryStream = $newDocumentEntry.Open()
$entryStream.Write($bytes, 0, $bytes.Length)
$entryStream.Close()
$zip.Dispose()

Write-Output "DONE: $OutputDocx"
