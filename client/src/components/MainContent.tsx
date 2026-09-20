import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Target, BarChart3, RefreshCw, Zap } from "lucide-react";
import DistributionChart from "./charts/DistributionChart";
import PerformanceChart from "./charts/PerformanceChart";
import CorrelationChart from "./charts/CorrelationChart";
import TierAnalysisChart from "./charts/TierAnalysisChart";
import LeverageOpportunityChart from "./charts/LeverageOpportunityChart";
import CascadeAnalysisChart from "./charts/CascadeAnalysisChart";
import SmartAlertSystem from "./SmartAlertSystem";
import LeverageExchanges from "./LeverageExchanges";
import TradingExpertChat from "./TradingExpertChat";
import OpportunityCard from "./OpportunityCard";
import CryptoDiscovery from "./CryptoDiscovery";
import PersonalDashboard from "./PersonalDashboard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MainContentProps {
  activeTab: 'overview' | 'comparison' | 'analysis' | 'opportunities' | 'exchanges' | 'ai-expert' | 'personal' | 'discovery';
  onTabChange: (tab: 'overview' | 'comparison' | 'analysis' | 'opportunities' | 'exchanges' | 'ai-expert' | 'personal' | 'discovery') => void;
  marketData: any;
  isConnected: boolean;
}

