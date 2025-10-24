"use client"

import { useState } from "react"

import { formatCurrency } from "@/lib/format-currency"
import { api } from "@/lib/api" // Declare the api variable

interface DepositModalProps {
  onClose: () => void
  onSuccess?: () => void
}

export function DepositModal({ onClose, onSuccess }: DepositModalProps) {
  const [step, setStep] = useState<"account" | "amount">("account")
  const [selectedAccount, setSelectedAccount] = useState("main")
  const [kesAmount, setKesAmount] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const conversionRate = 133.5
  const usdAmount = (Number.parseFloat(kesAmount) / conversionRate).toFixed(2)
  const minimumDeposit = 5

  const handleNumpadClick = (value: string) => {
    if (value === "backspace") {
      setKesAmount(kesAmount.slice(0, -1))
    } else if (value === ".") {
      if (!kesAmount.includes(".")) {
        setKesAmount(kesAmount + value)
      }
    } else {
      setKesAmount(kesAmount + value)
    }
  }

  const handleProceed = async () => {
    const usd = Number.parseFloat(usdAmount)
    if (usd < minimumDeposit) {
      setError(`Minimum deposit amount is ${minimumDeposit} USD`)
      return
    }

    if (!phoneNumber.trim()) {
      setError("Please enter your phone number")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const res = await api.deposit({
        amount: kesAmount,
        currency: "KSH",
        wallet_type: selectedAccount,
        mpesa_phone: phoneNumber,
      })
      if (res.error) throw new Error(res.error)

      const ref = (res.data as any)?.reference_id ?? (res.data as any)?.referenceId ?? "N/A"
      const msg = (res.data as any)?.message ?? ""
      alert(`Deposit initiated! Reference: ${ref}\n${msg}`)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError((err as Error).message || "Failed to process deposit")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <button onClick={onClose} className="text-2xl font-bold text-slate-900">
            ✕
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Deposit</h2>
          <div className="w-6" />
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto pb-20">
          {step === "account" ? (
            <>
              {/* Account Selection Step */}
              <div>
                <p className="text-slate-600 text-center mb-3 sm:mb-4 text-sm sm:text-base">To</p>
                <div className="flex gap-2 sm:gap-3 justify-center mb-6 sm:mb-8 flex-wrap">
                  <button
                    onClick={() => setSelectedAccount("main")}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-colors ${
                      selectedAccount === "main" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    TradeR
                  </button>
                  <button
                    onClick={() => setSelectedAccount("trading")}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-colors ${
                      selectedAccount === "trading" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    MT5
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep("amount")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                Next
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* Amount Step */}
              <div>
                <p className="text-slate-600 text-center mb-2 text-sm sm:text-base">You Pay</p>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-1">
                  {formatCurrency(kesAmount || "0")} KES
                </div>
                <p className="text-center text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6">
                  Conversion rate: 1 USD = {formatCurrency(conversionRate)} KES
                </p>
                <p className="text-slate-600 text-center mb-2 text-sm sm:text-base">You Get</p>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-6 sm:mb-8">
                  {formatCurrency(usdAmount || "0.00")} USD
                </div>
              </div>

              {/* Phone Number */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-slate-600 text-sm mb-2">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="254712345678"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-none transition-colors text-slate-900 placeholder-slate-400"
                />
              </div>

              <p className="text-center text-slate-600 text-xs sm:text-base">
                Minimum deposit amount is {minimumDeposit} USD
              </p>

              {error && <p className="text-red-600 text-sm text-center">{error}</p>}

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumpadClick(num)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 px-2 sm:px-6 rounded-2xl transition-colors text-base sm:text-xl"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpadClick(".")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 px-2 sm:px-6 rounded-2xl transition-colors text-base sm:text-xl"
                >
                  .
                </button>
                <button
                  onClick={() => handleNumpadClick("0")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 px-2 sm:px-6 rounded-2xl transition-colors text-base sm:text-xl"
                >
                  0
                </button>
                <button
                  onClick={() => handleNumpadClick("backspace")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 px-2 sm:px-6 rounded-2xl transition-colors text-base sm:text-xl"
                >
                  ⌫
                </button>
              </div>

              {/* Deposit Button */}
              <button
                onClick={handleProceed}
                disabled={!kesAmount || isSubmitting}
                className="w-full bg-slate-200 hover:bg-slate-300 disabled:bg-slate-200 text-slate-600 font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? "Processing..." : "Deposit"}
                {!isSubmitting && (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
