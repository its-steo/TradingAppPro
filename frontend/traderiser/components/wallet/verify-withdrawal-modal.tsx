"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

interface VerifyWithdrawalModalProps {
  transactionId: string
  onClose: () => void
  onSuccess?: () => void
}

export function VerifyWithdrawalModal({ transactionId, onClose, onSuccess }: VerifyWithdrawalModalProps) {
  const [otpCode, setOtpCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft])

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setError("Please enter OTP code")
      return
    }

    if (otpCode.length !== 6) {
      setError("OTP must be 6 digits")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const res = await api.verifyWithdrawal({
        code: otpCode,
        transaction_id: transactionId,
      })
      if (res.error) throw new Error(res.error)

      alert("Withdrawal completed successfully!")
      onSuccess?.()
      onClose()
    } catch (err) {
      setError((err as Error).message || "Failed to verify OTP")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOTP = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      const res = await api.resendOTP(transactionId)
      if (res.error) throw new Error(res.error)

      setTimeLeft(60)
      setCanResend(false)
      setOtpCode("")
      alert("OTP resent to your email")
    } catch (err) {
      setError((err as Error).message || "Failed to resend OTP")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNumpadClick = (value: string) => {
    if (value === "backspace") {
      setOtpCode(otpCode.slice(0, -1))
    } else if (otpCode.length < 6) {
      setOtpCode(otpCode + value)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <button onClick={onClose} className="text-2xl font-bold text-slate-900">
            ✕
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Verify Withdrawal</h2>
          <div className="w-6" />
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="text-center">
            <p className="text-slate-600 text-sm sm:text-base mb-2">Enter the 6-digit code sent to your email</p>
            <p className="text-slate-500 text-xs sm:text-sm">
              Code expires in <span className="font-semibold text-purple-600">{timeLeft}s</span>
            </p>
          </div>

          {/* OTP Input */}
          <div>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              placeholder="000000"
              className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none transition-colors text-center text-2xl tracking-widest font-semibold text-slate-900"
            />
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                onClick={() => handleNumpadClick(num)}
                disabled={otpCode.length >= 6}
                className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleNumpadClick("0")}
              disabled={otpCode.length >= 6}
              className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg col-span-2"
            >
              0
            </button>
            <button
              onClick={() => handleNumpadClick("backspace")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg"
            >
              ⌫
            </button>
          </div>

          {/* Error Message */}
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          {/* Verify Button */}
          <button
            onClick={handleVerifyOTP}
            disabled={otpCode.length !== 6 || isSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors"
          >
            {isSubmitting ? "Verifying..." : "Verify and Withdraw"}
          </button>

          {/* Resend Button */}
          <button
            onClick={handleResendOTP}
            disabled={!canResend || isSubmitting}
            className="w-full text-purple-600 hover:text-purple-700 disabled:text-slate-400 font-semibold py-2 transition-colors text-sm"
          >
            {canResend ? "Resend Code" : `Resend in ${timeLeft}s`}
          </button>
        </div>
      </div>
    </div>
  )
}
