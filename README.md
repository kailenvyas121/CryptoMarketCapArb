# CryptoMarketCapArb

[![CI](https://github.com/kailenvyas121/CryptoMarketCapArb/actions/workflows/ci.yml/badge.svg)](https://github.com/kailenvyas121/CryptoMarketCapArb/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Live dashboard that segments the crypto market into six market-cap tiers, models **lagged price propagation from BTC/ETH into lower tiers**, and scores **long/short perpetual-futures setups** with a risk score plus explicit entry, exit, and stop-loss.

```bash
npm install && npm run verify-math && npm run dev
```

`verify-math` re-runs every identity in this README against `shared/propagation.ts` (the production math module) so the write-up cannot drift from the engine. No API key is required — CoinGecko's public market endpoint is the default, and the optional AI assistant falls back to a rule-based analyst if `GEMINI_API_KEY` isn't set.

Open **http://localhost:5000**. macOS AirPlay often occupies 5000; if so, `PORT=5050 npm run dev`.

> Educational / portfolio project, not financial advice. Signals are heuristic and generated from public 24h market data. Perpetual futures are highly leveraged — treat every number as a research output, not an order.

## The thesis

Price discovery in crypto is not simultaneous. BTC and ETH move first. That momentum then cascades down through progressively smaller, less liquid tiers — SOL and other large caps next, then names like HYPE / ZEC, then the long tail — with a **delay** and a **decay in magnitude**.

The tradable object is the residual: a token whose 24h return has not yet printed the move that BTC/ETH-led propagation implies for its tier. Long the underperformer, short the outperformer, size by risk, exit as the residual closes.

## Market-cap tiers

| Tier | Market cap | Role in the cascade | Examples |
|---|---|---|---|
| Mega | $100B+ | Leaders. BTC / ETH *are* the signal, not the trade. | BTC, ETH |
| Large | $10B–$100B | First followers. | SOL, BNB, XRP |
| Large-Medium | $5B–$10B | Established names. | LINK, UNI |
| Small-Medium | $1B–$5B | Second-tier liquid perps. | HYPE-class |
| Small | $100M–$1B | Higher-beta catch-up names. | ZEC-class |
| Micro | $10M–$100M | Long-tail / speculative. Highest lag, highest risk. | — |

Assignment is deterministic in `cryptoService.determineMarketCapTier`.

## Methodology

All production formulas live in [`shared/propagation.ts`](shared/propagation.ts) and are consumed by [`server/services/opportunityService.ts`](server/services/opportunityService.ts). CI runs `npm run verify-math` on every push.

### 1. Leader momentum

Let \(r_i\) be token \(i\)'s CoinGecko 24h percent change. The leader signal is the equal-weight average of BTC and ETH (falls back to the mega-tier average if either is missing):

\[
L \;=\; \frac{r_{\mathrm{BTC}} + r_{\mathrm{ETH}}}{2}
\]

This is the impulse the rest of the market is expected to absorb.

### 2. Cascade / propagation factor

Each tier \(k\) has an adjacent-tier correlation \(\rho_k\) (static, historically typical 24h values — see [Known limitations](#known-limitations)):

| Step | \(\rho_k\) |
|---|---|
| Mega | \(1\) (identity — the leaders *are* \(L\)) |
| Large | \(0.94\) |
| Large-Medium | \(0.87\) |
| Small-Medium | \(0.72\) |
| Small | \(0.58\) |
| Micro | \(0.23\) |

The **cumulative propagation factor** \(\varphi(k)\) is the product of every step from Mega down to \(k\):

\[
\varphi(k) \;=\; \prod_{j=1}^{k} \rho_j
\]

which evaluates to:

| Tier \(k\) | \(\varphi(k)\) |
|---|---|
| Mega | \(1.000000\) |
| Large | \(0.940000\) |
| Large-Medium | \(0.817800\) |
| Small-Medium | \(0.588816\) |
| Small | \(0.341513\) |
| Micro | \(0.078548\) |

So a +2% BTC/ETH day is expected to show up as ~+0.68% in the small-cap tier once the cascade has fully propagated, and only ~+0.16% in micro — not because micros "don't move", but because the *leader-correlated* component of their move is that small; the rest is idiosyncratic.

### 3. Expected move and lag gap

For token \(i\) in tier \(k\):

\[
\mathbb{E}[r_i \mid L, k] \;=\; L \cdot \varphi(k)
\]

\[
g_i \;=\; \mathbb{E}[r_i \mid L, k] \;-\; r_i
\]

\(g_i\) is the **lag gap**.

- \(g_i > 0\) \(\Rightarrow\) actual return is below the leader-implied expected return \(\Rightarrow\) **long** (underperformed the cascade; residual should close upward).
- \(g_i < 0\) \(\Rightarrow\) actual return is above the expected return \(\Rightarrow\) **short**.

Direction is `isLongSetup`: if \(|g_i| > 0.5\) use \(\mathrm{sign}(g_i)\); otherwise fall back to within-tier mean reversion (\(r_i < \bar{r}_k\) \(\Rightarrow\) long). The dashboard's `opportunityType`, strategy text, and entry price all share this function — they cannot disagree.

### 4. When a signal fires

Two independent triggers; either is enough:

1. **Within-tier deviation.** Let \(\bar{r}_k\) be the equal-weight 24h mean of tier \(k\), and \(d_i = |r_i - \bar{r}_k|\). Fire if \(d_i > 2\).
2. **Propagation laggard.** Fire if \(|L| > 0.5\) and

\[
|g_i| \;>\; \max\!\big(0.75,\; 0.4 \cdot |\mathbb{E}[r_i]|\big)
\]

i.e. the residual is large both in absolute terms and relative to the move the model expected.

A signal is then kept only if confidence \(> 60\) (below).

### 5. Risk score

Four components, equal-weighted, each on \([0, 100]\):

\[
R_i \;=\; \frac{R^{\mathrm{vol}}_i + R^{\mathrm{corr}}_i + R^{\mathrm{liq}}_i + R^{\mathrm{trend}}_i}{4}
\]

| Component | Formula |
|---|---|
| Volatility \(R^{\mathrm{vol}}\) | Tier lookup: mega 15, large 25, large-medium 35, small-medium 45, small 55, micro 75. |
| Correlation \(R^{\mathrm{corr}}\) | \(\min(100,\, 5 \cdot d_i)\) — larger within-tier deviation is treated as higher correlation-breakdown risk. |
| Liquidity \(R^{\mathrm{liq}}\) | Let \(v = V_{24h} / \mathrm{mcap}\). \(v < 0.005 \Rightarrow 80\) (too thin); \(v > 0.5 \Rightarrow 70\) (manipulation-like turnover); otherwise \(\max(10,\, 50 - 200v)\). |
| Trend \(R^{\mathrm{trend}}\) | \(\min(100,\, 3 \cdot |r_i - \bar{r}_{\mathrm{mkt}}|)\) — fighting the whole-universe average is more expensive. |

Mapped to a label and a perp leverage band:

| \(R_i\) | Label | Leverage |
|---|---|---|
| \(\le 30\) | low | 5–7x if \(R_i > 20\), else 8–10x |
| \(\le 60\) | medium | 3–5x if \(R_i > 35\), else 5–7x |
| \(> 60\) | high | 2–3x |

(The 20 / 35 / 50 cut-points are in `recommendLeverage`. Worked example below lands at \(R = 25\) → **low, 5–7x**.)

### 6. Confidence

Two scaled magnitudes, then a penalty for risk:

\[
\sigma(x, n) \;=\; \min\!\Big(5,\; \frac{|x|}{10}\sqrt{n}\Big)
\]

This is **not** a formal z-test. It is a sample-size-adjusted magnitude, capped at 5, so a 3% dislocation in a 200-name tier scores higher than the same dislocation in a 4-name tier. Do not read it as a p-value.

\[
C^{\mathrm{tier}} \;=\; 10\, d_i + 15\, \sigma(d_i, n_k)
\]

\[
C^{\mathrm{lag}} \;=\; 8\, |g_i| + 15\, \ell_i, \qquad
\ell_i \;=\; \min\!\Big(3,\; \frac{|g_i|}{|\mathbb{E}[r_i]|}\Big) \text{ if } |\mathbb{E}[r_i]| > 0.1 \text{ else } 0
\]

\(\ell_i\) (laggard score) is how many "expected moves" the residual is. ~0 = fully caught up; ≥1 = hasn't printed the cascade yet.

\[
C_i \;=\; \max\!\big(0,\; \min(95,\; \max(C^{\mathrm{tier}}, C^{\mathrm{lag}}) + 10 \cdot \mathbf{1}_{\mathrm{agree}}) - 0.5\, R_i\big)
\]

\(\mathbf{1}_{\mathrm{agree}}\) is 1 when the within-tier signal and the lag-gap signal point the same way (\(\mathrm{sign}(r_i - \bar{r}_k) = \mathrm{sign}(-g_i)\)).

### 7. Entry, expected return, stop

Let \(P\) be the live CoinGecko price.

- **Entry:** \(0.98P\) on a long (limit on dip), \(1.02P\) on a short (limit on bounce).
- **Expected return / exit** — 60% of the dominant dislocation, haircut by remaining risk budget:

\[
\pi_i \;=\; \max(d_i, |g_i|) \cdot 0.6 \cdot \frac{100 - R_i}{100}
\]

The `expectedReturn` field on the opportunity and the exit-target string are the **same** \(\pi_i\). They cannot disagree.

- **Stop:** \(\max(3,\, 0.15\, R_i)\) percent.

`historicalSuccessRate` in the payload is \( \max(30,\, 95 - 0.8 R_i) \). It is an inverse function of risk, **not** an empirical win rate.

## Worked example

Small-cap token, BTC/ETH day of \(L = +2.00\%\), token printed \(r = -0.50\%\), its tier averaged \(\bar{r}_k = +0.80\%\), universe averaged \(+1.00\%\), \(V/\mathrm{mcap} = 0.08\), \(n_k = 200\).

\[
\varphi(\mathrm{small}) \;=\; 0.94 \times 0.87 \times 0.72 \times 0.58 \;=\; 0.341513
\]

\[
\mathbb{E}[r] \;=\; 2.00 \times 0.341513 \;=\; 0.6830\%
\]

\[
g \;=\; 0.6830 - (-0.50) \;=\; +1.1830\% \quad \Rightarrow \quad \textbf{LONG}
\]

\[
d \;=\; |-0.50 - 0.80| \;=\; 1.30
\]

\[
R^{\mathrm{vol}}=55,\;
R^{\mathrm{corr}}=6.5,\;
R^{\mathrm{liq}}=34,\;
R^{\mathrm{trend}}=4.5
\quad\Rightarrow\quad R = 25 \;\Rightarrow\; \text{low, 5–7x}
\]

\[
\pi \;=\; \max(1.30,\, 1.1830) \times 0.6 \times 0.75 \;=\; 0.5850\%
\]

\[
\mathrm{stop} \;=\; \max(3,\, 0.15 \times 25) \;=\; 3.75\%
\]

Re-run this exact example with:

```bash
npm run verify-math
```

If any identity above drifts from `shared/propagation.ts`, CI fails.

## Setup

```bash
git clone https://github.com/kailenvyas121/CryptoMarketCapArb.git
cd CryptoMarketCapArb
npm install
npm run verify-math
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
shared/propagation.ts          ← source of truth for φ, g, π, R, leverage
        │
        ▼
opportunityService.ts          triggers, explanations, trade plan
        │
        ├─ REST  /api/cryptocurrencies  /api/opportunities  /api/market/stats
        └─ WebSocket  /ws
                │
                ▼
React dashboard  Signals tab (token, direction, lag gap, entry / exit / stop)
```

```
shared/propagation.ts     cascade math (CI-checked)
shared/schema.ts          shared types
server/services/
  cryptoService.ts        CoinGecko + market-cap tiering
  opportunityService.ts   scoring + trade-plan engine
  tradingExpertService.ts optional Gemini assistant, rule-based fallback
server/storage.ts         in-memory store (Postgres/Drizzle is scaffolded, not required)
scripts/verify-math.ts    README identities vs production math
client/                   React + TypeScript dashboard
```

No database is required. Prices and signals live in memory and refresh on a 2-minute interval.

## Deploying

Single always-on Node process (API + WebSocket + static frontend on one port). Fits Render, Railway, Fly.io, or a VPS — not classic serverless.

`render.yaml` is included. On [Render](https://render.com): New → Web Service → this repo. Build `npm install && npm run build`, start `npm run start`. No env vars required to go live.

## Known limitations

- **24h close-to-close, not tick/perp microstructure.** The original thesis is delayed price discovery on perpetuals; the live engine approximates that with CoinGecko's 24h % change. Intraday lag (minutes, not a day) is not measured yet.
- **\(\rho_k\) is a static table**, not a rolling empirically re-estimated correlation matrix. Directionally right (leaders lead, micro barely follows) but wrong in regime shifts (e.g. a memecoin-only melt-up).
- **\(\sigma(\cdot)\) is not a hypothesis test.** It is a capped, sample-size-scaled magnitude. Do not treat confidence as a calibrated probability.
- **\(\pi_i\) assumes 60% of the residual mean-reverts.** That 0.6 is a modeling choice, not a backtested recovery rate.
- **No exchange execution / no funding-rate input.** Output is a research signal. Binance/Bybit perp availability is assumed, not checked.
- **`historicalSuccessRate` is not a win rate.** It is \(95 - 0.8R_i\).
- **CoinGecko free-tier rate limits.** Without `COINGECKO_API_KEY` the first fetch can be partial; the app falls back to a small in-memory universe and still runs the same engine.

## Roadmap

- [ ] Rolling, empirically re-estimated \(\rho_k\) instead of the static cascade table.
- [ ] Intraday (1h / 4h) leader-lag measurement so the signal matches perp holding periods.
- [ ] Persist signal history and report hit rate / expectancy of \(\pi_i\) over time.
- [ ] AI interpretability layer: interrogate a live signal's assumptions, drivers, and whether the current regime still fits the lag thesis.
- [ ] Filter universe to tokens that actually have a liquid USDT-M perp.

## License

MIT — see [LICENSE](LICENSE).
