#!/bin/sh
# Build the Cairn web app and (re)deploy it behind the launchd browse server on cairn.cards.
# The production browse service (cards.cairn.browse) already serves web/dist with
# --static-dir + --require-auth; this rebuilds, re-links live data, and restarts it.
set -e
ROOT="/Users/che/Marketplace"

npm --prefix "$ROOT/web" run build

# vite empties dist/ on each build, so re-link the live catalog + card images back in
ln -sfn "$ROOT/mockups/catalog-sample.json" "$ROOT/web/dist/catalog-sample.json"
mkdir -p "$ROOT/web/dist/assets"
ln -sfn "$ROOT/mockups/assets/cards" "$ROOT/web/dist/assets/cards"

launchctl kickstart -k "gui/$(id -u)/cards.cairn.browse"
echo "deployed → https://cairn.cards"
