"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { RobotMarketplace } from "@/components/robots/robot-marketplace"
import { UserRobots } from "@/components/robots/user-robots"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

interface DashboardData {
  user: {
    username: string
  }
  accounts: Array<{
    account_type: string
    balance: number
  }>
}

export default function RobotsPage() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error: apiError } = await api.getDashboard()
      if (apiError) {
        setError(apiError)
      } else {
        const dashboard = data as DashboardData
        setDashboardData(dashboard)
        const selectedAccountType = localStorage.getItem("account_type") || "standard"
        const selectedAccount = dashboard.accounts.find((acc) => acc.account_type === selectedAccountType)
        if (selectedAccount) {
          setBalance(selectedAccount.balance)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading robots...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Trading Robots</h1>
          <p className="text-white/60">Purchase and manage automated trading robots</p>
        </div>

        {/* Balance Card */}
        <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20 mb-8">
          <p className="text-sm text-white/60 mb-2">Account Balance</p>
          <p className="text-4xl font-bold text-white">${balance.toFixed(2)}</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="marketplace" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/10 border border-white/20">
            <TabsTrigger value="marketplace" className="text-white data-[state=active]:bg-pink-500">
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="my-robots" className="text-white data-[state=active]:bg-pink-500">
              My Robots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace">
            <RobotMarketplace balance={balance} onBalanceChange={setBalance} />
          </TabsContent>

          <TabsContent value="my-robots">
            <UserRobots />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}