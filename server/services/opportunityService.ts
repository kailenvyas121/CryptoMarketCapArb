import { Cryptocurrency, InsertTradingOpportunity } from '@shared/schema';
import { CryptoService } from './cryptoService';
import {
  TIER_VOLATILITY_RISK,
  type Tier,
  cumulativePropagationFactor,
  expectedRecovery,
  isLongSetup,
  lagGap as computeLagGap,
  recommendLeverage,
  riskLevel,
  scaledSignificance,
  stopLossPct,
  volumeRisk,
} from '@shared/propagation';

export interface OpportunityAnalysis {
  volatilityRisk: number;
  correlationRisk: number;
  volumeRisk: number;
  trendRisk: number;
  statisticalSignificance: number;
  historicalSuccessRate: number;
  explanation: string;
  strategy: string;
  entryPoint: string;
  exitPoint: string;
  stopLoss: string;
  // Lag-propagation model outputs
  leaderMomentum: number;
  propagationFactor: number;
  expectedPropagatedMove: number;
  lagGap: number;
  laggardScore: number;
}

export class OpportunityService {
  private static instance: OpportunityService;
  private cryptoService = CryptoService.getInstance();

  static getInstance(): OpportunityService {
    if (!OpportunityService.instance) {
      OpportunityService.instance = new OpportunityService();
    }
    return OpportunityService.instance;
  }

  async analyzeOpportunities(cryptocurrencies: Cryptocurrency[]): Promise<InsertTradingOpportunity[]> {
    const opportunities: InsertTradingOpportunity[] = [];
    
    // Group by tier for analysis
    const tierGroups = this.groupByTier(cryptocurrencies);
    
    for (const [tier, coins] of Object.entries(tierGroups)) {
      const tierOpportunities = await this.analyzeTierOpportunities(tier, coins, cryptocurrencies);
      opportunities.push(...tierOpportunities);
    }
    
    return opportunities.sort((a, b) => parseFloat(b.confidence.toString()) - parseFloat(a.confidence.toString()));
  }

  private groupByTier(cryptocurrencies: Cryptocurrency[]): Record<string, Cryptocurrency[]> {
    return cryptocurrencies.reduce((groups, coin) => {
      if (!groups[coin.tier]) {
        groups[coin.tier] = [];
      }
      groups[coin.tier].push(coin);
      return groups;
    }, {} as Record<string, Cryptocurrency[]>);
  }

  private async analyzeTierOpportunities(
    tier: string,
    tierCoins: Cryptocurrency[],
    allCoins: Cryptocurrency[]
  ): Promise<InsertTradingOpportunity[]> {
    const opportunities: InsertTradingOpportunity[] = [];
    
    // Calculate tier average performance
    const tierAvgChange = this.calculateTierAverage(tierCoins);
    
    const leaderMomentum = this.getLeaderMomentum(allCoins);
    const propagationFactor = cumulativePropagationFactor(tier as Tier);
    const expectedPropagatedMove = leaderMomentum * propagationFactor;

    for (const coin of tierCoins) {
      const coinChange = parseFloat(coin.priceChangePercentage24h?.toString() || '0');
      const deviation = Math.abs(coinChange - tierAvgChange);
      // Gap between where BTC/ETH-led propagation implies this coin *should*
      // be trading (given its tier's historical lag correlation) and where
      // it actually is. A large positive gap = the coin hasn't caught up to
      // an up-move yet (long laggard); a large negative gap on a down-move
      // means it hasn't caught down yet (short laggard).
      const lagGap = computeLagGap(expectedPropagatedMove, coinChange);

      // Trigger on either a within-tier deviation OR a meaningful gap versus
      // the BTC/ETH-led propagation model - this is what actually captures
      // "hasn't caught up to the leaders yet" laggards, not just tier noise.
      const isTierDeviant = deviation > 2;
      const isPropagationLaggard = Math.abs(leaderMomentum) > 0.5 && Math.abs(lagGap) > Math.max(0.75, Math.abs(expectedPropagatedMove) * 0.4);

      if (isTierDeviant || isPropagationLaggard) {
        const analysis = await this.analyzeIndividualOpportunity(coin, tierCoins, allCoins, leaderMomentum, propagationFactor, expectedPropagatedMove, lagGap);
        
        if (analysis.confidence > 60) { // Only high confidence opportunities
          const opportunity: InsertTradingOpportunity = {
            cryptocurrencyId: coin.id,
            opportunityType: isLongSetup(coinChange, tierAvgChange, lagGap) ? 'long' : 'short',
            riskLevel: riskLevel(analysis.riskPercentage),
            riskPercentage: analysis.riskPercentage.toString(),
            leverageRecommendation: recommendLeverage(analysis.riskPercentage),
            expectedReturn: expectedRecovery(deviation, lagGap, analysis.riskPercentage).toString(),
            confidence: analysis.confidence.toString(),
            analysis: analysis.analysis,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          };
          
          opportunities.push(opportunity);
        }
      }
    }
    
    return opportunities;
  }

