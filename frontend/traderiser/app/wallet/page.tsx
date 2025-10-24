"use client"

import { useEffect, useState } from "react"
import { WalletHeader } from "@/components/wallet/wallet-header"
import { BalanceCard } from "@/components/wallet/balance-card"
import { ActionButtons } from "@/components/wallet/action-buttons"
import { TransactionList } from "@/components/wallet/transaction-list"
import { DepositModal } from "@/components/wallet/deposit-modal"
import { WithdrawModal } from "@/components/wallet/withdraw-modal"
import { VerifyWithdrawalModal } from "@/components/wallet/verify-withdrawal-modal"
import { Sidebar } from "@/components/sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface DashboardData {
  user: {
    username: string
    email: string
    image?: string
  }
  accounts: Array<{
    account_type: string
    balance: string | number
  }>
  session_active: boolean
}

export default function Page() {
  const router = useRouter()
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<string>("standard")

  useEffect(() => {
    // Set selectedAccount from localStorage
    const storedAccountType = localStorage.getItem("account_type") || "standard"
    setSelectedAccount(storedAccountType)

    // Fetch user data
    const fetchDashboardData = async () => {
      try {
        const dashboardRes = await api.getDashboard()
        if (dashboardRes.error) throw new Error(dashboardRes.error as string)
        const dashboard = dashboardRes.data as DashboardData
        setDashboardData(dashboard)
        const accountObj = dashboard.accounts.find((acc) => acc.account_type === storedAccountType)
        const accountBalance = accountObj && accountObj.balance !== undefined ? Number(accountObj.balance) : 0
        if (isNaN(accountBalance)) throw new Error("Invalid balance value from API")
        setBalance(accountBalance)
      } catch (err) {
        toast.error(`Failed to load user data: ${(err as Error).message}`)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("account_type")
    localStorage.removeItem("user_session")
    window.dispatchEvent(new Event("custom-storage-change"))
    toast.success("👋 Logged out")
    router.push("/login")
  }

  const dismissMessage = () => setMessage(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white text-sm sm:text-base">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading wallet...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400 text-sm sm:text-base">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
          <p className="mb-6">Please log in to access your wallet.</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:shadow-lg transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopNavbar
        isLoggedIn={true}
        user={{
          username: dashboardData.user.username,
          email: dashboardData.user.email,
          image: dashboardData.user.image,
          accountType: selectedAccount === "standard" ? "real" : "demo",
        }}
        accountBalance={balance}
        onLogout={handleLogout}
        showBalance={true}
      />
      <Sidebar />
      <main className="min-h-screen bg-white p-4 sm:p-6 lg:p-8 md:ml-64">
        <div className="max-w-6xl mx-auto space-y-6">
          <WalletHeader />
          <BalanceCard />
          <ActionButtons
            onDeposit={() => setShowDepositModal(true)}
            onWithdraw={() => setShowWithdrawModal(true)}
          />
          <TransactionList />
          {showDepositModal && (
            <DepositModal onClose={() => setShowDepositModal(false)} onSetMessage={setMessage} />
          )}
          {showWithdrawModal && (
            <WithdrawModal
              onClose={() => setShowWithdrawModal(false)}
              onSuccess={() => setShowWithdrawModal(false)}
              onSetMessage={setMessage}
            />
          )}
          {showVerifyModal && (
            <VerifyWithdrawalModal onClose={() => setShowVerifyModal(false)} onSetMessage={setMessage} />
          )}
        </div>
      </main>

      {message && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in slide-in-from-bottom mx-auto p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Notice</h3>
              <button onClick={dismissMessage} className="text-2xl font-bold text-slate-900">
                ✕
              </button>
            </div>
            <div className="mt-4">
              <p className={message.type === "error" ? "text-red-600" : "text-green-600"}>{message.text}</p>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={dismissMessage}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold py-2 px-4 rounded-xl transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}