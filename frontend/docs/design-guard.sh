#!/usr/bin/env bash
# design-guard.sh — heuristic compact/token guard for the UI Guidelines design system.
# Scans AUTHORED feature code (pages, composite, layout) for anti-patterns
# (R05/R06/R09/R39, 2B.8, 2C.14). Exit 0 = clean, Exit 1 = violations.
# Run BEFORE finishing any UI work.
#
# Scope note:
#   - src/components/ui/*        = official shadcn primitives (protected, NOT edited) → EXCLUDED.
#   - preview/catalog demo files = intentionally render raw examples             → EXCLUDED.
#   Use inline "// guard-allow" to whitelist a deliberate, documented exception.
#
# Usage:  bash frontend/docs/design-guard.sh
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/../src"

# Directories of authored feature code (exclude ui/ primitives).
DIRS="$SRC/pages $SRC/components/composite $SRC/components/layout"

# Exclude demo/catalog files that showcase raw component behavior on purpose.
EXCLUDE='(ComponentsPage|componentPreviews|compositePreviews|AdvancedPreviews)'

scan() { grep -rnE "$1" $DIRS --include=*.jsx 2>/dev/null | grep -vE "$EXCLUDE" | grep -vE '//\s*guard-allow'; }

fail=0
report() {
  if [ -n "$2" ]; then
    fail=1
    echo ""
    echo "✗ $1"
    echo "$2" | sed 's/^/    /'
  fi
}

# 1) space-y-6+ inside Card sections → must be space-y-5 / space-y-4 (the recurring bug).
report "space-y-6+ di dalam Card section (harus space-y-5/space-y-4) — 2B.8 / R39" \
  "$(scan 'Card(Header|Content|Footer)[^>]*className=\"[^\"]*space-y-(6|7|8)')"

# 2) Hardcoded Tailwind colors → use semantic tokens (R05/R06).
report "Warna hardcode Tailwind (pakai token: bg-background/text-foreground/…) — R05/R06" \
  "$(scan '\b(bg|text|border|ring|fill|stroke)-(white|black|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3})\b')"

# 3) Hex color literals.
report "Hex color literal (pakai HSL token di index.css) — R05" \
  "$(scan '#[0-9a-fA-F]{3,6}\b')"

# 4) Emoji used as icons → lucide-react only (R09).
m=$(grep -rnP '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}]' $DIRS --include=*.jsx 2>/dev/null | grep -vE "$EXCLUDE")
report "Emoji terdeteksi (ikon wajib lucide-react) — R09" "$m"

# 5) Oversized profile avatar (density) → h-12 w-12.
report "Avatar terlalu besar (pakai h-12 w-12) — R39 density" \
  "$(scan 'Avatar[^>]*className=\"[^\"]*(h-1[6-9]|h-2[0-9]|w-1[6-9]|w-2[0-9])')"

# 6) Off-scale gap-5 (use gap-4 or gap-6).
report "gap-5 off-scale (pakai gap-4/gap-6) — 2B.4 / R39" \
  "$(scan 'className=\"[^\"]*\bgap-5\b')"

echo ""
if [ "$fail" -eq 0 ]; then
  echo "✓ design-guard: clean — tidak ada anti-pattern terdeteksi."
else
  echo "✗ design-guard: DITEMUKAN pelanggaran di atas. Perbaiki sebelum finish (R39/2C.14)."
  echo "  (Jika sebuah baris memang disengaja & terdokumentasi, tambahkan '// guard-allow' & catat di Changelog.)"
fi
exit $fail
