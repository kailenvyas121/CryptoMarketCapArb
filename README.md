# Crypto Leverage Arbitrage Algorithm

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Live dashboard that segments the crypto market into six market-cap tiers, models **lagged price propagation from BTC/ETH into lower tiers**, and scores **long/short perpetual-futures setups** with a risk score plus explicit entry, exit, and stop-loss levels.

```bash
npm install && npm run dev
```

runs immediately after clone. No API key is required — CoinGecko's public market endpoint is used by default, and the optional AI assistant falls back to a rule-based analyst if `GEMINI_API_KEY` isn't set. Open **http://localhost:5000** (macOS AirPlay often occupies 5000; if so, run `PORT=5050 npm run dev`).

> Educational / portfolio project, not financial advice. Signals are heuristic and generated from public 24h market data. Perpetual futures are highly leveraged — treat every number as a research output, not an order.

## The thesis

Price discovery in crypto is not simultaneous. BTC and ETH move first. That momentum then cascades down through progressively smaller, less liquid tiers — SOL and other large caps next, then names like HYPE / ZEC, then the long tail — with a **delay** and a **decay in magnitude**.

The gap between "the leaders already moved" and "this lower-tier token has fully absorbed that move" is the inefficiency this model is built to surface. In a retail-dominated regime that delay is long enough to be tradable on perps. As institutional participation compresses it, the same dashboard still tells you *whether the lag is still there* and how risky a catch-up trade would be.

## What it actually does today

| Claim | Implementation |
|---|---|
| Segment tokens into six market-cap tiers | `server/services/cryptoService.ts` buckets every CoinGecko listing: Mega ($100B+), Large ($10B–$100B), Large-Medium ($5B–$10B), Small-Medium ($1B–$5B), Small ($100M–$1B), Micro ($10M–$100M). |
| Model lagged propagation from BTC/ETH | `server/services/opportunityService.ts` takes live BTC/ETH 24h momentum, multiplies it through a decaying tier-correlation chain, and computes an *expected propagated move* for every other token. |
| Spot laggards | Each token is scored on two independent gaps: (a) vs its own tier average, (b) vs the BTC/ETH-implied expected move (`lagGap`). Either gap can fire a signal; both agreeing raises confidence. |
| Risk score + leverage | Volatility (by tier), volume/liquidity, correlation breakdown, and trend-alignment are averaged into a 0–100 risk score, which maps to a 2x–10x perp leverage band. |
| Entry / exit / stop | Every signal ships a price-level entry, a catch-up profit target, and a volatility-scaled stop-loss, plus a plain-English explanation of *why*. |
| Live dashboard | React UI streams CoinGecko-backed prices over WebSockets and renders the Signals tab with token, direction, lag gap, leader momentum, risk, leverage, and the trade plan. |

### Market-cap tiers

| Tier | Market cap | Role in the cascade |
|---|---|---|
| Mega | $100B+ | Leaders. BTC / ETH are the signal, not the trade. |
| Large | $10B–$100B | First followers (SOL, BNB, XRP). |
| Large-Medium | $5B–$10B | Established names (LINK, UNI). |
| Small-Medium | $1B–$5B | Second-tier liquid perps (HYPE-class). |
| Small | $100M–$1B | Higher-beta catch-up names (ZEC-class). |
| Micro | $10M–$100M | Long-tail / speculative. Highest lag, highest risk. |

## The core algorithm

`server/services/opportunityService.ts` is the engine. Condensed:

```text
leaderMomentum          = avg(24h % change of BTC, ETH)
propagationFactor(tier) = product of historical adjacent-tier correlations
                          from Mega down to this token's tier
expectedMove(token)     = leaderMomentum × propagationFactor(token.tier)
lagGap(token)           = expectedMove(token) − token.actual24hChange

# large |lagGap| (and/or a large within-tier deviation) => laggard
direction   = long  if lagGap > 0   # hasn't caught up to an up-move
            = short if lagGap < 0   # hasn't caught down to a down-move
confidence  = f(tierDeviation, lagGap, signal-agreement) − riskPenalty
riskScore   = avg(volatilityRisk, correlationRisk, volumeRisk, trendRisk)
leverage    = g(riskScore)          # 2–3x ... 8–10x
```

