"use client"

import { formatCurrency } from "@/lib/format-currency"
import { VerifyWithdrawalModal } from "./verify-withdrawal-modal"
import { useState, useEffect } from "react"
import { type Wallet, api } from "@/lib/api"

interface WithdrawModalProps {
  onClose: () => void
  onSuccess?: () => void
  onSetMessage: (msg: { type: 'success' | 'error', text: string }) => void
}

export function WithdrawModal({ onClose, onSuccess, onSetMessage }: WithdrawModalProps) {
  const [step, setStep] = useState<"account" | "mpesa" | "amount">("account")
  const [selectedAccount, setSelectedAccount] = useState("main")
  const [mpesaNumber, setMpesaNumber] = useState("")
  const [usdAmount, setUsdAmount] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)

  const conversionRate = 125.0
  const kesAmount = (Number.parseFloat(usdAmount) * conversionRate).toFixed(2)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletsRes, mpesaRes] = await Promise.all([api.getWallets(), api.getMpesaNumber()])
        if (walletsRes.error) throw new Error(walletsRes.error)
        if (mpesaRes.error) console.warn(mpesaRes.error)

        setWallets(walletsRes.data?.wallets || [])
        const mainWallet = walletsRes.data?.wallets.find((w: Wallet) => w.wallet_type === "main")
        setSelectedWallet(mainWallet || walletsRes.data?.wallets[0] || null)

        setMpesaNumber(mpesaRes.data?.phone_number || "")
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }

    fetchData()
  }, [])

  const handleNumpadClick = (value: string) => {
    if (value === "backspace") {
      setUsdAmount(usdAmount.slice(0, -1))
    } else if (value === ".") {
      if (!usdAmount.includes(".")) {
        setUsdAmount(usdAmount + value)
      }
    } else {
      setUsdAmount(usdAmount + value)
    }
  }

  const handleInitiateWithdrawal = async () => {
    if (!usdAmount) {
      setError("Please enter an amount")
      return
    }

    const amount = Number.parseFloat(usdAmount)
    const balance = Number.parseFloat(selectedWallet?.balance || "0")

    if (amount > balance) {
      setError("Insufficient balance")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const res = await api.withdraw({
        amount,
        wallet_type: selectedAccount,
        target_currency: "KSH",
      })
      if (res.error) throw new Error(res.error)

      const data = res.data as { transaction_id?: string } | undefined
      setTransactionId(data?.transaction_id || "")
      setShowOTPModal(true)
      onSetMessage({ type: 'success', text: `OTP sent to your email! Transaction ID: ${data?.transaction_id || ""}` })
    } catch (err) {
      setError((err as Error).message || "Failed to process withdrawal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveMpesa = async () => {
    if (!mpesaNumber.trim()) {
      setError("Please enter M-Pesa number")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const res = await api.setMpesaNumber(mpesaNumber)
      if (res.error) throw new Error(res.error)
      setStep("amount")
    } catch (err) {
      setError((err as Error).message || "Failed to save M-Pesa number")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showOTPModal) {
    return <VerifyWithdrawalModal transactionId={transactionId} onClose={onClose} onSuccess={onSuccess} onSetMessage={onSetMessage} />
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <button onClick={onClose} className="text-2xl font-bold text-slate-900">
            ✕
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Withdraw</h2>
          <div className="w-6" />
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto pb-20">
          {step === "account" ? (
            <>
              {/* Account Selection */}
              <div>
                <p className="text-slate-600 text-center mb-3 sm:mb-4 text-sm sm:text-base">From</p>
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
                onClick={() => setStep(mpesaNumber ? "amount" : "mpesa")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                Next
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : step === "mpesa" ? (
            <>
              {/* M-Pesa Number */}
              <div>
                <label className="block text-slate-600 text-sm mb-2">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={mpesaNumber}
                  onChange={(e) => setMpesaNumber(e.target.value)}
                  placeholder="254712345678"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-none transition-colors text-slate-900 placeholder-slate-400"
                />
              </div>

              {error && <p className="text-red-600 text-sm text-center">{error}</p>}

              <button
                onClick={handleSaveMpesa}
                disabled={!mpesaNumber || isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-colors"
              >
                {isSubmitting ? "Saving..." : "Save and Continue"}
              </button>
            </>
          ) : (
            <>
              {/* Amount Input */}
              <div>
                <p className="text-slate-600 text-center mb-2 text-sm sm:text-base">You Send</p>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-1">
                  {formatCurrency(usdAmount || "0.00")} USD
                </div>
                <p className="text-center text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6">
                  Conversion rate: 1 USD = {formatCurrency(conversionRate)} KES
                </p>
                <p className="text-slate-600 text-center mb-2 text-sm sm:text-base">You Receive</p>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-6 sm:mb-8">
                  {formatCurrency(kesAmount || "0")} KES
                </div>
              </div>

              <p className="text-center text-slate-600 text-xs sm:text-base">
                Available balance is {formatCurrency(selectedWallet?.balance || "0.00")}{" "}
                {selectedWallet?.currency.code || "USD"}
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

              <button
                onClick={handleInitiateWithdrawal}
                disabled={!usdAmount || isSubmitting}
                className="w-full bg-slate-200 hover:bg-slate-300 disabled:bg-slate-200 text-slate-600 font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? "Processing..." : "Withdraw"}
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