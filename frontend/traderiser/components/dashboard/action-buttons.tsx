"use client"

import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

interface ActionButtonsProps {
  onDeposit: () => void
  onWithdraw: () => void
}

export function ActionButtons({ onDeposit, onWithdraw }: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <button
        onClick={onDeposit}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2"
      >
        <ArrowDownLeft size={20} />
        Deposit
      </button>
      <button
        onClick={onWithdraw}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2"
      >
        <ArrowUpRight size={20} />
        Withdraw
      </button>
    </div>
  )
}