Adjacent-tier correlations currently used (static, historically typical 24h values — see [Known limitations](#known-limitations)):

```
Mega → Large 0.94 → Large-Medium 0.87 → Small-Medium 0.72 → Small 0.58 → Micro 0.23
```

Every generated opportunity includes the full breakdown (`leaderMomentum`, `propagationFactor`, `expectedPropagatedMove`, `lagGap`, `laggardScore`) so a signal can be interrogated, not just taken.

## Setup

```bash
git clone https://github.com/kailenvyas121/crypto-leverage-arbitrage.git
cd crypto-leverage-arbitrage
npm install
npm run dev
```

Optional environment variables (copy `.env.example` → `.env`):

| Var | Purpose |
|---|---|
| `PORT` | Bind port. Defaults to 5000. Hosting platforms inject this. |
| `COINGECKO_API_KEY` | Raises CoinGecko rate limits. Public tier works without it. |
| `GEMINI_API_KEY` | Enables the "Chips" AI research chat. Falls back to a rule-based analyst if unset. |
| `DATABASE_URL` | Only needed if you wire up the optional Postgres persistence layer. The app runs fully in-memory without it. |

```bash
npm run build    # Vite client + esbuild server
npm run start    # NODE_ENV=production node dist/index.js
```

## Architecture

```
CoinGecko /coins/markets
        │  cryptoService.ts  (rate-limited fetch, tier assignment)
        ▼
In-memory store  storage.ts
        │
        ▼
Lag-propagation engine  opportunityService.ts
  BTC/ETH momentum → expected move by tier → lagGap →
  risk score / leverage / entry / exit / stop
        │
        ├─ REST  /api/cryptocurrencies  /api/opportunities  /api/market/stats
        └─ WebSocket  /ws  (live snapshot every few seconds)
                │
                ▼
React dashboard  client/src
  Overview · Signals · Cascade charts · AI chat
```

```
client/                 React + TypeScript dashboard (Vite, Tailwind, shadcn/ui)
server/
  services/
    cryptoService.ts          CoinGecko ingestion + market-cap tiering
    opportunityService.ts     Lag-propagation + risk + trade-plan engine
    tradingExpertService.ts   Optional Gemini assistant, rule-based fallback
  storage.ts                  In-memory store (Postgres/Drizzle is scaffolded, not required)
  routes.ts                   REST + WebSocket + startup/refresh loops
shared/schema.ts              Shared types
```

No database is required to run this. Prices and signals live in memory and refresh on a 2-minute interval. `shared/schema.ts` + `drizzle.config.ts` are there if you want durable history later.

## Deploying

This is a **single always-on Node process** (API + WebSocket + static frontend on one port). That fits Render, Railway, Fly.io, or a VPS — not classic serverless/edge functions.

`render.yaml` is included. On [Render](https://render.com): New → Web Service → this repo. Build `npm install && npm run build`, start `npm run start`. No env vars required to go live.

## Known limitations

- **Propagation uses 24h close-to-close returns, not tick/perp microstructure.** The original thesis is about delayed price discovery on perpetuals; the live engine approximates that with CoinGecko's 24h % change. Intraday lag (minutes, not a day) is not measured yet.
- **Tier-to-tier correlations are a static table**, not a rolling empirically re-estimated matrix. They are directionally right (leaders lead, micro barely follows) but will be wrong in regime shifts (e.g. a memecoin-only melt-up).
- **No exchange execution / no funding-rate input.** Output is a research signal (direction, risk, suggested leverage, levels), not an order. Binance/Bybit perp availability is assumed, not checked.
- **CoinGecko free-tier rate limits.** Without `COINGECKO_API_KEY` the first fetch can be partial; the app falls back to a small in-memory demo universe and still runs the same engine.
- **Confidence is a heuristic**, not a backtested hit rate. `historicalSuccessRate` in the analysis payload is an inverse function of risk, not an empirical win rate.
- **AI chat is optional.** Without `GEMINI_API_KEY` you still get a rule-based market briefing; you do not get LLM-generated commentary.

## Roadmap

- [ ] Rolling, empirically re-estimated correlation matrix instead of the static cascade table.
- [ ] Intraday (1h / 4h) leader-lag measurement so the signal matches perp holding periods.
- [ ] Persist signal history to Postgres and report hit rate / expectancy over time.
- [ ] AI interpretability layer: interrogate a live signal's assumptions, drivers, and whether the current regime still fits the lag thesis.
- [ ] Filter universe to tokens that actually have a liquid USDT-M perp.

## License

MIT — see [LICENSE](LICENSE).
