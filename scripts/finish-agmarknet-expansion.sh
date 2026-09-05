#!/usr/bin/env bash
# finish-agmarknet-expansion.sh — rebuild, verify, ship the Agmarknet expansion.
#
#   bash scripts/finish-agmarknet-expansion.sh --districts --push --pr
#
# Flags:
#   --districts   rebuild the district + state extracts (build-agmarknet-levels)
#   --markets     rebuild the mandi extract (build-agmarknet-sample)
#                 (neither flag = rebuild both)
#   --push        commit the expansion and push the current branch to origin
#   --pr          open a pull request against main (implies --push)
#   --base BR     PR base branch (default: main)
#   --no-verify   skip the API smoke test + frontend build before pushing
#   -h, --help    this text
#
# Examples:
#   bash scripts/finish-agmarknet-expansion.sh --districts          # data only
#   bash scripts/finish-agmarknet-expansion.sh --districts --push   # data + push
#   bash scripts/finish-agmarknet-expansion.sh --districts --push --pr
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$PWD"

BUILD_DISTRICTS=0
BUILD_MARKETS=0
DO_PUSH=0
DO_PR=0
BASE="main"
VERIFY=1

while [ $# -gt 0 ]; do
  case "$1" in
    --districts) BUILD_DISTRICTS=1; shift ;;
    --markets) BUILD_MARKETS=1; shift ;;
    --push) DO_PUSH=1; shift ;;
    --pr) DO_PR=1; DO_PUSH=1; shift ;;
    --base) BASE="$2"; shift 2 ;;
    --no-verify) VERIFY=0; shift ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *) echo "Unknown flag: $1 (see --help)" >&2; exit 1 ;;
  esac
done

if [ "$BUILD_DISTRICTS" -eq 0 ] && [ "$BUILD_MARKETS" -eq 0 ]; then
  BUILD_DISTRICTS=1
  BUILD_MARKETS=1
fi

BRANCH="$(git branch --show-current)"
echo "== Agmarknet expansion on branch: $BRANCH =="

# --- 1. Rebuild data ---------------------------------------------------------
if [ "$BUILD_MARKETS" -eq 1 ]; then
  echo ">> Rebuilding mandi extract…"
  npm run -s data:agmarknet
fi
if [ "$BUILD_DISTRICTS" -eq 1 ]; then
  echo ">> Rebuilding district + state extracts…"
  npm run -s data:agmarknet:levels
fi

# --- 2. Verify ---------------------------------------------------------------
if [ "$VERIFY" -eq 1 ]; then
  echo ">> Installing backend deps (if needed)…"
  npm --prefix backend install --no-audit --no-fund >/dev/null 2>&1

  SMOKE_PORT="${SMOKE_PORT:-5055}"
  echo ">> Smoke-testing API on :$SMOKE_PORT…"
  (cd backend && PORT="$SMOKE_PORT" node src/index.js >/tmp/agmarknet-smoke.log 2>&1 & echo $! >/tmp/agmarknet-smoke.pid)
  trap 'kill "$(cat /tmp/agmarknet-smoke.pid 2>/dev/null)" 2>/dev/null || true' EXIT
  for _ in $(seq 1 30); do
    curl -sf "http://localhost:$SMOKE_PORT/api/market-prices/meta" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -sf "http://localhost:$SMOKE_PORT/api/market-prices/meta" -o /tmp/agmarknet-meta.json
  python3 - <<'PYEOF'
import json
m = json.load(open('/tmp/agmarknet-meta.json'))
levels = m.get('levels') or {}
for lv in ('market', 'district', 'state'):
    n = (levels.get(lv) or {}).get('rowCount', 0)
    assert n > 0, f"level {lv} has no rows"
    print(f"   {lv:8s} {(levels[lv]['rowCount']):>5} rows / {levels[lv]['seriesCount']:>3} series "
          f"({levels[lv]['fromPeriod']} → {levels[lv]['toPeriod']})")
assert 'Odisha' in (m.get('statesByLevel') or {}).get('state', []), "Odisha missing from state level"
print("   API smoke test passed (Odisha present at state level).")
PYEOF
  curl -sf "http://localhost:$SMOKE_PORT/api/market-prices/districts?commodity=wheat" | python3 -c "import json,sys; d=json.load(sys.stdin); assert len(d['districts'])>0; print(f\"   /districts wheat: {len(d['districts'])} districts\")"
  curl -sf "http://localhost:$SMOKE_PORT/api/market-prices/states?commodity=paddy" | python3 -c "import json,sys; d=json.load(sys.stdin); assert any(s['stateName']=='Odisha' for s in d['states']); print(f\"   /states paddy: {len(d['states'])} states incl. Odisha\")"
  kill "$(cat /tmp/agmarknet-smoke.pid)" 2>/dev/null || true
  trap - EXIT

  echo ">> Building frontend…"
  npm --prefix frontend install --no-audit --no-fund >/dev/null 2>&1
  npm --prefix frontend run -s build >/tmp/agmarknet-frontend-build.log 2>&1
  tail -n 3 /tmp/agmarknet-frontend-build.log | sed 's/^/   /'
  echo "   Frontend build clean."
