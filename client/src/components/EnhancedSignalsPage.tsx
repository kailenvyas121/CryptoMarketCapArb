import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, TrendingUp, TrendingDown, Target, Zap, Filter, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { useFavoriteOpportunities } from "@/hooks/useFavoriteOpportunities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EnhancedSignalsPageProps {
  marketData: any;
}

export default function EnhancedSignalsPage({ marketData }: EnhancedSignalsPageProps) {
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('confidence');
  
  const { isFavorite, toggleFavorite, isLoading: favLoading } = useFavoriteOpportunities();
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

  const getTokenInfo = (cryptocurrencyId: number) => {
    return marketData?.cryptocurrencies?.find((c: any) => c.id === cryptocurrencyId) || {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      tier: 'unknown',
      currentPrice: '0'
    };
  };

  const getTierInfo = (tier: string) => {
    const tiers = {
      mega: { name: 'Mega Cap', color: 'bg-purple-500', textColor: 'text-purple-300', range: '$100B+' },
      large: { name: 'Large Cap', color: 'bg-blue-500', textColor: 'text-blue-300', range: '$10B-$100B' },
      largeMedium: { name: 'Large Medium', color: 'bg-cyan-500', textColor: 'text-cyan-300', range: '$5B-$10B' },
      smallMedium: { name: 'Small Medium', color: 'bg-green-500', textColor: 'text-green-300', range: '$1B-$5B' },
      small: { name: 'Small Cap', color: 'bg-yellow-500', textColor: 'text-yellow-300', range: '$100M-$1B' },
      micro: { name: 'Micro/Shit Coins', color: 'bg-red-500', textColor: 'text-red-300', range: '$10M-$100M' },
    };
    return tiers[tier as keyof typeof tiers] || { name: tier, color: 'bg-gray-500', textColor: 'text-gray-300', range: 'Unknown' };
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const filterOpportunities = (opportunities: any[]) => {
    if (!opportunities) return [];
    
    return opportunities.filter((opp: any) => {
      const token = getTokenInfo(opp.cryptocurrencyId);
      
      const riskMatch = riskFilter === 'all' || opp.riskLevel.toLowerCase() === riskFilter;
      const tierMatch = tierFilter === 'all' || token.tier === tierFilter;
      const typeMatch = typeFilter === 'all' || opp.opportunityType === typeFilter;
      
      return riskMatch && tierMatch && typeMatch;
    }).sort((a: any, b: any) => {
      switch (sortBy) {
        case 'confidence':
          return parseFloat(b.confidence) - parseFloat(a.confidence);
        case 'return':
          return parseFloat(b.expectedReturn || '0') - parseFloat(a.expectedReturn || '0');
        case 'risk':
          const riskOrder = { low: 1, medium: 2, high: 3 };
          return riskOrder[a.riskLevel.toLowerCase() as keyof typeof riskOrder] - 
                 riskOrder[b.riskLevel.toLowerCase() as keyof typeof riskOrder];
        default:
          return 0;
      }
    });
  };

  const filteredOpportunities = filterOpportunities(marketData?.opportunities || []);

  const opportunityStats = {
    total: marketData?.opportunities?.length || 0,
    lowRisk: marketData?.opportunities?.filter((o: any) => o.riskLevel.toLowerCase() === 'low').length || 0,
    mediumRisk: marketData?.opportunities?.filter((o: any) => o.riskLevel.toLowerCase() === 'medium').length || 0,
    highRisk: marketData?.opportunities?.filter((o: any) => o.riskLevel.toLowerCase() === 'high').length || 0,
    avgConfidence: marketData?.opportunities?.length ? 
      marketData.opportunities.reduce((sum: number, o: any) => sum + parseFloat(o.confidence), 0) / marketData.opportunities.length : 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Signals</CardTitle>
            <Target className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">{opportunityStats.total}</div>
            <p className="text-xs text-slate-400">Active opportunities</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Low Risk</CardTitle>
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{opportunityStats.lowRisk}</div>
            <p className="text-xs text-slate-400">Conservative plays</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Medium Risk</CardTitle>
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{opportunityStats.mediumRisk}</div>
            <p className="text-xs text-slate-400">Balanced trades</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">High Risk</CardTitle>
            <div className="w-3 h-3 bg-red-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{opportunityStats.highRisk}</div>
            <p className="text-xs text-slate-400">Aggressive plays</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Avg Confidence</CardTitle>
            <Zap className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{opportunityStats.avgConfidence.toFixed(0)}%</div>
            <p className="text-xs text-slate-400">AI confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-32 bg-slate-900/80 border-slate-700">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36 bg-slate-900/80 border-slate-700">
              <SelectValue placeholder="Market Cap" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="mega">Mega Cap</SelectItem>
              <SelectItem value="large">Large Cap</SelectItem>
              <SelectItem value="largeMedium">Large Medium</SelectItem>
              <SelectItem value="smallMedium">Small Medium</SelectItem>
              <SelectItem value="small">Small Cap</SelectItem>
              <SelectItem value="micro">Micro/Shit Coins</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 bg-slate-900/80 border-slate-700">
              <SelectValue placeholder="Trade Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="arbitrage">Arbitrage</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 bg-slate-900/80 border-slate-700">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="return">Expected Return</SelectItem>
              <SelectItem value="risk">Risk Level</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={() => refreshOpportunities.mutate()}
          disabled={refreshOpportunities.isPending}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshOpportunities.isPending ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOpportunities.map((opportunity: any) => {
          const token = getTokenInfo(opportunity.cryptocurrencyId);
          const tierInfo = getTierInfo(token.tier);
          const expectedReturn = parseFloat(opportunity.expectedReturn || '0');
          const confidence = parseFloat(opportunity.confidence);
          const riskPercentage = parseFloat(opportunity.riskPercentage);
          const isFav = isFavorite(opportunity.id);

          return (
            <Card 
              key={opportunity.id} 
              className="bg-slate-900/80 backdrop-blur-sm border-slate-700 hover:border-slate-600 transition-all duration-300 hover:shadow-lg"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{token.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{token.symbol}</h3>
                      <p className="text-sm text-slate-400">{token.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getRiskColor(opportunity.riskLevel)} text-xs border`}>
                      {opportunity.riskLevel}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(opportunity.id)}
                      disabled={favLoading}
                      className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 p-1"
                    >
                      <Star className={`h-4 w-4 ${isFav ? 'fill-yellow-400' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {opportunity.opportunityType === 'long' ? (
                        <ArrowUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-sm text-slate-300 capitalize">{opportunity.opportunityType}</span>
                    </div>
                    <Badge className={`${tierInfo.color} text-white border-0 text-xs`}>
                      {tierInfo.name}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Expected Return</span>
                    <span className={`font-mono text-lg font-bold ${expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {expectedReturn >= 0 ? '+' : ''}{expectedReturn.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Confidence</p>
                      <p className="text-slate-200 font-mono">{confidence.toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Risk Level</p>
                      <p className="text-slate-200 font-mono">{riskPercentage.toFixed(1)}%</p>
                    </div>
                    {typeof opportunity.analysis?.lagGap === 'number' && (
                      <div>
                        <p className="text-slate-400">Lag gap vs BTC/ETH</p>
                        <p className="text-slate-200 font-mono">{opportunity.analysis.lagGap.toFixed(2)}%</p>
                      </div>
                    )}
                    {typeof opportunity.analysis?.leaderMomentum === 'number' && (
                      <div>
                        <p className="text-slate-400">Leader momentum</p>
                        <p className="text-slate-200 font-mono">{opportunity.analysis.leaderMomentum.toFixed(2)}%</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Leverage</span>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                        {opportunity.leverageRecommendation}
                      </Badge>
                    </div>
                    {opportunity.analysis?.entryPoint && (
                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-400">
                        <div><span className="text-slate-500">Entry:</span> {opportunity.analysis.entryPoint}</div>
                        <div><span className="text-slate-500">Exit:</span> {opportunity.analysis.exitPoint}</div>
                        <div><span className="text-slate-500">Stop:</span> {opportunity.analysis.stopLoss}</div>
                      </div>
                    )}
                  </div>
                  
                  {opportunity.analysis?.explanation && (
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {opportunity.analysis.explanation.substring(0, 100)}...
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredOpportunities.length === 0 && (
        <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Filter className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No Opportunities Found</h3>
            <p className="text-slate-400 text-center mb-6 max-w-md">
              Try adjusting your filters or refresh the analysis to find new trading opportunities.
            </p>
            <Button 
              onClick={() => {
                setRiskFilter('all');
                setTierFilter('all');
                setTypeFilter('all');
              }}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}