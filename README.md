# Crypto Leverage Arbitrage Algorithm

Systematic trading signal engine that segments 10,000+ tokens into six market-cap tiers and models **lagged price propagation from BTC/ETH into lower tiers** to surface statistically-driven long/short setups on perpetual futures — with volatility-adjusted position sizing, a risk score, and explicit entry/exit/stop-loss levels for every signal.

**Live demo:** _add your deployed URL here once live_
**Stack:** TypeScript · React · Node/Express · WebSockets · CoinGecko API · (optional) Gemini for the AI research assistant

---

## What it does

Retail-dominated crypto markets exhibit delayed price discovery: large caps (BTC, ETH) move first, and that momentum cascades down through progressively smaller, less liquid tiers with a lag and a decay in magnitude. This project:

1. **Tiers the market** — every tracked token is bucketed by market cap into 6 tiers (Mega → Micro), the same structure used across the UI (large-cap "indices" like BTC/ETH/SOL at the top, down through mid tier names like ZEC, and long-tail micro caps at the bottom).
2. **Models the cascade** — computes BTC/ETH's live 24h momentum (the "leader signal") and multiplies it through a chain of historical tier-to-tier correlation coefficients to get an *expected propagated move* for every other tier.
3. **Spots laggards** — for each token, compares its actual move to (a) its own tier's average and (b) the BTC/ETH-implied propagated move. A large gap in either means the token hasn't caught up (or caught down) yet.
4. **Scores risk** — blends volatility, volume/liquidity, cross-tier correlation breakdown, and trend-alignment risk into a single 0–100 risk score per signal.
5. **Generates a trade plan** — risk score → leverage recommendation, confidence-weighted long/short direction, entry price band, profit target, and stop-loss, all human-readable.
6. **Streams it live** — a WebSocket feed pushes updated tiers/opportunities/correlations to the dashboard every few seconds, backed by real CoinGecko market data refreshed on an interval.

> ⚠️ **Educational project.** This is a research/portfolio tool, not financial advice. Signals are generated from public market data using a heuristic statistical model — always do your own risk management before trading leveraged perpetuals.

## The core algorithm

`server/services/opportunityService.ts` is the engine. The key idea, condensed:

```text
leaderMomentum          = avg(24h % change of BTC, ETH)
propagationFactor(tier) = Π(historical tier-to-tier correlation) from Mega down to `tier`
expectedMove(token)     = leaderMomentum × propagationFactor(token.tier)
lagGap(token)           = expectedMove(token) − token.actual24hChange

# A large |lagGap|, especially reinforced by within-tier deviation, => laggard
confidence  = f(tierDeviation, lagGap, agreement-between-signals) − riskPenalty
riskScore   = avg(volatilityRisk, correlationRisk, volumeRisk, trendRisk)
leverage    = g(riskScore)          # e.g. 2x–10x
direction   = long if lagGap > 0 (hasn't caught up to an up-move) else short
```

Every generated opportunity includes the full breakdown (`leaderMomentum`, `propagationFactor`, `expectedPropagatedMove`, `lagGap`, `laggardScore`) alongside a plain-English explanation, strategy note, entry price, exit target, and stop-loss — see `analyzeIndividualOpportunity`.

### Market-cap tiers

| Tier | Market Cap | Example |
|---|---|---|
| Mega | $100B+ | BTC, ETH |
| Large | $10B–$100B | SOL, BNB, XRP |
| Large-Medium | $5B–$10B | LINK, UNI |
| Small-Medium | $1B–$5B | HYPE-class mid tier |
| Small | $100M–$1B | ZEC-class small cap |
| Micro | $10M–$100M | long-tail speculative tokens |

## Architecture

```
client/   React + TypeScript dashboard (Vite, Tailwind, shadcn/ui, Chart.js/Recharts)
server/   Express API + WebSocket server (Node/TypeScript)
  services/
    cryptoService.ts        CoinGecko ingestion, rate limiting, tiering
    opportunityService.ts   The lag-propagation + risk-scoring algorithm
    tradingExpertService.ts Optional AI research assistant (Gemini, with a
                             rule-based fallback so it always works offline)
  storage.ts                 In-memory data store (no DB required to run)
shared/schema.ts              Shared types/Zod schemas (Drizzle-ready if you
                               want to swap in Postgres for persistence)
```

No database is required to run this in production — market data and signals live in memory and refresh automatically every 2 minutes from CoinGecko. A Postgres/Drizzle layer is scaffolded (`shared/schema.ts`, `drizzle.config.ts`) if you want durable history.

## Running locally

```bash
git clone https://github.com/kailenvyas121/Claude-Replit-Cursor-Krypto-Leverage-framework.git
cd Claude-Replit-Cursor-Krypto-Leverage-framework
npm install
npm run dev        # http://localhost:5000 (or PORT env var)
```

No API keys are required to run it — CoinGecko's public tier is used by default, and the AI assistant falls back to a rule-based analyst if `GEMINI_API_KEY` isn't set.

Optional environment variables:

| Var | Purpose |
|---|---|
| `PORT` | Port to bind (defaults to 5000; hosting platforms set this automatically) |
| `COINGECKO_API_KEY` | Higher rate limits on CoinGecko |
| `GEMINI_API_KEY` | Enables the AI-powered "Chips" trading assistant chat |
| `DATABASE_URL` | Only needed if you wire up the optional Postgres persistence layer |

## Deploying

This is a single Node process (serves the API, WebSocket, and the built frontend on one port), which makes it a good fit for any always-on Node host:

```bash
npm run build   # builds client (Vite) + bundles server (esbuild)
npm run start   # NODE_ENV=production node dist/index.js
```

Included `render.yaml` lets you deploy straight to [Render](https://render.com) with one click (Web Service → build `npm run build`, start `npm run start`). Any platform that runs a persistent Node process (Railway, Fly.io, a VPS, etc.) works the same way — just avoid classic serverless/edge functions, since the app relies on a long-lived WebSocket connection and an in-process polling interval.

## Roadmap

- **AI interpretability layer** (in progress) — real-time interrogation of each signal's assumptions, drivers, and regime fit, so every long/short call comes with a "why" you can question.
- Swap the static tier-correlation table for a rolling, empirically re-estimated correlation matrix.
- Persist signal history to Postgres to backtest hit rate / expectancy over time.

## Disclaimer

This project is for educational and portfolio purposes only. Nothing here is investment advice. Perpetual futures are highly leveraged, high-risk instruments — trade at your own risk.
