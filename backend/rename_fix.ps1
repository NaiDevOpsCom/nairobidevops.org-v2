# Run from backend/ — fixes every case-mismatched file flagged by composer install.
# Two-step rename is required: Windows/NTFS treats a case-only rename as a no-op
# on a single Rename-Item call, so each file goes through a temp name first.

$renames = @(
    @{ Path = 'src\Normalizer\Remotivenormalizer.php';        New = 'RemotiveNormalizer.php' },
    @{ Path = 'tests\Normalizer\Remotivenormalizertest.php';  New = 'RemotiveNormalizerTest.php' },
    @{ Path = 'tests\Normalizer\Wweremotenormalizertest.php'; New = 'WweRemoteNormalizerTest.php' },
    @{ Path = 'tests\Fetcher\Wweremotefetchertest.php';       New = 'WweRemoteFetcherTest.php' }
)

foreach ($r in $renames) {
    if (Test-Path $r.Path) {
        $tmp = $r.Path + '.tmp'
        Rename-Item -Path $r.Path -NewName (Split-Path $tmp -Leaf)
        Rename-Item -Path (Join-Path (Split-Path $r.Path) (Split-Path $tmp -Leaf)) -NewName $r.New
        Write-Host "Fixed: $($r.Path) -> $($r.New)"
    } else {
        Write-Host "Not found (check path): $($r.Path)"
    }
}
