import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Settings, Download, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  onRefresh: () => void;
}

export default function Header({ isConnected, lastUpdate, onRefresh }: HeaderProps) {
  const { toast } = useToast();

  const handleExport = () => {
    // TODO: Implement data export functionality
    toast({
      title: "Export Data",
      description: "Data export functionality coming soon",
    });
  };

  const handleSettings = () => {
    // TODO: Implement settings functionality
    toast({
      title: "Settings",
      description: "Settings panel coming soon",
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "--:--:--";
    return date.toLocaleTimeString();
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="text-cyan-400 h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold text-white">CryptoMarketCapArb</h1>
              <p className="text-xs text-slate-400">BTC/ETH lag-propagation signals</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 ml-8">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-400" />
                  <Badge variant="secondary" className="bg-green-900/20 text-green-400 border-green-400/20">
                    Live Market Data
                  </Badge>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-400" />
                  <Badge variant="secondary" className="bg-red-900/20 text-red-400 border-red-400/20">
                    Disconnected
                  </Badge>
                </>
              )}
            </div>
            
            <div className="text-sm text-slate-400">
              Last Update: <span className="text-cyan-400">{formatTime(lastUpdate)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={onRefresh}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSettings}
            className="border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-green-400/20 text-green-400 hover:bg-green-400/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>
    </header>
  );
}
