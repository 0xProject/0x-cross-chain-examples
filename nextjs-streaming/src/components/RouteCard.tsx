interface Route {
  id?: string;
  sellAmount: string;
  buyAmount: string;
  minBuyAmount: string;
  estimatedTimeSeconds: number;
  gasCosts: {
    totalNetworkFee: string;
  };
  allowanceTarget: string;
  seqNum: number;
  displayIndex?: number;
}

interface RouteCardProps {
  route: Route;
}

export default function RouteCard({ route }: RouteCardProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatAmount = (amount: string, decimals = 6) => {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
  };

  const formatGas = (gasWei: string) => {
    const gasEth = parseFloat(gasWei) / Math.pow(10, 18);
    if (gasEth < 0.001) return '< 0.001 ETH';
    return `${gasEth.toFixed(4)} ETH`;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Route #{route.displayIndex || route.seqNum}
          </span>
          <span className="text-sm text-gray-500">
            ~{formatTime(route.estimatedTimeSeconds)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Gas Cost</p>
          <p className="text-sm font-medium">{formatGas(route.gasCosts.totalNetworkFee)}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-sm text-gray-500">Sell Amount</p>
          <p className="font-medium">{formatAmount(route.sellAmount)} USDC</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Buy Amount</p>
          <p className="font-medium text-green-600">{formatAmount(route.buyAmount)} USDC</p>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        <p>Min Buy: {formatAmount(route.minBuyAmount)} USDC</p>
        <p className="truncate">Allowance Target: {route.allowanceTarget}</p>
      </div>
    </div>
  );
}