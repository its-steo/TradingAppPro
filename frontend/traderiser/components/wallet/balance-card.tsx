"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/format-currency"
import { type Wallet, api } from "@/lib/api"

export function BalanceCard() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const res = await api.getWallets()
        if (res.error) throw new Error(res.error)
        setWallets(res.data?.wallets || [])
        const mainWallet = res.data?.wallets.find((w: Wallet) => w.wallet_type === "main")
        setSelectedWallet(mainWallet || res.data?.wallets[0] || null)
      } catch (error) {
        console.error("Failed to fetch wallets:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWallets()
  }, [])

  return (
    <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
      <p className="text-xs sm:text-sm font-medium text-purple-100 mb-2">
        {selectedWallet?.wallet_type === "main" ? "TradeR" : "Trading"} Balance
      </p>
      <h2 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">
        {loading
          ? "Loading..."
          : `${formatCurrency(selectedWallet?.balance || "0.00")} ${selectedWallet?.currency.code || "USD"}`}
      </h2>

      <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-purple-500/30">
        <div>
          <p className="text-xs text-purple-100 mb-1">Account Status</p>
          <p className="text-sm font-semibold">Active</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
