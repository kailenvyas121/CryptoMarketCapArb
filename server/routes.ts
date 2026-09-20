import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { CryptoService } from "./services/cryptoService";
import { OpportunityService } from "./services/opportunityService";
import { TradingExpertService } from "./services/tradingExpertService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const cryptoService = CryptoService.getInstance();
  const opportunityService = OpportunityService.getInstance();
  const tradingExpertService = TradingExpertService.getInstance();

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    // Send initial data
    sendMarketUpdate(ws);
    
    // Set up periodic updates
    const updateInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        sendMarketUpdate(ws);
      }
    }, 5000); // Update every 5 seconds
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clearInterval(updateInterval);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(updateInterval);
    });
  });

  async function sendMarketUpdate(ws: WebSocket) {
    try {
      const cryptocurrencies = await storage.getAllCryptocurrencies();
      const opportunities = await storage.getActiveOpportunities();
      const correlations = await storage.getLatestCorrelations();
      
      const marketData = {
        type: 'marketUpdate',
        timestamp: new Date().toISOString(),
        data: {
          cryptocurrencies,
          opportunities,
          correlations,
          totalMarketCap: cryptocurrencies.reduce((sum, coin) => 
            sum + parseFloat(coin.marketCap?.toString() || '0'), 0),
          btcDominance: calculateBtcDominance(cryptocurrencies),
        }
      };
      
      ws.send(JSON.stringify(marketData));
    } catch (error) {
      console.error('Error sending market update:', error);
    }
  }

  function calculateBtcDominance(cryptocurrencies: any[]): number {
    const btc = cryptocurrencies.find(coin => coin.symbol === 'BTC');
    if (!btc) return 0;
    
    const totalMarketCap = cryptocurrencies.reduce((sum, coin) => 
      sum + parseFloat(coin.marketCap?.toString() || '0'), 0);
    
    return totalMarketCap > 0 ? 
      (parseFloat(btc.marketCap?.toString() || '0') / totalMarketCap) * 100 : 0;
  }

  // API Routes
  app.get('/api/cryptocurrencies', async (req, res) => {
    try {
      const cryptocurrencies = await storage.getAllCryptocurrencies();
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(cryptocurrencies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch cryptocurrencies' });
    }
  });

  // Get individual cryptocurrency by ID
  app.get('/api/cryptocurrency/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const cryptocurrencies = await storage.getAllCryptocurrencies();
      const crypto = cryptocurrencies.find(c => c.id === id);
      
      if (!crypto) {
        return res.status(404).json({ error: "Cryptocurrency not found" });
      }
      
      res.json(crypto);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch cryptocurrency' });
    }
  });

  // Get cryptocurrency by symbol
  app.get('/api/cryptocurrency/symbol/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const crypto = await storage.getCryptocurrencyBySymbol(symbol);
      
      if (!crypto) {
        return res.status(404).json({ error: "Cryptocurrency not found" });
      }
      
      res.json(crypto);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch cryptocurrency' });
    }
  });

  app.get('/api/cryptocurrencies/:tier', async (req, res) => {
    try {
      const { tier } = req.params;
      const cryptocurrencies = await storage.getCryptocurrenciesByTier(tier);
      res.json(cryptocurrencies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch cryptocurrencies by tier' });
    }
  });

  app.get('/api/opportunities', async (req, res) => {
    try {
      const opportunities = await storage.getActiveOpportunities();
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
  });

  async function runLagAnalysis() {
    const cryptocurrencies = await storage.getAllCryptocurrencies();
    const opportunities = await opportunityService.analyzeOpportunities(cryptocurrencies);
    await storage.replaceActiveOpportunities(opportunities);
    return opportunities.length;
  }

  app.post('/api/opportunities/analyze', async (req, res) => {
    try {
      const count = await runLagAnalysis();
      res.json({ message: 'Analysis complete', count });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze opportunities' });
    }
  });

  app.get('/api/correlations', async (req, res) => {
    try {
      const correlations = await storage.getLatestCorrelations();
      res.json(correlations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch correlations' });
    }
  });

  // Get price history for a token using real CoinGecko data
  app.get('/api/price-history/:symbol/:timeframe', async (req, res) => {
    try {
      const { symbol, timeframe } = req.params;
      
      // Get the cryptocurrency from storage first
      const crypto = await storage.getCryptocurrencyBySymbol(symbol.toUpperCase());
      if (!crypto) {
        return res.status(404).json({ error: 'Cryptocurrency not found' });
      }

      // Calculate days for CoinGecko API
      let days = 1;
      switch (timeframe) {
        case '1d':
          days = 1;
          break;
        case '1m':
          days = 30;
          break;
        case '1y':
          days = 365;
          break;
        case '5y':
          days = 365 * 5;
          break;
        case 'max':
          days = 'max';
          break;
        default:
          days = 1;
      }

      // Try to get real price history from CoinGecko
      if (crypto.coinGeckoId) {
        try {
          const priceData = await cryptoService.getPriceHistory(crypto.coinGeckoId, days);
          
          if (priceData && priceData.prices && priceData.prices.length > 0) {
            // Transform CoinGecko data to our format
            const transformedData = priceData.prices.map((price: [number, number]) => ({
              timestamp: new Date(price[0]).toISOString(),
              price: price[1]
            }));
            
            return res.json(transformedData);
          }
        } catch (apiError) {
          console.log(`CoinGecko API error for ${symbol}:`, apiError);
        }
      }

      // If real data is not available, show current price only
      const currentPrice = parseFloat(crypto.currentPrice);
      const now = new Date();
      
      res.json([{
        timestamp: now.toISOString(),
        price: currentPrice
      }]);
      
    } catch (error) {
      console.error('Error fetching price history:', error);
      res.status(500).json({ error: 'Failed to fetch price history' });
    }
  });

  app.post('/api/market/refresh', async (req, res) => {
    try {
      console.log('Manual market data refresh requested...');
      const marketData = await cryptoService.getAllMarketData();
      
      console.log(`Processing ${marketData.length} coins from CoinGecko...`);
      
      // Update database with fresh data
      let updatedCount = 0;
      for (const coinData of marketData.slice(0, 250)) { // Top 250 coins
        try {
          const cryptocurrency = cryptoService.transformToInsertCryptocurrency(coinData);
          await storage.upsertCryptocurrency(cryptocurrency);
          updatedCount++;
        } catch (error) {
          console.error(`Error updating ${coinData.symbol}:`, error);
        }
      }
      
      const opportunityCount = await runLagAnalysis();
      
      res.json({ 
        message: 'Market data refreshed successfully',
        cryptocurrencies: updatedCount,
        opportunities: opportunityCount,
        totalFetched: marketData.length
      });
    } catch (error) {
      console.error('Error refreshing market data:', error);
      res.status(500).json({ error: `Failed to refresh market data: ${error.message}` });
    }
  });

  app.get('/api/market/stats', async (req, res) => {
    try {
      const cryptocurrencies = await storage.getAllCryptocurrencies();
      const opportunities = await storage.getActiveOpportunities();
      
      const stats = {
        totalMarketCap: cryptocurrencies.reduce((sum, coin) => 
          sum + parseFloat(coin.marketCap?.toString() || '0'), 0),
        btcDominance: calculateBtcDominance(cryptocurrencies),
        activeOpportunities: opportunities.length,
        marketTrend: calculateMarketTrend(cryptocurrencies),
        tierDistribution: calculateTierDistribution(cryptocurrencies),
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market stats' });
    }
  });

  // AI Trading Expert Chat API
  app.post('/api/trading-expert/chat', async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get current market context
      const cryptocurrencies = await storage.getAllCryptocurrencies();
      const opportunities = await storage.getActiveOpportunities();
      
      const marketStats = {
        totalMarketCap: cryptocurrencies.reduce((sum, coin) => 
          sum + parseFloat(coin.marketCap?.toString() || '0'), 0),
        btcDominance: calculateBtcDominance(cryptocurrencies),
        marketTrend: calculateMarketTrend(cryptocurrencies),
        volatilityIndex: calculateVolatilityIndex(cryptocurrencies),
      };

      const context = {
        cryptocurrencies,
        opportunities,
        marketStats
      };

      // Get AI analysis
      const analysis = await tradingExpertService.analyzeUserQuery(message, context);
      
      res.json(analysis);
    } catch (error) {
      console.error('Trading expert chat error:', error);
      res.status(500).json({ 
        error: 'Failed to generate response',
        response: 'I apologize, but I\'m experiencing technical difficulties. Please try your question again.',
        sentiment: 'neutral' as const,
        riskLevel: 'medium' as const,
        confidence: 50,
        recommendations: ['Try your question again', 'Check market data connectivity']
      });
    }
  });

  function calculateMarketTrend(cryptocurrencies: any[]): string {
    const avgChange = cryptocurrencies.reduce((sum, coin) => 
      sum + parseFloat(coin.priceChangePercentage24h?.toString() || '0'), 0) / cryptocurrencies.length;
    
    if (avgChange > 2) return 'bullish';
    if (avgChange < -2) return 'bearish';
    return 'neutral';
  }

  function calculateTierDistribution(cryptocurrencies: any[]) {
    const distribution = cryptocurrencies.reduce((acc, coin) => {
      acc[coin.tier] = (acc[coin.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return distribution;
  }

  function calculateVolatilityIndex(cryptocurrencies: any[]): number {
    const changes = cryptocurrencies.map(c => Math.abs(parseFloat(c.priceChangePercentage24h || '0')));
    const avgVolatility = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    return Math.round(avgVolatility * 10); // Scale to 0-100
  }

  // Force initial market data refresh on startup
  (async () => {
    try {
      console.log('Initial market data refresh...');
      const marketData = await cryptoService.getAllMarketData();
      
      console.log(`Fetched ${marketData.length} coins from CoinGecko`);
      
      for (const coinData of marketData.slice(0, 250)) { // Process top 250 coins
        const cryptocurrency = cryptoService.transformToInsertCryptocurrency(coinData);
        await storage.upsertCryptocurrency(cryptocurrency);
      }
      
      console.log('Initial market data refresh completed');

      const signalCount = await runLagAnalysis();
      console.log(`Lag-propagation analysis complete: ${signalCount} active signals`);
    } catch (error) {
      console.error('Initial refresh error:', error);
      console.log('Continuing with demo data...');
      try {
        const signalCount = await runLagAnalysis();
        console.log(`Lag-propagation analysis (fallback): ${signalCount} active signals`);
      } catch (analysisError) {
        console.error('Fallback analysis error:', analysisError);
      }
    }
  })();

  // Auto-refresh market data every 2 minutes for accurate tracking
  setInterval(async () => {
    try {
      console.log('Auto-refreshing market data...');
      const marketData = await cryptoService.getAllMarketData();
      
      for (const coinData of marketData.slice(0, 500)) { // Process top 500 coins
        const cryptocurrency = cryptoService.transformToInsertCryptocurrency(coinData);
        await storage.upsertCryptocurrency(cryptocurrency);
      }

      const signalCount = await runLagAnalysis();
      console.log(`Auto-refresh completed (${signalCount} signals)`);
    } catch (error) {
      console.error('Auto-refresh error:', error);
    }
  }, 2 * 60 * 1000); // 2 minutes for real-time accuracy

  // Favorites routes
  app.get('/api/favorites/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const favorites = await storage.getUserFavorites(userId);
      
      // Get full cryptocurrency data for favorites
      const cryptocurrencies = await storage.getAllCryptocurrencies();
      const favoriteCoins = favorites.map(favorite => {
        const coin = cryptocurrencies.find(c => c.id === favorite.cryptocurrencyId);
        return coin ? { ...coin, favoriteId: favorite.id } : null;
      }).filter(Boolean);
      
      res.json(favoriteCoins);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  app.post('/api/favorites', async (req, res) => {
    try {
      const { userId, cryptocurrencyId } = req.body;
      if (!userId || !cryptocurrencyId) {
        return res.status(400).json({ error: 'userId and cryptocurrencyId are required' });
      }
      
      const favorite = await storage.addFavorite(userId, cryptocurrencyId);
      res.json(favorite);
    } catch (error) {
      console.error('Error adding favorite:', error);
      res.status(500).json({ error: 'Failed to add favorite' });
    }
  });

  app.delete('/api/favorites/:userId/:cryptocurrencyId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const cryptocurrencyId = parseInt(req.params.cryptocurrencyId);
      
      await storage.removeFavorite(userId, cryptocurrencyId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ error: 'Failed to remove favorite' });
    }
  });

  app.get('/api/favorites/check/:userId/:cryptocurrencyId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const cryptocurrencyId = parseInt(req.params.cryptocurrencyId);
      
      const isFavorite = await storage.isFavorite(userId, cryptocurrencyId);
      res.json({ isFavorite });
    } catch (error) {
      console.error('Error checking favorite:', error);
      res.status(500).json({ error: 'Failed to check favorite status' });
    }
  });

  // Favorite opportunities routes
  app.get('/api/favorite-opportunities/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const favorites = await storage.getUserFavoriteOpportunities(userId);
      
      // Get full opportunity data for favorites
      const opportunities = await storage.getAllTradingOpportunities();
      const favoriteOpportunities = favorites.map(favorite => {
        const opportunity = opportunities.find(o => o.id === favorite.opportunityId);
        return opportunity ? { ...opportunity, favoriteId: favorite.id } : null;
      }).filter(Boolean);
      
      res.json(favoriteOpportunities);
    } catch (error) {
      console.error('Error fetching favorite opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch favorite opportunities' });
    }
  });

  app.post('/api/favorite-opportunities', async (req, res) => {
    try {
      const { userId, opportunityId } = req.body;
      if (!userId || !opportunityId) {
        return res.status(400).json({ error: 'userId and opportunityId are required' });
      }
      
      const favorite = await storage.addFavoriteOpportunity(userId, opportunityId);
      res.json(favorite);
    } catch (error) {
      console.error('Error adding favorite opportunity:', error);
      res.status(500).json({ error: 'Failed to add favorite opportunity' });
    }
  });

  app.delete('/api/favorite-opportunities/:userId/:opportunityId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const opportunityId = parseInt(req.params.opportunityId);
      
      await storage.removeFavoriteOpportunity(userId, opportunityId);
      res.json({ message: 'Favorite opportunity removed successfully' });
    } catch (error) {
      console.error('Error removing favorite opportunity:', error);
      res.status(500).json({ error: 'Failed to remove favorite opportunity' });
    }
  });

  return httpServer;
}
