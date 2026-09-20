import { 
  users, 
  cryptocurrencies,
  tradingOpportunities,
  correlationData,
  priceHistory,
  userFavorites,
  type User, 
  type InsertUser,
  type Cryptocurrency,
  type InsertCryptocurrency,
  type TradingOpportunity,
  type InsertTradingOpportunity,
  type CorrelationData,
  type PriceHistory,
  type UserFavorite,
  type InsertUserFavorite,
  type FavoriteOpportunity,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Cryptocurrency methods
  getAllCryptocurrencies(): Promise<Cryptocurrency[]>;
  getCryptocurrenciesByTier(tier: string): Promise<Cryptocurrency[]>;
  getCryptocurrencyBySymbol(symbol: string): Promise<Cryptocurrency | undefined>;
  upsertCryptocurrency(cryptocurrency: InsertCryptocurrency): Promise<Cryptocurrency>;
  
  // Trading opportunity methods
  getAllTradingOpportunities(): Promise<TradingOpportunity[]>;
  getActiveOpportunities(): Promise<TradingOpportunity[]>;
  createTradingOpportunity(opportunity: InsertTradingOpportunity): Promise<TradingOpportunity>;
  deactivateOpportunity(id: number): Promise<void>;
  replaceActiveOpportunities(opportunities: InsertTradingOpportunity[]): Promise<TradingOpportunity[]>;
  
  // Correlation methods
  getLatestCorrelations(): Promise<CorrelationData[]>;
  createCorrelation(correlation: Omit<CorrelationData, 'id' | 'calculatedAt'>): Promise<CorrelationData>;
  
  // Price history methods
  getPriceHistory(cryptocurrencyId: number, hours: number): Promise<PriceHistory[]>;
  addPriceHistory(priceData: Omit<PriceHistory, 'id' | 'timestamp'>): Promise<PriceHistory>;
  
  // Favorites methods
  getUserFavorites(userId: number): Promise<UserFavorite[]>;
  addFavorite(userId: number, cryptocurrencyId: number): Promise<UserFavorite>;
  removeFavorite(userId: number, cryptocurrencyId: number): Promise<void>;
  isFavorite(userId: number, cryptocurrencyId: number): Promise<boolean>;
  
  // Opportunity favorites methods
  getUserFavoriteOpportunities(userId: number): Promise<FavoriteOpportunity[]>;
  addFavoriteOpportunity(userId: number, opportunityId: number): Promise<FavoriteOpportunity>;
  removeFavoriteOpportunity(userId: number, opportunityId: number): Promise<void>;
  isFavoriteOpportunity(userId: number, opportunityId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private cryptocurrencies: Map<number, Cryptocurrency> = new Map();
  private tradingOpportunities: Map<number, TradingOpportunity> = new Map();
  private correlationData: Map<number, CorrelationData> = new Map();
  private priceHistory: Map<number, PriceHistory> = new Map();
  private userFavorites: Map<number, UserFavorite> = new Map();
  private favoriteOpportunities: Map<number, FavoriteOpportunity> = new Map();
  
  private currentUserId = 1;
  private currentCryptoId = 1;
  private currentOpportunityId = 1;
  private currentCorrelationId = 1;
  private currentPriceHistoryId = 1;
  private currentFavoriteId = 1;
  private currentFavoriteOpportunityId = 1;

  constructor() {
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Initialize with comprehensive demo cryptocurrency data
    const demoCoins = [
      // Mega Cap ($100B+)
      { symbol: 'BTC', name: 'Bitcoin', price: 96500, marketCap: 1900000000000, tier: 'mega', change: 2.1, deployedYear: 2009 },
      { symbol: 'ETH', name: 'Ethereum', price: 3420, marketCap: 410000000000, tier: 'mega', change: 1.8, deployedYear: 2015 },
      
      // Large Cap ($10B-$100B)
      { symbol: 'BNB', name: 'Binance Coin', price: 685, marketCap: 98000000000, tier: 'large', change: -0.5, deployedYear: 2017 },
      { symbol: 'SOL', name: 'Solana', price: 185, marketCap: 85000000000, tier: 'large', change: 3.2, deployedYear: 2020 },
      { symbol: 'XRP', name: 'Ripple', price: 2.42, marketCap: 136000000000, tier: 'large', change: -1.2, deployedYear: 2012 },
      { symbol: 'ADA', name: 'Cardano', price: 1.08, marketCap: 38000000000, tier: 'large', change: 0.8, deployedYear: 2017 },
      { symbol: 'AVAX', name: 'Avalanche', price: 42, marketCap: 18000000000, tier: 'large', change: 2.5, deployedYear: 2020 },
      { symbol: 'DOT', name: 'Polkadot', price: 8.9, marketCap: 12500000000, tier: 'large', change: -2.1, deployedYear: 2020 },
      
      // Large Medium ($5B-$10B)
      { symbol: 'MATIC', name: 'Polygon', price: 0.52, marketCap: 5200000000, tier: 'largeMedium', change: 1.5, deployedYear: 2019 },
      { symbol: 'LINK', name: 'Chainlink', price: 25.8, marketCap: 15200000000, tier: 'large', change: 0.7, deployedYear: 2017 },
      { symbol: 'UNI', name: 'Uniswap', price: 15.8, marketCap: 9400000000, tier: 'largeMedium', change: -0.9, deployedYear: 2020 },
      { symbol: 'LTC', name: 'Litecoin', price: 105, marketCap: 7800000000, tier: 'largeMedium', change: 1.2, deployedYear: 2011 },
      { symbol: 'ICP', name: 'Internet Computer', price: 12.5, marketCap: 5800000000, tier: 'largeMedium', change: 4.1, deployedYear: 2021 },
      { symbol: 'APT', name: 'Aptos', price: 9.4, marketCap: 5200000000, tier: 'largeMedium', change: -1.8, deployedYear: 2022 },
      
      // Small Medium ($1B-$5B)
      { symbol: 'ATOM', name: 'Cosmos', price: 10.2, marketCap: 4000000000, tier: 'smallMedium', change: 2.8, deployedYear: 2019 },
      { symbol: 'NEAR', name: 'NEAR Protocol', price: 3.5, marketCap: 3800000000, tier: 'smallMedium', change: 1.9, deployedYear: 2021 },
      { symbol: 'FTM', name: 'Fantom', price: 0.45, marketCap: 1800000000, tier: 'smallMedium', change: -3.2, deployedYear: 2018 },
      { symbol: 'ALGO', name: 'Algorand', price: 0.22, marketCap: 1700000000, tier: 'smallMedium', change: 0.5, deployedYear: 2019 },
      { symbol: 'VET', name: 'VeChain', price: 0.028, marketCap: 2200000000, tier: 'smallMedium', change: 1.1, deployedYear: 2018 },
      { symbol: 'FLOW', name: 'Flow', price: 0.78, marketCap: 1500000000, tier: 'smallMedium', change: -0.7, deployedYear: 2020 },
      { symbol: 'HBAR', name: 'Hedera', price: 0.065, marketCap: 2400000000, tier: 'smallMedium', change: 2.3, deployedYear: 2019 },
      { symbol: 'XTZ', name: 'Tezos', price: 0.95, marketCap: 1000000000, tier: 'smallMedium', change: -1.5, deployedYear: 2018 },
      
      // Small Cap ($100M-$1B)
      { symbol: 'ROSE', name: 'Oasis Network', price: 0.078, marketCap: 520000000, tier: 'small', change: 3.8, deployedYear: 2020 },
      { symbol: 'KAVA', name: 'Kava', price: 0.95, marketCap: 480000000, tier: 'small', change: -2.1, deployedYear: 2019 },
      { symbol: 'CELO', name: 'Celo', price: 0.62, marketCap: 320000000, tier: 'small', change: 1.7, deployedYear: 2020 },
      { symbol: 'SKL', name: 'SKALE Network', price: 0.048, marketCap: 180000000, tier: 'small', change: 4.2, deployedYear: 2020 },
      { symbol: 'BAND', name: 'Band Protocol', price: 1.25, marketCap: 250000000, tier: 'small', change: -1.9, deployedYear: 2019 },
      { symbol: 'REN', name: 'Ren', price: 0.058, marketCap: 150000000, tier: 'small', change: 2.5, deployedYear: 2018 },
      { symbol: 'KNC', name: 'Kyber Network', price: 0.72, marketCap: 140000000, tier: 'small', change: -0.8, deployedYear: 2017 },
      { symbol: 'OCEAN', name: 'Ocean Protocol', price: 0.45, marketCap: 290000000, tier: 'small', change: 3.1, deployedYear: 2019 },
      
      // Micro Cap / Shit Coins ($10M-$100M)
      { symbol: 'PEPE', name: 'Pepe', price: 0.00000185, marketCap: 78000000, tier: 'micro', change: 15.7, deployedYear: 2023 },
      { symbol: 'FLOKI', name: 'Floki Inu', price: 0.000195, marketCap: 45000000, tier: 'micro', change: -8.2, deployedYear: 2021 },
      { symbol: 'SHIB', name: 'Shiba Inu', price: 0.0000245, marketCap: 14500000000, tier: 'large', change: 22.1, deployedYear: 2020 },
      { symbol: 'WOJAK', name: 'Wojak', price: 0.000038, marketCap: 38000000, tier: 'micro', change: -12.5, deployedYear: 2023 },
      { symbol: 'DOGE2', name: 'Doge2.0', price: 0.0000065, marketCap: 26000000, tier: 'micro', change: 45.3, deployedYear: 2024 },
      { symbol: 'MEME', name: 'Meme Coin', price: 0.000092, marketCap: 46000000, tier: 'micro', change: -18.7, deployedYear: 2023 },
      { symbol: 'MOONBOY', name: 'MoonBoy', price: 0.000025, marketCap: 25000000, tier: 'micro', change: 67.9, deployedYear: 2024 },
      { symbol: 'ROCKET', name: 'RocketCoin', price: 0.0000129, marketCap: 32000000, tier: 'micro', change: -25.4, deployedYear: 2024 },
    ];

    demoCoins.forEach((coin, index) => {
      const id = this.currentCryptoId++;
      const crypto: Cryptocurrency = {
        id,
        symbol: coin.symbol,
        name: coin.name,
        currentPrice: coin.price.toString(),
        marketCap: coin.marketCap.toString(),
        marketCapRank: index + 1,
        volume24h: (coin.marketCap * 0.15).toString(), // Estimate 15% of market cap as volume
        priceChange24h: ((coin.price * coin.change) / 100).toString(),
        priceChangePercentage24h: coin.change.toString(),
        tier: coin.tier,
        logoUrl: null,
        lastUpdated: new Date(),
        metadata: {
          isDemo: true,
          lastUpdate: new Date().toISOString(),
          deployedYear: (coin as any).deployedYear || 2020,
        },
      };
      this.cryptocurrencies.set(id, crypto);
    });

    // Generate some demo correlations
    const correlations = [
      { tier1: 'mega', tier2: 'large', correlation: '0.94', timeframe: '24h' },
      { tier1: 'large', tier2: 'largeMedium', correlation: '0.87', timeframe: '24h' },
      { tier1: 'largeMedium', tier2: 'smallMedium', correlation: '0.72', timeframe: '24h' },
      { tier1: 'smallMedium', tier2: 'small', correlation: '0.58', timeframe: '24h' },
      { tier1: 'small', tier2: 'micro', correlation: '0.23', timeframe: '24h' },
    ];

    correlations.forEach(corr => {
      const id = this.currentCorrelationId++;
      this.correlationData.set(id, {
        id,
        tier1: corr.tier1,
        tier2: corr.tier2,
        correlation: corr.correlation,
        timeframe: corr.timeframe,
        calculatedAt: new Date(),
      });
    });

    // Live lag-propagation signals are generated on startup from CoinGecko
    // data (see registerRoutes). Demo coins/correlations above are only a
    // fallback if the first fetch fails.
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Cryptocurrency methods
  async getAllCryptocurrencies(): Promise<Cryptocurrency[]> {
    return Array.from(this.cryptocurrencies.values());
  }

  async getCryptocurrenciesByTier(tier: string): Promise<Cryptocurrency[]> {
    return Array.from(this.cryptocurrencies.values()).filter(
      crypto => crypto.tier === tier
    );
  }

  async getCryptocurrencyBySymbol(symbol: string): Promise<Cryptocurrency | undefined> {
    return Array.from(this.cryptocurrencies.values()).find(
      crypto => crypto.symbol === symbol
    );
  }

  async upsertCryptocurrency(cryptocurrency: InsertCryptocurrency): Promise<Cryptocurrency> {
    const existing = Array.from(this.cryptocurrencies.values()).find(
      crypto => crypto.symbol === cryptocurrency.symbol
    );

    if (existing) {
      const updated: Cryptocurrency = {
        ...existing,
        ...cryptocurrency,
        lastUpdated: new Date(),
        marketCapRank: cryptocurrency.marketCapRank ?? existing.marketCapRank,
      };
      this.cryptocurrencies.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentCryptoId++;
      const newCrypto: Cryptocurrency = {
        ...cryptocurrency,
        id,
        lastUpdated: new Date(),
        metadata: cryptocurrency.metadata || null,
      };
      this.cryptocurrencies.set(id, newCrypto);
      return newCrypto;
    }
  }

  // Trading opportunity methods
  async getAllTradingOpportunities(): Promise<TradingOpportunity[]> {
    return Array.from(this.tradingOpportunities.values());
  }

  async getActiveOpportunities(): Promise<TradingOpportunity[]> {
    const now = new Date();
    return Array.from(this.tradingOpportunities.values()).filter(
      opportunity => opportunity.isActive && 
      (!opportunity.expiresAt || opportunity.expiresAt > now)
    );
  }

  async createTradingOpportunity(opportunity: InsertTradingOpportunity): Promise<TradingOpportunity> {
    const id = this.currentOpportunityId++;
    const newOpportunity: TradingOpportunity = {
      ...opportunity,
      id,
      createdAt: new Date(),
      isActive: true,
      cryptocurrencyId: opportunity.cryptocurrencyId || null,
      expectedReturn: opportunity.expectedReturn || null,
      expiresAt: opportunity.expiresAt || null,
    };
    this.tradingOpportunities.set(id, newOpportunity);
    return newOpportunity;
  }

  async deactivateOpportunity(id: number): Promise<void> {
    const opportunity = this.tradingOpportunities.get(id);
    if (opportunity) {
      opportunity.isActive = false;
      this.tradingOpportunities.set(id, opportunity);
    }
  }

  async replaceActiveOpportunities(opportunities: InsertTradingOpportunity[]): Promise<TradingOpportunity[]> {
    for (const opportunity of this.tradingOpportunities.values()) {
      opportunity.isActive = false;
    }
    const created: TradingOpportunity[] = [];
    for (const opportunity of opportunities) {
      created.push(await this.createTradingOpportunity(opportunity));
    }
    return created;
  }

  // Correlation methods
  async getLatestCorrelations(): Promise<CorrelationData[]> {
    return Array.from(this.correlationData.values());
  }

  async createCorrelation(correlation: Omit<CorrelationData, 'id' | 'calculatedAt'>): Promise<CorrelationData> {
    const id = this.currentCorrelationId++;
    const newCorrelation: CorrelationData = {
      ...correlation,
      id,
      calculatedAt: new Date(),
    };
    this.correlationData.set(id, newCorrelation);
    return newCorrelation;
  }

  // Price history methods
  async getPriceHistory(cryptocurrencyId: number, hours: number): Promise<PriceHistory[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.priceHistory.values()).filter(
      history => history.cryptocurrencyId === cryptocurrencyId &&
      history.timestamp && history.timestamp > cutoff
    );
  }

  async addPriceHistory(priceData: Omit<PriceHistory, 'id' | 'timestamp'>): Promise<PriceHistory> {
    const id = this.currentPriceHistoryId++;
    const newPriceHistory: PriceHistory = {
      ...priceData,
      id,
      timestamp: new Date(),
    };
    this.priceHistory.set(id, newPriceHistory);
    return newPriceHistory;
  }

  // Favorites methods
  async getUserFavorites(userId: number): Promise<UserFavorite[]> {
    return Array.from(this.userFavorites.values()).filter(
      (favorite) => favorite.userId === userId
    );
  }

  async addFavorite(userId: number, cryptocurrencyId: number): Promise<UserFavorite> {
    // Check if favorite already exists
    const existingFavorite = Array.from(this.userFavorites.values()).find(
      (favorite) => favorite.userId === userId && favorite.cryptocurrencyId === cryptocurrencyId
    );
    
    if (existingFavorite) {
      return existingFavorite;
    }

    const id = this.currentFavoriteId++;
    const newFavorite: UserFavorite = {
      id,
      userId,
      cryptocurrencyId,
      createdAt: new Date(),
    };
    this.userFavorites.set(id, newFavorite);
    return newFavorite;
  }

  async removeFavorite(userId: number, cryptocurrencyId: number): Promise<void> {
    const favoriteToRemove = Array.from(this.userFavorites.entries()).find(
      ([_, favorite]) => favorite.userId === userId && favorite.cryptocurrencyId === cryptocurrencyId
    );
    
    if (favoriteToRemove) {
      this.userFavorites.delete(favoriteToRemove[0]);
    }
  }

  async isFavorite(userId: number, cryptocurrencyId: number): Promise<boolean> {
    return Array.from(this.userFavorites.values()).some(
      (favorite) => favorite.userId === userId && favorite.cryptocurrencyId === cryptocurrencyId
    );
  }

  async getUserFavoriteOpportunities(userId: number): Promise<FavoriteOpportunity[]> {
    return Array.from(this.favoriteOpportunities.values()).filter(
      fav => fav.userId === userId
    );
  }

  async addFavoriteOpportunity(userId: number, opportunityId: number): Promise<FavoriteOpportunity> {
    const id = this.currentFavoriteOpportunityId++;
    const newFavorite: FavoriteOpportunity = {
      id,
      userId,
      opportunityId,
      createdAt: new Date(),
    };
    this.favoriteOpportunities.set(id, newFavorite);
    return newFavorite;
  }

  async removeFavoriteOpportunity(userId: number, opportunityId: number): Promise<void> {
    const favoriteToRemove = Array.from(this.favoriteOpportunities.entries()).find(
      ([_, fav]) => fav.userId === userId && fav.opportunityId === opportunityId
    );
    if (favoriteToRemove) {
      this.favoriteOpportunities.delete(favoriteToRemove[0]);
    }
  }

  async isFavoriteOpportunity(userId: number, opportunityId: number): Promise<boolean> {
    return Array.from(this.favoriteOpportunities.values()).some(
      fav => fav.userId === userId && fav.opportunityId === opportunityId
    );
  }
}

export const storage = new MemStorage();
