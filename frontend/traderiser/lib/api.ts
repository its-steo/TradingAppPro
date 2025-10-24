
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

interface ApiResponse<T> {
  data?: T
  error?: string
  status?: number
}

export interface Currency {
  code: string
  name: string
}

export interface Wallet {
  id: number
  account_type: string
  wallet_type: string
  balance: string
  currency: Currency
  created_at: string
}

export interface WalletTransaction {
  id: number
  transaction_type: string
  amount: string
  currency: Currency
  status: string
  created_at: string
  converted_amount?: string
  target_currency?: Currency
  exchange_rate_used?: number
  
}

export interface MpesaNumberResponse {
  phone_number: string
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token")
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (response.ok) {
      const data = await response.json()
      localStorage.setItem("access_token", data.access)
      return data.access
    }
  } catch (error) {
    console.error("[v0] Token refresh failed:", error)
  }

  return null
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem("access_token")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401 && token) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        })
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          window.location.href = "/login"
        }
        return { error: "Session expired. Please login again." }
      }
    }

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || data.detail || data.message || "An error occurred" }
    }

    return { data }
  } catch (error) {
    console.error("[v0] API request failed:", error)
    return { error: "Network error. Please check your connection." }
  }
}

// Auth & Accounts
export const signup = (data: any) => apiRequest("/accounts/signup/", { method: "POST", body: JSON.stringify(data) })

export const login = (data: any) => apiRequest("/accounts/login/", { method: "POST", body: JSON.stringify(data) })

export const getAccount = () => apiRequest("/accounts/account/")

// Markets & Trading
export const getMarkets = () => apiRequest("/trading/markets/")

export const getTradeTypes = () => apiRequest("/trading/trade-types/")

export const getAssets = () => apiRequest("/trading/assets/")

export const placeTrade = (data: any) => apiRequest("/trading/trades/place/", { method: "POST", body: JSON.stringify(data) })

export const getTradeHistory = (params?: any) => {
  const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
  return apiRequest(`/trading/trades/history/${queryString}`)
}

export const cancelTrade = (tradeId: number) => apiRequest(`/trading/trades/${tradeId}/cancel/`, { method: "POST" })

export const getPriceHistory = (assetId: number) => apiRequest(`/trading/price/history/?asset_id=${assetId}`)

export const getRobots = () => apiRequest("/trading/robots/")

export const getUserRobots = () => apiRequest("/trading/user-robots/")

export const purchaseRobot = (robotId: number) => apiRequest(`/trading/robots/${robotId}/purchase/`, { method: "POST" })

export const resetDemoBalance = () => apiRequest("/trading/reset-demo-balance/", { method: "POST" })

// Bots
export const getBots = () => apiRequest("/bots/bots/")

export const createBot = (data: any) => apiRequest("/bots/bots/create/", { method: "POST", body: JSON.stringify(data) })

export const toggleBot = (botId: number) => apiRequest(`/bots/bots/${botId}/toggle/`, { method: "POST" })

export const getSubscription = () => apiRequest("/bots/subscription/")

export const subscribe = () => apiRequest("/bots/subscription/", { method: "POST" })

// Dashboard
export const getDashboard = () => apiRequest("/dashboard/")

// Wallet
export const getWallets = () => apiRequest<{ wallets: Wallet[] }>("/wallet/wallets/")

export const getWalletTransactions = () => apiRequest<{ transactions: WalletTransaction[] }>("/wallet/transactions/")

export const deposit = (data: { amount: number; currency: string; wallet_type: string; mpesa_phone: string }) =>
  apiRequest("/wallet/deposit/", { method: "POST", body: JSON.stringify(data) })

export const withdraw = (data: { amount: number; wallet_type: string }) =>
  apiRequest("/wallet/withdraw/otp/", { method: "POST", body: JSON.stringify(data) })

export const verifyWithdrawal = (data: { code: string; transaction_id: string }) =>
  apiRequest("/wallet/withdraw/verify/", { method: "POST", body: JSON.stringify(data) })

export const getMpesaNumber = () => apiRequest<MpesaNumberResponse>("/wallet/mpesa-number/")

export const setMpesaNumber = (phone_number: string) =>
  apiRequest("/wallet/mpesa-number/", { method: "POST", body: JSON.stringify({ phone_number }) })

export const resendOTP = (transaction_id: string) =>
  apiRequest("/wallet/resend-otp/", { method: "POST", body: JSON.stringify({ transaction_id }) })

// Export all functions as an `api` object for compatibility
export const api = {
  signup,
  login,
  getAccount,
  getMarkets,
  getTradeTypes,
  getAssets,
  placeTrade,
  getTradeHistory,
  cancelTrade,
  getPriceHistory,
  getRobots,
  getUserRobots,
  purchaseRobot,
  resetDemoBalance,
  getBots,
  createBot,
  toggleBot,
  getSubscription,
  subscribe,
  getDashboard,
  getWallets,
  getWalletTransactions,
  deposit,
  withdraw,
  verifyWithdrawal,
  getMpesaNumber,
  setMpesaNumber,
  resendOTP,
}