  private calculateTierAverage(coins: Cryptocurrency[]): number {
    if (coins.length === 0) return 0;
    
    const sum = coins.reduce((total, coin) => {
      return total + parseFloat(coin.priceChangePercentage24h?.toString() || '0');
    }, 0);
    
    return sum / coins.length;
  }

  private async analyzeIndividualOpportunity(
    coin: Cryptocurrency,
    tierCoins: Cryptocurrency[],
    allCoins: Cryptocurrency[],
    leaderMomentum: number,
    propagationFactor: number,
    expectedPropagatedMove: number,
    lagGap: number
  ): Promise<{ confidence: number; riskPercentage: number; analysis: OpportunityAnalysis }> {
    const coinChange = parseFloat(coin.priceChangePercentage24h?.toString() || '0');
    const coinVolume = parseFloat(coin.volume24h?.toString() || '0');
    const coinMarketCap = parseFloat(coin.marketCap?.toString() || '0');
    
    // Calculate risk factors
    const volatilityRisk = this.calculateVolatilityRisk(coin, tierCoins);
    const correlationRisk = this.calculateCorrelationRisk(coin, tierCoins);
    const volumeRiskScore = volumeRisk(coinVolume, coinMarketCap);
    const trendRisk = this.calculateTrendRisk(coin, allCoins);
    
    // Overall risk percentage
    const riskPercentage = (volatilityRisk + correlationRisk + volumeRiskScore + trendRisk) / 4;
    
    // Statistical significance from two independent signals:
    // 1) how far the coin has drifted from its own tier's average (tier noise)
    // 2) how far it sits from where BTC/ETH-led propagation implies it should
    //    be, given its tier's historical lag correlation (the core "laggard"
    //    thesis: large-cap moves haven't fully cascaded down yet)
    const tierAvg = this.calculateTierAverage(tierCoins);
    const deviation = Math.abs(coinChange - tierAvg);
    const tierSignificance = scaledSignificance(deviation, tierCoins.length);
    const lagSignificance = scaledSignificance(Math.abs(lagGap), tierCoins.length);
    const statisticalSignificance = Math.min(5, Math.max(tierSignificance, lagSignificance));
    
    // Laggard score: normalized magnitude of the propagation gap relative to
    // the expected move itself. Near 0 = fully caught up / synced with
    // leaders, near 1+ = has barely moved despite a strong BTC/ETH signal.
    const laggardScore = Math.abs(expectedPropagatedMove) > 0.1
      ? Math.min(3, Math.abs(lagGap) / Math.abs(expectedPropagatedMove))
      : 0;

    // Base confidence blends tier deviation with the lag-propagation gap,
    // then rewards cases where both signals agree on direction (reinforcing
    // evidence of a genuine laggard rather than tier noise).
    const tierDrivenConfidence = (deviation * 10) + (tierSignificance * 15);
    const lagDrivenConfidence = (Math.abs(lagGap) * 8) + (laggardScore * 15);
    const signalsAgree = Math.sign(coinChange - tierAvg) === Math.sign(-lagGap) && lagGap !== 0;
    let confidence = Math.min(95, Math.max(tierDrivenConfidence, lagDrivenConfidence) + (signalsAgree ? 10 : 0));
    confidence = Math.max(0, confidence - (riskPercentage * 0.5));
    
    const analysis: OpportunityAnalysis = {
      volatilityRisk,
      correlationRisk,
      volumeRisk: volumeRiskScore,
      trendRisk,
      statisticalSignificance,
      historicalSuccessRate: this.estimateHistoricalSuccessRate(riskPercentage),
      leaderMomentum,
      propagationFactor,
      expectedPropagatedMove,
      lagGap,
      laggardScore,
      explanation: this.generateExplanation(coin, tierCoins, deviation, riskPercentage, leaderMomentum, expectedPropagatedMove, lagGap),
      strategy: this.generateStrategy(coin, coinChange, tierAvg, riskPercentage, lagGap),
      entryPoint: this.generateEntryPoint(coin, isLongSetup(coinChange, tierAvg, lagGap)),
      exitPoint: this.generateExitPoint(deviation, riskPercentage, lagGap),
      stopLoss: this.generateStopLoss(riskPercentage),
    };
    
    return {
      confidence,
      riskPercentage,
      analysis,
    };
  }