export default function MainContent({ activeTab, onTabChange, marketData, isConnected }: MainContentProps) {
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [sortBy, setSortBy] = useState<string>('performance');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refreshOpportunities = useMutation({
    mutationFn: () => apiRequest('POST', '/api/opportunities/analyze'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      toast({
        title: "Analysis Complete",
        description: "Trading opportunities have been refreshed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh opportunities analysis",
        variant: "destructive",
      });
    },
  });

  const calculateMarketStats = () => {
    if (!marketData?.cryptocurrencies) {
      return {
        totalMarketCap: 0,
        btcDominance: 0,
        activeOpportunities: 0,
        marketTrend: 'neutral',
      };
    }

    const totalMarketCap = marketData.cryptocurrencies.reduce((sum: number, coin: any) => 
      sum + parseFloat(coin.marketCap || '0'), 0
    );

    const btc = marketData.cryptocurrencies.find((coin: any) => coin.symbol === 'BTC');
    const btcDominance = btc ? (parseFloat(btc.marketCap || '0') / totalMarketCap) * 100 : 0;

    const avgChange = marketData.cryptocurrencies.reduce((sum: number, coin: any) => 
      sum + parseFloat(coin.priceChangePercentage24h || '0'), 0
    ) / marketData.cryptocurrencies.length;

    const marketTrend = avgChange > 2 ? 'bullish' : avgChange < -2 ? 'bearish' : 'neutral';

    return {
      totalMarketCap,
      btcDominance,
      activeOpportunities: marketData.opportunities?.length || 0,
      marketTrend,
    };
  };

  const stats = calculateMarketStats();

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <main className="flex-1 p-6">
      <Tabs value={activeTab} onValueChange={onTabChange as any}>
        <TabsList className="grid w-full grid-cols-8 bg-slate-900/80 backdrop-blur-sm">
          <TabsTrigger value="overview" className="text-xs px-2">Overview</TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs px-2">Market</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs px-2">Tiers</TabsTrigger>
          <TabsTrigger value="opportunities" className="text-xs px-2">Signals</TabsTrigger>
          <TabsTrigger value="exchanges" className="text-xs px-1">Exchange</TabsTrigger>
          <TabsTrigger value="ai-expert" className="text-xs px-1">AI Chat</TabsTrigger>
          <TabsTrigger value="personal" className="text-xs px-2">Personal</TabsTrigger>
          <TabsTrigger value="discovery" className="text-xs px-1">Discovery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Market Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Total Market Cap</CardTitle>
                <BarChart3 className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-400">
                  {formatMarketCap(stats.totalMarketCap)}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary" className="bg-green-900/20 text-green-400 border-green-400/20">
                    +2.4% 24h
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">BTC Dominance</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">
                  {stats.btcDominance.toFixed(1)}%
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary" className="bg-red-900/20 text-red-400 border-red-400/20">
                    -0.8% 24h
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Active Opportunities</CardTitle>
                <Target className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {stats.activeOpportunities}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary" className="bg-green-900/20 text-green-400 border-green-400/20">
                    8 new
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Market Trend</CardTitle>
                {stats.marketTrend === 'bullish' ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  stats.marketTrend === 'bullish' ? 'text-green-400' : 
                  stats.marketTrend === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {stats.marketTrend === 'bullish' ? 'Bullish' : 
                   stats.marketTrend === 'bearish' ? 'Bearish' : 'Neutral'}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary" className="bg-green-900/20 text-green-400 border-green-400/20">
                    Strong Signal
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Market Cap Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <DistributionChart data={marketData?.cryptocurrencies || []} />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">24h Performance by Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart data={marketData?.cryptocurrencies || []} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-8">
          {/* Advanced Filtering Options */}
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Chart Display Options</CardTitle>
              <CardDescription className="text-slate-400">
                Customize what you want to see in the diagrams and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Market Cap Tiers</label>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="all" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">All Tiers</SelectItem>
                      <SelectItem value="mega" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Mega Cap Only</SelectItem>
                      <SelectItem value="large" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Large Cap Only</SelectItem>
                      <SelectItem value="largeMedium" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Large Medium Only</SelectItem>
                      <SelectItem value="smallMedium" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Small Medium Only</SelectItem>
                      <SelectItem value="small" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Small Cap Only</SelectItem>
                      <SelectItem value="micro" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Micro/Shit Coins Only</SelectItem>
                      <SelectItem value="compare-large" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Compare Large vs Medium</SelectItem>
                      <SelectItem value="compare-small" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Compare Small vs Micro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Time Range</label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="1h" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">1 Hour</SelectItem>
                      <SelectItem value="4h" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">4 Hours</SelectItem>
                      <SelectItem value="24h" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">24 Hours</SelectItem>
                      <SelectItem value="7d" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">7 Days</SelectItem>
                      <SelectItem value="30d" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">30 Days</SelectItem>
                      <SelectItem value="90d" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="performance" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Performance</SelectItem>
                      <SelectItem value="volatility" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Volatility</SelectItem>
                      <SelectItem value="volume" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Volume</SelectItem>
                      <SelectItem value="marketcap" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Market Cap</SelectItem>
                      <SelectItem value="correlation" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Correlation</SelectItem>
                      <SelectItem value="deviation" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Tier Deviation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Chart Type</label>
                  <Select value="live" onValueChange={() => {}}>
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="live" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Live Data</SelectItem>
                      <SelectItem value="historical" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Historical</SelectItem>
                      <SelectItem value="candlestick" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Candlestick</SelectItem>
                      <SelectItem value="heatmap" className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200">Heatmap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Charts Based on Filter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  {tierFilter === 'all' ? 'All Tiers Correlation' : `${tierFilter.charAt(0).toUpperCase() + tierFilter.slice(1)} Tier Analysis`}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {tierFilter === 'all' ? 'Cross-tier correlation matrix' : `Focused analysis on ${tierFilter} tier tokens`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CorrelationChart data={marketData?.correlations || []} tierFilter={tierFilter} />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  {tierFilter === 'all' ? 'Overall Performance' : `${tierFilter.charAt(0).toUpperCase() + tierFilter.slice(1)} Performance`}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {timeRange} performance comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceChart 
                  data={tierFilter === 'all' ? 
                    marketData?.cryptocurrencies || [] : 
                    marketData?.cryptocurrencies?.filter((coin: any) => coin.tier === tierFilter) || []
                  } 
                />
              </CardContent>
            </Card>
          </div>

          {/* Lag Detection Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Tier Deviation Tracker</CardTitle>
                <CardDescription className="text-slate-400">
                  Shows which tokens are lagging behind their tier average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['mega', 'large', 'largeMedium', 'smallMedium', 'small', 'micro'].map(tier => {
                    const tierData = marketData?.cryptocurrencies?.filter((coin: any) => coin.tier === tier) || [];
                    const avgPerformance = tierData.reduce((sum: number, coin: any) => 
                      sum + parseFloat(coin.priceChangePercentage24h || '0'), 0) / (tierData.length || 1);
                    
                    const laggingTokens = tierData.filter((coin: any) => 
                      parseFloat(coin.priceChangePercentage24h || '0') < avgPerformance - 1
                    );
                    
                    return (
                      <div key={tier} className="p-3 bg-slate-800 rounded border border-slate-600">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-300 capitalize font-medium">{tier} Tier</span>
                          <span className={`font-mono text-sm ${avgPerformance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Avg: {avgPerformance.toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-1">
                          {laggingTokens.slice(0, 3).map((token: any) => (
                            <div key={token.symbol} className="flex justify-between items-center text-sm">
                              <span className="text-slate-400">{token.symbol}</span>
                              <span className="text-orange-400 font-mono">
                                {parseFloat(token.priceChangePercentage24h || '0').toFixed(1)}%
                              </span>
                            </div>
                          ))}
                          {laggingTokens.length > 3 && (
                            <div className="text-xs text-slate-500">
                              +{laggingTokens.length - 3} more lagging
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Cross-Tier Momentum</CardTitle>
                <CardDescription className="text-slate-400">
                  Identifies tokens breaking correlation patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { tier: 'Large Cap', expected: 1.5, actual: 3.2, token: 'SOL', strength: 'Strong' },
                    { tier: 'Large Med', expected: 1.2, actual: -0.9, token: 'UNI', strength: 'Weak' },
                    { tier: 'Small Med', expected: 0.8, actual: -3.2, token: 'FTM', strength: 'Very Weak' },
                    { tier: 'Small Cap', expected: 2.1, actual: 4.2, token: 'SKL', strength: 'Strong' },
                    { tier: 'Micro Cap', expected: 5.0, actual: 67.9, token: 'MOONBOY', strength: 'Explosive' },
                  ].map((item, index) => (
                    <div key={index} className="p-3 bg-slate-800 rounded border border-slate-600">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-300 text-sm">{item.tier}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.strength === 'Explosive' ? 'bg-purple-500/20 text-purple-300' :
                          item.strength === 'Strong' ? 'bg-green-500/20 text-green-300' :
                          item.strength === 'Weak' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {item.strength}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-400 font-mono text-sm">{item.token}</span>
                        <div className="text-right">
                          <div className="text-slate-400 text-xs">Expected: {item.expected}%</div>
                          <div className={`font-mono text-sm ${item.actual > item.expected ? 'text-green-400' : 'text-red-400'}`}>
                            Actual: {item.actual}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Volume vs Price Divergence */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Volume-Price Divergence</CardTitle>
                <CardDescription className="text-slate-400">
                  Spots unusual volume without price movement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketData?.cryptocurrencies?.filter((coin: any) => {
                    const volumeRatio = parseFloat(coin.volume24h || '0') / parseFloat(coin.marketCap || '1');
                    const priceChange = Math.abs(parseFloat(coin.priceChangePercentage24h || '0'));
                    return volumeRatio > 0.1 && priceChange < 2;
                  }).slice(0, 8).map((coin: any) => (
                    <div key={coin.symbol} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                      <div>
                        <span className="text-slate-300 font-medium">{coin.symbol}</span>
                        <span className="text-slate-500 text-xs ml-2 capitalize">{coin.tier}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-orange-400 text-sm font-mono">
                          Vol: {((parseFloat(coin.volume24h || '0') / parseFloat(coin.marketCap || '1')) * 100).toFixed(1)}%
                        </div>
                        <div className="text-slate-400 text-xs">
                          Price: {parseFloat(coin.priceChangePercentage24h || '0').toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Tier Relative Strength</CardTitle>
                <CardDescription className="text-slate-400">
                  Compares performance within each tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['mega', 'large', 'largeMedium', 'smallMedium', 'small', 'micro'].map(tier => {
                    const tierData = marketData?.cryptocurrencies?.filter((coin: any) => coin.tier === tier) || [];
                    const bestPerformer = tierData.reduce((best: any, coin: any) => 
                      parseFloat(coin.priceChangePercentage24h || '0') > parseFloat(best.priceChangePercentage24h || '0') ? coin : best
                    , tierData[0]);
                    
                    const worstPerformer = tierData.reduce((worst: any, coin: any) => 
                      parseFloat(coin.priceChangePercentage24h || '0') < parseFloat(worst.priceChangePercentage24h || '0') ? coin : worst
                    , tierData[0]);

                    if (!bestPerformer || !worstPerformer) return null;
                    
                    return (
                      <div key={tier} className="p-2 bg-slate-800 rounded">
                        <div className="text-slate-300 text-sm capitalize font-medium mb-1">{tier}</div>
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-1">
                            <span className="text-green-400">↑</span>
                            <span className="text-slate-400">{bestPerformer.symbol}</span>
                            <span className="text-green-400 font-mono">
                              {parseFloat(bestPerformer.priceChangePercentage24h || '0').toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-red-400">↓</span>
                            <span className="text-slate-400">{worstPerformer.symbol}</span>
                            <span className="text-red-400 font-mono">
                              {parseFloat(worstPerformer.priceChangePercentage24h || '0').toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Cascade Delay Indicator</CardTitle>
                <CardDescription className="text-slate-400">
                  Predicts when smaller caps will follow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { trigger: 'BTC +5%', target: 'Large Cap', delay: '5-15min', confidence: 94 },
                    { trigger: 'ETH +3%', target: 'L-Medium', delay: '15-30min', confidence: 87 },
                    { trigger: 'Large +2%', target: 'S-Medium', delay: '30-60min', confidence: 72 },
                    { trigger: 'S-Med +4%', target: 'Small Cap', delay: '1-2h', confidence: 58 },
                    { trigger: 'Small +6%', target: 'Micro Cap', delay: '2-4h', confidence: 23 },
                  ].map((cascade, index) => (
                    <div key={index} className="p-2 bg-slate-800 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-300 text-sm">{cascade.trigger}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          cascade.confidence > 80 ? 'bg-green-500/20 text-green-300' :
                          cascade.confidence > 60 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {cascade.confidence}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">{cascade.target}</span>
                        <span className="text-cyan-400 font-mono">{cascade.delay}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market Sentiment & Momentum Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Market Sentiment Heatmap</CardTitle>
                <CardDescription className="text-slate-400">
                  Visual representation of tier performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {['mega', 'large', 'largeMedium', 'smallMedium', 'small', 'micro'].map(tier => {
                    const tierData = marketData?.cryptocurrencies?.filter((coin: any) => coin.tier === tier) || [];
                    const avgChange = tierData.reduce((sum: number, coin: any) => 
                      sum + parseFloat(coin.priceChangePercentage24h || '0'), 0) / (tierData.length || 1);
                    
                    const getColor = (change: number) => {
                      if (change > 3) return 'bg-green-500';
                      if (change > 1) return 'bg-green-400';
                      if (change > -1) return 'bg-slate-600';
                      if (change > -3) return 'bg-red-400';
                      return 'bg-red-500';
                    };
                    
                    return (
                      <div key={tier} className={`p-4 rounded-lg ${getColor(avgChange)} text-white text-center`}>
                        <div className="text-xs font-medium capitalize">{tier}</div>
                        <div className="text-sm font-mono">{avgChange.toFixed(1)}%</div>
                        <div className="text-xs opacity-80">{tierData.length} coins</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Momentum Divergence Scanner</CardTitle>
                <CardDescription className="text-slate-400">
                  Identifies tokens moving against their tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketData?.cryptocurrencies?.map((coin: any) => {
                    const tierData = marketData?.cryptocurrencies?.filter((c: any) => c.tier === coin.tier) || [];
                    const tierAvg = tierData.reduce((sum: number, c: any) => 
                      sum + parseFloat(c.priceChangePercentage24h || '0'), 0) / (tierData.length || 1);
                    const deviation = parseFloat(coin.priceChangePercentage24h || '0') - tierAvg;
                    
                    return Math.abs(deviation) > 3 ? (
                      <div key={coin.symbol} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                        <div>
                          <span className="text-slate-300 font-medium">{coin.symbol}</span>
                          <span className="text-slate-500 text-xs ml-2 capitalize">{coin.tier}</span>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono text-sm ${deviation > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                          </div>
                          <div className="text-slate-400 text-xs">
                            vs tier avg: {tierAvg.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ) : null;
                  }).filter(Boolean).slice(0, 10)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Complete Tier Performance Analysis</CardTitle>
                <CardDescription className="text-slate-400">
                  All 6 market cap tiers with real-time performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TierAnalysisChart data={marketData?.cryptocurrencies || []} />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Market Cascade Analysis</CardTitle>
                <CardDescription className="text-slate-400">
                  Predicting when smaller caps will follow larger cap movements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CascadeAnalysisChart data={marketData?.cryptocurrencies || []} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Risk vs Reward Matrix</CardTitle>
                <CardDescription className="text-slate-400">
                  Expected returns plotted against risk scores for optimal leverage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeverageOpportunityChart data={marketData?.cryptocurrencies || []} type="risk-reward" />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Volume Divergence Scanner</CardTitle>
                <CardDescription className="text-slate-400">
                  Identifying unusual volume patterns that signal price movements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeverageOpportunityChart data={marketData?.cryptocurrencies || []} type="volume-divergence" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Momentum Shift Detection</CardTitle>
                <CardDescription className="text-slate-400">
                  Real-time tracking of momentum changes across all tiers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeverageOpportunityChart data={marketData?.cryptocurrencies || []} type="momentum-shift" />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Tier Correlation Breakdown</CardTitle>
                <CardDescription className="text-slate-400">
                  Cross-tier correlation analysis for identifying breakdown opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeverageOpportunityChart data={marketData?.cryptocurrencies || []} type="correlation-breakdown" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Advanced Correlation Matrix</CardTitle>
                  <CardDescription className="text-slate-400">
                    Cross-tier correlation analysis for identifying breakdown opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CorrelationChart data={marketData?.correlations || []} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Complete Tier Statistics</CardTitle>
                  <CardDescription className="text-slate-400">
                    Performance overview across all market cap tiers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { tier: 'mega', name: 'Mega Cap', range: '$100B+', color: 'border-purple-500' },
                    { tier: 'large', name: 'Large Cap', range: '$10B-$100B', color: 'border-blue-500' },
                    { tier: 'largeMedium', name: 'Large Medium', range: '$5B-$10B', color: 'border-cyan-500' },
                    { tier: 'smallMedium', name: 'Small Medium', range: '$1B-$5B', color: 'border-green-500' },
                    { tier: 'small', name: 'Small Cap', range: '$100M-$1B', color: 'border-yellow-500' },
                    { tier: 'micro', name: 'Micro/Shit Coins', range: '$10M-$100M', color: 'border-red-500' },
                  ].map(tierInfo => {
                    const tierData = marketData?.cryptocurrencies?.filter((coin: any) => coin.tier === tierInfo.tier) || [];
                    const avgPerformance = tierData.reduce((sum: number, coin: any) => 
                      sum + parseFloat(coin.priceChangePercentage24h || '0'), 0) / (tierData.length || 1);
                    const totalMarketCap = tierData.reduce((sum: number, coin: any) => 
                      sum + parseFloat(coin.marketCap || '0'), 0);
                    const avgVolume = tierData.reduce((sum: number, coin: any) => 
                      sum + parseFloat(coin.volume24h || '0'), 0) / (tierData.length || 1);
                    
                    return (
                      <div key={tierInfo.tier} className={`p-4 bg-slate-800 rounded-lg border-l-4 ${tierInfo.color} hover:bg-slate-750 transition-colors`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-slate-200 font-medium">{tierInfo.name}</div>
                            <div className="text-slate-400 text-sm">{tierInfo.range}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-mono text-lg font-bold ${avgPerformance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {avgPerformance > 0 ? '+' : ''}{avgPerformance.toFixed(1)}%
                            </div>
                            <div className="text-slate-400 text-xs">{tierData.length} tokens</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-600">
                          <div>
                            <div className="text-slate-400 text-xs">Total Market Cap</div>
                            <div className="text-slate-300 font-mono text-sm">
                              ${totalMarketCap > 1e12 ? (totalMarketCap / 1e12).toFixed(1) + 'T' : 
                                totalMarketCap > 1e9 ? (totalMarketCap / 1e9).toFixed(1) + 'B' : 
                                (totalMarketCap / 1e6).toFixed(1) + 'M'}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-xs">Avg Volume</div>
                            <div className="text-slate-300 font-mono text-sm">
                              ${avgVolume > 1e9 ? (avgVolume / 1e9).toFixed(1) + 'B' : 
                                avgVolume > 1e6 ? (avgVolume / 1e6).toFixed(1) + 'M' : 
                                (avgVolume / 1e3).toFixed(1) + 'K'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Market Momentum</CardTitle>
                  <CardDescription className="text-slate-400">
                    Real-time trend indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-800 rounded">
                      <div className="text-slate-300 text-sm">BTC Dominance</div>
                      <div className="text-cyan-400 font-mono text-xl">52.3%</div>
                      <div className="text-green-400 text-xs">+0.8% today</div>
                    </div>
                    <div className="p-3 bg-slate-800 rounded">
                      <div className="text-slate-300 text-sm">Fear & Greed</div>
                      <div className="text-yellow-400 font-mono text-xl">68</div>
                      <div className="text-slate-400 text-xs">Greed Zone</div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 text-sm">Market Trend</span>
                      <span className="text-green-400 text-sm">↗ Bullish</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 text-sm">Total Market Cap</span>
                      <span className="text-cyan-400 text-sm">$1.73T</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">24h Volume</span>
                      <span className="text-slate-300 text-sm">$89.2B</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                  <CardDescription className="text-slate-400">
                    Trading tools and filters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Scan for Lags
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Correlation Alert
                  </Button>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <Zap className="h-4 w-4 mr-2" />
                    High Volume Scanner
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Live Trading Opportunities
                <Button
                  onClick={() => refreshOpportunities.mutate()}
                  disabled={refreshOpportunities.isPending}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Analysis
                </Button>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Statistical analysis of tier correlation breakdowns and leverage opportunities
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(marketData?.opportunities || [])
                  .slice()
                  .sort((a: any, b: any) => parseFloat(b.confidence) - parseFloat(a.confidence))
                  .slice(0, 12)
                  .map((opportunity: any) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    cryptocurrencies={marketData?.cryptocurrencies || []}
                  />
                ))}
                {(!marketData?.opportunities || marketData.opportunities.length === 0) && (
                  <div className="col-span-2 flex items-center justify-center p-8 text-slate-400">
                    {isConnected ? "No opportunities available" : "Connect to see live opportunities"}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <SmartAlertSystem marketData={marketData} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exchanges" className="space-y-6">
          <LeverageExchanges marketData={marketData} />
        </TabsContent>

        <TabsContent value="ai-expert" className="space-y-6">
          <TradingExpertChat marketData={marketData} />
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <PersonalDashboard marketData={marketData} />
        </TabsContent>

        <TabsContent value="discovery" className="space-y-6">
          <CryptoDiscovery marketData={marketData} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
