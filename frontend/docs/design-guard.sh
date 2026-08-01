#!/usr/bin/env bash
# design-guard.sh — heuristic compact/token guard for the UI Guidelines design system.
# Scans AUTHORED feature code (pages, composite, layout) for anti-patterns
# (R05/R06/R09/R39/R41/R42/R43/R44/R45, 2B.8, 2C.14). Exit 0 = clean, Exit 1 = violations.
# NOTE: responsive layout (R42) is only partially automatable (#10); full sign-off
#       still requires a VISUAL check at mobile 375 / tablet 768 / desktop >=1280.
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

# 7) Leftover console.log/debug/info in authored feature code (logging hygiene).
report "console.log/debug/info tersisa (bersihkan sebelum finish; console.error diizinkan) — logging hygiene" \
  "$(scan '\bconsole\.(log|debug|info)\s*\(')"

# 8) Form field alignment: mixing FormItem layout modes misaligns grid rows.
# Standard: use a plain <FormItem> for every field (Combobox is block-level & w-full).
# Do NOT use `FormItem className="flex flex-col"` — it desyncs label/control height
# against sibling <FormItem> fields in the same grid row (R41).
report "FormItem 'flex flex-col' (pakai <FormItem> polos agar field grid sejajar) — R41" \
  "$(scan 'FormItem className=\"[^\"]*flex flex-col')"

# 9) Verbose '(Optional)/(Opsional)' inside FormLabel → keep labels concise & single-line;
# convey optionality via placeholder so 2-col form rows stay aligned (R41).
report "Label form verbose '(Optional)/(Opsional)' (pakai placeholder; label ringkas 1 baris) — R41" \
  "$(scan 'FormLabel>[^<]*\((Optional|Opsional)\)')"

# 10) Responsive (R42): fixed pixel width >=120px WITHOUT a mobile `w-full` fallback,
# scoped to app/CRUD pages where toolbars/filters live (avoids chart/composite widths).
# Correct pattern: `w-full sm:w-[150px]`. This catches the Audit Log toolbar incident.
APP_DIR="$SRC/pages/app"
scan_app() { grep -rnE "$1" "$APP_DIR" --include=*.jsx 2>/dev/null | grep -vE "$EXCLUDE" | grep -vE '//\s*guard-allow'; }
report "Lebar fiks >=120px tanpa fallback 'w-full' (mobile) di pages/app — R42 responsif; pakai 'w-full sm:w-[Npx]'" \
  "$(scan_app 'className="[^"]*\bw-\[(1[2-9][0-9]|[2-9][0-9]{2}|[0-9]{4,})px\]' | grep -vE 'w-full')"

# 11) Responsive tables (R43): authored feature code must use the shadcn <Table>
# primitive (it wraps content in `overflow-auto` for horizontal scroll on small
# screens). A raw <table> tag bypasses that wrapper and breaks the page layout.
report "Raw <table> di kode fitur (wajib primitive shadcn <Table> agar tabel scroll-x & responsif) — R43" \
  "$(scan '<table[ />>]')"

# 12) Responsive tabs (R44): a TabsList must scroll horizontally on mobile
# (`overflow-x-auto`) instead of wrapping, so tabs never clip/collide on small
# screens. Canonical: `w-full justify-start overflow-x-auto sm:w-auto`.
report "TabsList tanpa 'overflow-x-auto' (wajib scroll-x di mobile; dilarang wrap) — R44" \
  "$(scan '<TabsList\b' | grep -vE 'overflow-x-auto')"

# 13) Typography scale (R45): feature pages (pages/app) must stay dense — no
# oversized headings. Titles use `text-base`; text-xl and larger are forbidden.
report "Teks oversized (text-xl/2xl/3xl/4xl...) di pages/app — R45; judul cukup 'text-base'" \
  "$(scan_app 'text-(xl|[2-9]xl)')"

echo ""
if [ "$fail" -eq 0 ]; then
  echo "✓ design-guard: clean — tidak ada anti-pattern terdeteksi."
else
  echo "✗ design-guard: DITEMUKAN pelanggaran di atas. Perbaiki sebelum finish (R39/2C.14)."
  echo "  (Jika sebuah baris memang disengaja & terdokumentasi, tambahkan '// guard-allow' & catat di Changelog.)"
fi
exit $fail
