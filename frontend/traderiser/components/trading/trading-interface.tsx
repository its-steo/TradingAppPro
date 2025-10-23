"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TradingInterfaceProps {
  markets: Array<{ id: number; name: string; profit_multiplier: string }>
  selectedMarket: string | null
  onMarketSelect: (market: string) => void
  balance: number
  onBalanceChange: (balance: number) => void
  onSessionProfitChange: (profit: number) => void
  tradingMode?: "manual" | "robot"
  selectedRobot?: number | null
  onStartTrading?: (params: any) => void
  accountType: string // Added prop
}

interface TradeType {
  id: number
  name: string
}

export function TradingInterface({
  markets,
  selectedMarket,
  onMarketSelect,
  balance,
  onBalanceChange,
  onSessionProfitChange,
  tradingMode = "manual",
  selectedRobot,
  onStartTrading,
  accountType, // Added
}: TradingInterfaceProps) {
  const { toast } = useToast()
  const [tradeTypes, setTradeTypes] = useState<TradeType[]>([])
  const [selectedTradeType, setSelectedTradeType] = useState<number | null>(null)
  const [direction, setDirection] = useState<string>("buy")
  const [amount, setAmount] = useState<string>("1")
  const [useMartingale, setUseMartingale] = useState(false)
  const [targetProfit, setTargetProfit] = useState<string>("0")
  const [stopLoss, setStopLoss] = useState<string>("0")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchTradeTypes = async () => {
      const { data, error } = await api.getTradeTypes()
      if (error) {
        toast({
          title: "Error",
          description: "Failed to load trade types",
          variant: "destructive",
        })
      } else {
        setTradeTypes(data as TradeType[])
      }
    }
    fetchTradeTypes()
  }, [toast])

  // Determine button labels based on trade type
  const getDirectionLabels = (tradeTypeName: string | undefined) => {
    switch (tradeTypeName?.toLowerCase()) {
      case "rise/fall":
        return { primary: "Rise", secondary: "Fall" }
      case "buy/sell":
      default:
        return { primary: "Buy", secondary: "Sell" }
    }
  }

  const selectedTradeTypeName = tradeTypes.find(t => t.id === selectedTradeType)?.name
  const { primary: primaryLabel, secondary: secondaryLabel } = getDirectionLabels(selectedTradeTypeName)

  // Reset direction when trade type changes
  useEffect(() => {
    setDirection(primaryLabel.toLowerCase())
  }, [selectedTradeType, primaryLabel])

  const handlePlaceTrade = async () => {
    setIsLoading(true)
    try {
      const marketObj = markets.find(m => m.name === selectedMarket)
      if (!marketObj || !selectedTradeType || !amount) {
        throw new Error("Missing required fields")
      }
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid amount")
      }
      if (amountNum > balance) {
        throw new Error("Insufficient balance")
      }

      const params = {
        market_id: marketObj.id,
        trade_type_id: selectedTradeType,
        direction,
        amount: amountNum,
        account_type: accountType, // Use prop
        use_martingale: useMartingale,
        martingale_level: 0,
        targetProfit: parseFloat(targetProfit) || 0,
        stopLoss: parseFloat(stopLoss) || 0,
      }

      const response = await api.placeTrade(params)
      if (response.error) {
        throw new Error(response.error)
      }

      // Safely extract profit from response.data (it may be unknown)
      let profit = 0
      const data = response.data
      if (typeof data === "object" && data !== null && "profit" in data) {
        profit = parseFloat((data as any).profit) || 0
      } else if (typeof data === "string" || typeof data === "number") {
        profit = parseFloat(String(data)) || 0
      }

      onBalanceChange(balance - amountNum + profit)
      onSessionProfitChange(profit)
      onStartTrading?.({ ...params, profit })

      toast({
        title: "Trade placed",
        description: `Profit: $${profit.toFixed(2)}`,
        variant: profit >= 0 ? "default" : "destructive",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white mb-2">Market</label>
        <Select
          onValueChange={onMarketSelect}
          value={selectedMarket || ""}
        >
          <SelectTrigger className="w-full bg-white/5 border-white/20 text-white h-10">
            <SelectValue placeholder="Select market" />
          </SelectTrigger>
          <SelectContent>
            {markets.map(market => (
              <SelectItem key={market.id} value={market.name}>
                {market.name} ({market.profit_multiplier}x)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Trade Type</label>
        <Select
          onValueChange={(value) => setSelectedTradeType(Number(value))}
          value={selectedTradeType?.toString() || ""}
        >
          <SelectTrigger className="w-full bg-white/5 border-white/20 text-white h-10">
            <SelectValue placeholder="Select trade type" />
          </SelectTrigger>
          <SelectContent>
            {tradeTypes.map(type => (
              <SelectItem key={type.id} value={type.id.toString()}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Direction</label>
        <div className="flex gap-3">
          <button
            onClick={() => setDirection(primaryLabel.toLowerCase())}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              direction === primaryLabel.toLowerCase()
                ? "bg-green-600 text-white"
                : "bg-white/5 border-2 border-white/20 text-white/70"
            }`}
          >
            {primaryLabel}
          </button>
          <button
            onClick={() => setDirection(secondaryLabel.toLowerCase())}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              direction === secondaryLabel.toLowerCase()
                ? "bg-red-600 text-white"
                : "bg-white/5 border-2 border-white/20 text-white/70"
            }`}
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Amount (USD)</label>
        <Input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full bg-white/5 border-white/20 text-white placeholder:text-white/40 h-10"
          min="1"
          max={balance}
        />
        <p className="text-xs text-white/50 mt-2">Available: ${balance.toFixed(2)}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Target Profit (USD)</label>
        <Input
          type="number"
          value={targetProfit}
          onChange={e => setTargetProfit(e.target.value)}
          placeholder="Optional"
          className="w-full bg-white/5 border-white/20 text-white placeholder:text-white/40 h-10"
          min="0"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Stop Loss (USD)</label>
        <Input
          type="number"
          value={stopLoss}
          onChange={e => setStopLoss(e.target.value)}
          placeholder="Optional"
          className="w-full bg-white/5 border-white/20 text-white placeholder:text-white/40 h-10"
          min="0"
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="martingale"
          checked={useMartingale}
          onChange={e => setUseMartingale(e.target.checked)}
          className="w-4 h-4 rounded border-white/20"
        />
        <label htmlFor="martingale" className="text-sm font-medium text-white cursor-pointer">
          Use Martingale
        </label>
      </div>
      <Button
        onClick={handlePlaceTrade}
        disabled={isLoading || !selectedMarket || !selectedTradeType || !amount}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg rounded-lg"
      >
        {isLoading ? "Placing Trade..." : "Place Trade"}
      </Button>
    </div>
  )
}