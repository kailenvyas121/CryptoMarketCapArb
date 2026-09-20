import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface OpportunityCardProps {
  opportunity: any;
  cryptocurrencies?: any[];
}

export default function OpportunityCard({ opportunity, cryptocurrencies = [] }: OpportunityCardProps) {
  const token = cryptocurrencies.find((c: any) => c.id === opportunity.cryptocurrencyId);
  const symbol = token?.symbol || `ID ${opportunity.cryptocurrencyId}`;
  const analysis = opportunity.analysis || {};
  const lagGap = typeof analysis.lagGap === 'number' ? analysis.lagGap : null;
  const leaderMomentum = typeof analysis.leaderMomentum === 'number' ? analysis.leaderMomentum : null;

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-900/20 text-green-400 border-green-400/20';
      case 'medium': return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/20';
      case 'high': return 'bg-red-900/20 text-red-400 border-red-400/20';
      default: return 'bg-gray-900/20 text-gray-400 border-gray-400/20';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <div className="w-3 h-3 bg-green-400 rounded-full" />;
      case 'medium': return <div className="w-3 h-3 bg-yellow-400 rounded-full" />;
      case 'high': return <div className="w-3 h-3 bg-red-400 rounded-full" />;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getOpportunityIcon = (type: string) => {
    return type === 'long' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  return (
    <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700 hover:border-cyan-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-400/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getRiskIcon(opportunity.riskLevel)}
            <CardTitle className="text-white">
              {symbol} · {opportunity.riskLevel} risk
            </CardTitle>
          </div>
          <div className="text-right">
            <div className={`font-bold ${opportunity.riskLevel === 'low' ? 'text-green-400' : 
              opportunity.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
              Risk: {parseFloat(opportunity.riskPercentage).toFixed(0)}%
            </div>
            <div className="text-sm text-slate-400">
              Leverage: {opportunity.leverageRecommendation}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/50 rounded border border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getOpportunityIcon(opportunity.opportunityType)}
                <span className="font-medium text-white">
                  {symbol} ({opportunity.opportunityType.toUpperCase()} perp)
                </span>
              </div>
              <Badge variant="secondary" className={getRiskColor(opportunity.riskLevel)}>
                {parseFloat(opportunity.expectedReturn || '0').toFixed(1)}% Target
              </Badge>
            </div>
            
            <div className="space-y-3 text-sm text-slate-300">
              {(lagGap !== null || leaderMomentum !== null) && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {leaderMomentum !== null && (
                    <div>
                      <strong className="text-white">BTC/ETH momentum:</strong> {leaderMomentum.toFixed(2)}%
                    </div>
                  )}
                  {lagGap !== null && (
                    <div>
                      <strong className="text-white">Lag gap:</strong> {lagGap.toFixed(2)}%
                    </div>
                  )}
                </div>
              )}

              {analysis.explanation && (
                <div>
                  <strong className="text-white">Evidence:</strong> {analysis.explanation}
                </div>
              )}
              
              {analysis.statisticalSignificance && (
                <div>
                  <strong className="text-white">Statistical Significance:</strong> {analysis.statisticalSignificance.toFixed(1)}σ deviation
                </div>
              )}
              
              {analysis.strategy && (
                <div>
                  <strong className="text-white">Strategy:</strong> {analysis.strategy}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="text-xs">
                  <strong>Entry:</strong> {analysis.entryPoint || 'Market'}
                </div>
                <div className="text-xs">
                  <strong>Exit:</strong> {analysis.exitPoint || 'TBD'}
                </div>
                <div className="text-xs">
                  <strong>Stop Loss:</strong> {analysis.stopLoss || 'TBD'}
                </div>
                <div className="text-xs">
                  <strong>Confidence:</strong> {parseFloat(opportunity.confidence).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