  /**
   * Average 24h momentum of the market leaders (BTC/ETH). This is the
   * signal that the model expects to cascade down through the tier
   * hierarchy with a delay and decay.
   */
  private getLeaderMomentum(allCoins: Cryptocurrency[]): number {
    const leaders = allCoins.filter(c => c.symbol === 'BTC' || c.symbol === 'ETH');
    if (leaders.length === 0) {
      return this.calculateTierAverage(allCoins.filter(c => c.tier === 'mega'));
    }
    return this.calculateTierAverage(leaders);
  }

  private calculateVolatilityRisk(coin: Cryptocurrency, _tierCoins: Cryptocurrency[]): number {
    return TIER_VOLATILITY_RISK[coin.tier as Tier] ?? 50;
  }

  private calculateCorrelationRisk(coin: Cryptocurrency, tierCoins: Cryptocurrency[]): number {
    const coinChange = parseFloat(coin.priceChangePercentage24h?.toString() || '0');
    const tierAvg = this.calculateTierAverage(tierCoins);
    const deviation = Math.abs(coinChange - tierAvg);
    return Math.min(100, deviation * 5);
  }

  private calculateTrendRisk(coin: Cryptocurrency, allCoins: Cryptocurrency[]): number {
    const marketAvg = this.calculateTierAverage(allCoins);
    const coinChange = parseFloat(coin.priceChangePercentage24h?.toString() || '0');
    const trendAlignment = Math.abs(coinChange - marketAvg);
    return Math.min(100, trendAlignment * 3);
  }

  private estimateHistoricalSuccessRate(riskPercentage: number): number {
    return Math.max(30, 95 - (riskPercentage * 0.8));
  }

  private generateExplanation(
    coin: Cryptocurrency,
    tierCoins: Cryptocurrency[],
    deviation: number,
    riskPercentage: number,
    leaderMomentum: number,
    expectedPropagatedMove: number,
    lagGap: number
  ): string {
    const tierAvg = this.calculateTierAverage(tierCoins);
    const coinChange = parseFloat(coin.priceChangePercentage24h?.toString() || '0');
    const isLagging = coinChange < tierAvg;
    const hasMeaningfulLag = Math.abs(lagGap) > 0.5 && Math.abs(leaderMomentum) > 0.5;

    const tierPart = `${coin.symbol} is ${isLagging ? 'lagging' : 'outperforming'} its ${coin.tier} tier average by ${deviation.toFixed(1)}%.`;

    const lagPart = hasMeaningfulLag
      ? ` BTC/ETH are showing ${leaderMomentum.toFixed(1)}% 24h momentum; based on historical propagation into the ${coin.tier} tier, ${coin.symbol} would be expected to be at roughly ${expectedPropagatedMove.toFixed(1)}% - a lag gap of ${lagGap.toFixed(1)}%, meaning it has ${lagGap > 0 ? 'not yet caught up' : 'not yet caught down'} to the leader-driven move.`
      : ` Leader (BTC/ETH) momentum is muted, so this signal is driven primarily by within-tier dispersion rather than large-cap propagation.`;

    return tierPart + lagPart +
           ` Risk assessment indicates ${riskPercentage.toFixed(1)}% overall risk based on volatility, volume, and trend analysis.`;
  }

  private generateStrategy(
    coin: Cryptocurrency,
    coinChange: number,
    tierAvg: number,
    riskPercentage: number,
    lagGap: number
  ): string {
    const isLong = isLongSetup(coinChange, tierAvg, lagGap);
    const leverage = recommendLeverage(riskPercentage);
    const lagDriven = Math.abs(lagGap) > 0.5;

    return `${isLong ? 'Long' : 'Short'} perp position with ${leverage} leverage. ` +
           (lagDriven
             ? `Thesis: ${coin.symbol} hasn't yet absorbed the BTC/ETH-led move that has historically cascaded into the ${coin.tier} tier - entering ahead of the expected catch-up/catch-down. `
             : `Position based on mean reversion expectation within ${coin.tier} tier correlation patterns. `) +
           `Entry should be executed during the current dislocation with tight risk management.`;
  }

  private generateEntryPoint(coin: Cryptocurrency, isLong: boolean): string {
    const currentPrice = parseFloat(coin.currentPrice?.toString() || '0');
    const entryAdjustment = isLong ? 0.98 : 1.02; // Slightly better than current price
    
    return `$${(currentPrice * entryAdjustment).toFixed(6)} (${isLong ? 'on dip' : 'on bounce'})`;
  }

  private generateExitPoint(deviation: number, riskPercentage: number, lagGap: number): string {
    const recovery = expectedRecovery(deviation, lagGap, riskPercentage);
    return `${recovery.toFixed(1)}% ${recovery > 0 ? 'profit' : 'loss'} target (catch-up to leader-implied expected move)`;
  }

  private generateStopLoss(riskPercentage: number): string {
    return `${stopLossPct(riskPercentage).toFixed(1)}% stop loss`;
  }
}