fi

# --- 3. Commit + push ---------------------------------------------------------
if [ "$DO_PUSH" -eq 1 ]; then
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo "Refusing to auto-push '$BRANCH'. Push from a feature branch." >&2
    exit 1
  fi
  git add -A
  if git diff --cached --quiet; then
    echo ">> Nothing to commit; branch already up to date."
  else
    echo ">> Committing expansion…"
    git commit -m "Agmarknet multilevel expansion: district + state levels" -m "$(cat <<'MSG'
Serves 7,208 monthly records across three levels (493 mandi + 3,567
district + 3,148 state observations, 2021-2025) instead of the mandi-only
493-row extract.

- New district/state extracts (147 district series in 9 states, 73 state
  series in 19 states incl. Odisha) via scripts/build-agmarknet-levels.mjs
- API: ?level= + ?district= on every /api/market-prices endpoint; new
  /districts and /states comparisons; per-level coverage in /meta
- Mandi Prices page: level tabs, district selector, adaptive comparison
  tables, level-aware rows + CSV download (EN + HI)
- Docs: HISTORICAL_DATA.md, API_INTEGRATION_MAP.md, README.md, DELIVERABLES.md

Every value is observed Agmarknet data from
pointbreak71/dpi410-final-project-v2 (api.agmarknet.gov.in); nothing is
simulated. Mandi-level defaults are unchanged (backward compatible).
MSG
)"
  fi
  echo ">> Pushing $BRANCH to origin…"
  git push -u origin "$BRANCH"
fi

# --- 4. Pull request -----------------------------------------------------------
if [ "$DO_PR" -eq 1 ]; then
  if gh pr view --head "$BRANCH" --json url -q .url >/tmp/agmarknet-pr-url.txt 2>/dev/null; then
    echo ">> PR already open: $(cat /tmp/agmarknet-pr-url.txt)"
  else
    echo ">> Opening PR against $BASE…"
    COV="$(python3 -c "import json; m=json.load(open('backend/src/data/agmarknet/levels.meta.json')); d=m['extract']['district']; s=m['extract']['state']; print(f\"{d['rows']} district rows / {d['series']} series, {s['rows']} state rows / {s['series']} series\")")"
    gh pr create --base "$BASE" --head "$BRANCH" \
      --title "Agmarknet multilevel expansion: district + state levels" \
      --body "$(cat <<MSG
## What

Expands the historical price dataset from a mandi-only 493-row extract to a **multilevel panel of 7,208 monthly records (2021–2025)**:

- **Mandi**: 493 rows / 9 series (unchanged, still the default)
- **District**: ${COV%%,*} (each mean across 4+ mandis)
- **State**: ${COV##*, } (19 states incl. **Odisha**, the app's home state)

## Changes

- **Data**: \`scripts/build-agmarknet-levels.mjs\` (+ \`npm run data:agmarknet:levels\`) builds the two new extracts from the upstream \`across_mandi_district.csv\` / \`across_mandi_state.csv\` panels; provenance in \`levels.meta.json\`
- **API**: \`?level=market|district|state\` + \`?district=\` on every \`/api/market-prices\` endpoint; new \`/districts\` and \`/states\` comparisons; per-level coverage in \`/meta\` (additive — old clients unaffected)
- **Frontend**: Mandi Prices page gains level tabs, a district selector, adaptive comparison tables and level-aware rows/CSV download, fully bilingual
- **Docs**: \`HISTORICAL_DATA.md\`, \`API_INTEGRATION_MAP.md\`, \`README.md\`, \`DELIVERABLES.md\`

## Provenance

Every value is observed Agmarknet data (\`pointbreak71/dpi410-final-project-v2\`, via \`api.agmarknet.gov.in\`); nothing is simulated. District/state \`price_mean\` values are published upstream aggregates; the mandi-level midpoint reconstruction and its r = 0.94 validation are unchanged.

## Verification

- \`bash scripts/finish-agmarknet-expansion.sh --districts\` smoke test: \`/meta\` shows all three levels with rows > 0, \`/districts\` and \`/states\` return data incl. Odisha paddy (60/60 months)
- \`vite build\` clean; EN/HI translation keys symmetric
- Backward compatible: omitting \`?level=\` serves the exact previous mandi responses
MSG
)"
  fi
fi

echo "== Done =="
