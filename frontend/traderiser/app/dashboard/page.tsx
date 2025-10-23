"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { BalanceCard } from "@/components/dashboard/balance-card"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { DepositModal } from "@/components/dashboard/deposit-modal"
import { WithdrawModal } from "@/components/dashboard/withdraw-modal"
import { TradingViewWidget } from "@/components/dashboard/trading-view"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface DashboardData {
  user: {
    username: string
    email: string
    phone: string
    is_sashi: boolean
    is_email_verified: boolean
    accounts: Array<{
      id: number
      account_type: string
      balance: number
      kyc_verified: boolean
    }>
  }
  accounts: Array<{
    account_type: string
    balance: number
    transactions: Array<{
      id: number
      amount: number
      transaction_type: "deposit" | "withdrawal" | "trade"
      description: string
      created_at: string
    }>
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>("standard")

  // ✅ SONNER: Clean notification helpers
  const showSuccess = (message: string) => toast.success(message)
  const showError = (message: string) => toast.error(message)
  const showInfo = (message: string) => toast(message)

  useEffect(() => {
    // Set selectedAccount from localStorage on client side
    if (typeof window !== "undefined") {
      const storedAccountType = localStorage.getItem("account_type") || "standard"
      setSelectedAccount(storedAccountType)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [selectedAccount])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const { data: dashboardData, error: apiError } = await api.getDashboard()
      if (apiError) {
        throw new Error(apiError as string)
      }
      
      setData(dashboardData as DashboardData)
      const storedAccountType =
        typeof window !== "undefined" 
          ? localStorage.getItem("account_type") || dashboardData.accounts[0]?.account_type || "standard" 
          : "standard"
      
      setSelectedAccount(storedAccountType)
      
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "user_session",
          JSON.stringify({
            username: dashboardData.user.username,
            email: dashboardData.user.email,
            balance: dashboardData.accounts.find((acc) => acc.account_type === storedAccountType)?.balance || 0,
            accountType: storedAccountType === "standard" ? "real" : "demo",
          })
        )
        // Trigger custom storage change event
        window.dispatchEvent(new Event("custom-storage-change"))
      }
      
      // ✅ SILENT: No load toast to prevent spam
    } catch (err) {
      const errorMessage = (err as Error).message
      setError(errorMessage)
      showError(`Failed to load dashboard: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || Number.parseFloat(depositAmount) <= 0) {
      showError("Please enter a valid amount")
      return
    }

    setTransactionLoading(true)
    try {
      const { data: result, error: apiError } = await api.deposit({
        amount: Number.parseFloat(depositAmount),
        account_type: selectedAccount,
      })

      if (apiError) {
        throw new Error(apiError as string)
      }
      
      showSuccess(`✅ Deposit successful! +$${depositAmount}`)
      setDepositAmount("")
      setShowDepositModal(false)
      fetchDashboard()
    } catch (err) {
      showError(`Deposit failed: ${(err as Error).message}`)
    } finally {
      setTransactionLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      showError("Please enter a valid amount")
      return
    }

    setTransactionLoading(true)
    try {
      const { data: result, error: apiError } = await api.withdraw({
        amount: Number.parseFloat(withdrawAmount),
        account_type: selectedAccount,
      })

      if (apiError) {
        throw new Error(apiError as string)
      }
      
      showSuccess(`✅ Withdrawal successful! -$${withdrawAmount}`)
      setWithdrawAmount("")
      setShowWithdrawModal(false)
      fetchDashboard()
    } catch (err) {
      showError(`Withdrawal failed: ${(err as Error).message}`)
    } finally {
      setTransactionLoading(false)
    }
  }

  const handleResetDemo = async () => {
    if (selectedAccount !== "demo") return

    setTransactionLoading(true)
    try {
      const { data: result, error: apiError } = await api.resetDemoBalance()

      if (apiError) {
        throw new Error(apiError as string)
      }
      
      showSuccess("✅ Demo balance reset to $10,000!")
      fetchDashboard()
    } catch (err) {
      showError(`Reset failed: ${(err as Error).message}`)
    } finally {
      setTransactionLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("account_type")
    localStorage.removeItem("user_session")
    window.dispatchEvent(new Event("custom-storage-change"))
    showSuccess("👋 Logged out successfully")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2 text-red-400">Dashboard Error</h2>
          <p className="text-white/80 mb-6">{error}</p>
          <Button
            onClick={fetchDashboard}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold px-6 py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
          >
            🔄 Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2 text-white">No Data</h2>
          <p className="text-white/80 mb-6">No dashboard data available</p>
          <Button
            onClick={fetchDashboard}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold px-6 py-3 rounded-lg"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>
    )
  }

  const selectedAccountData = data.accounts.find((acc) => acc.account_type === selectedAccount) || data.accounts[0]
  const isRealAccount = selectedAccountData?.account_type !== "demo"

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Account Icon Display */}
        <div className="flex items-center gap-4 mb-6 sm:gap-6">
          <div className="flex-shrink-0">
            <div
              className={`w-10 h-10 sm:w-20 sm:h-20 rounded-full ${
                isRealAccount ? "from-orange-400 to-orange-500" : "from-blue-400 to-blue-500"
              } bg-gradient-to-br flex items-center justify-center overflow-hidden shadow-md`}
            >
              <Image
                src={isRealAccount ? "/real-account-icon.png" : "/demo-account-icon.png"}
                alt={isRealAccount ? "Real Account" : "Demo Account"}
                width={30}
                height={30}
                className="w-14 h-14 sm:w-16 sm:h-16 object-cover"
              />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              {isRealAccount ? "Real Account" : "Demo Account"}
            </h3>
            <p className="text-sm sm:text-base text-white/70">
              {isRealAccount
                ? "Trade with real money and earn real profits."
                : "Practice trading with $10,000 virtual balance."}
            </p>
          </div>
        </div>

        <BalanceCard
          balance={selectedAccountData?.balance || 0}
          username={data.user.username}
          isRealAccount={isRealAccount}
          showBalance={showBalance}
          onToggleBalance={() => setShowBalance(!showBalance)}
        />

        {/* Conditional Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {isRealAccount ? (
            <>
              <Button 
                onClick={() => setShowDepositModal(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
              >
                💰 Deposit
              </Button>
              <Button 
                onClick={() => setShowWithdrawModal(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
              >
                💸 Withdraw
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleResetDemo}
              disabled={transactionLoading}
              className="col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
            >
              {transactionLoading ? "🔄 Resetting..." : "🔄 Reset Demo Balance to $10,000"}
            </Button>
          )}
        </div>

        <div className="w-full" style={{ minHeight: "400px" }}>
          <TradingViewWidget symbol="EURUSD" />
        </div>

        <TransactionHistory transactions={selectedAccountData?.transactions || []} />

        <DepositModal
          isOpen={showDepositModal}
          amount={depositAmount}
          onAmountChange={setDepositAmount}
          onClose={() => setShowDepositModal(false)}
          onSubmit={handleDeposit}
          isLoading={transactionLoading}
        />

        <WithdrawModal
          isOpen={showWithdrawModal}
          amount={withdrawAmount}
          onAmountChange={setWithdrawAmount}
          onClose={() => setShowWithdrawModal(false)}
          onSubmit={handleWithdraw}
          isLoading={transactionLoading}
        />
      </div>
    </div>
  )
}