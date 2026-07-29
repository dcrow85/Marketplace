# Cairn agent backend — the browse API for the off-Mac deploy (Railway / Fly / Render / any container host).
# Pure-stdlib Python; calls a HOSTED model (DeepInfra) configured entirely via env. No build dependencies.
#
# Required runtime env (set in the host dashboard — NEVER baked into the image):
#   CAIRN_MODEL_ENDPOINT   https://api.deepinfra.com/v1/openai/chat/completions
#   CAIRN_MODEL_ID         Qwen/Qwen3.6-35B-A3B
#   CAIRN_MODEL_API_KEY    <DeepInfra key>
#   CAIRN_ALLOW_ORIGIN     https://cairn.cards         # the frontend origin, for CORS
#   CAIRN_DEMO_PASSWORD    <optional>                  # if set, re-enables the HTTP Basic gate
# NOTE: the split deploy gates the APP at Privy login; the API is open behind CORS (a
# cross-origin fetch can't satisfy HTTP Basic). To re-gate, add --require-auth + the password env.
FROM python:3.12-slim
WORKDIR /app
COPY simulations/ ./simulations/
COPY mockups/catalog-sample.json ./mockups/catalog-sample.json
COPY web/public/catalogs/azuki-tcg.json ./web/public/catalogs/azuki-tcg.json
COPY web/public/catalogs/vintage-pokemon.json ./web/public/catalogs/vintage-pokemon.json
# Host provides $PORT; bind 0.0.0.0.
CMD ["sh", "-c", "python3 simulations/cairn_browse_server.py --host 0.0.0.0 --port ${PORT:-8788}"]
