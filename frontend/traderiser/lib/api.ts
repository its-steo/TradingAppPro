const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

interface ApiResponse<T> {
  data?: T
  error?: string
  status?: number
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
    console.error("[v0] API request error:", error)
    return { error: "Network error. Please check your connection." }
  }
}

export const api = {
  // Auth
  signup: (data: { username: string; email: string; password: string; phone?: string; account_type: string }) => {
    console.log("Signup payload:", data)
    return apiRequest("/accounts/signup/", { method: "POST", body: JSON.stringify(data) })
  },

  login: (data: { email: string; password: string; account_type: string; two_factor_code?: string }) => {
    console.log("Login payload:", {
      email: data.email,
      password: data.password,
      account_type: data.account_type,
      ...(data.two_factor_code && { two_factor_code: data.two_factor_code }),
    })
    return apiRequest("/accounts/login/", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        account_type: data.account_type,
        ...(data.two_factor_code && { two_factor_code: data.two_factor_code }),
      }),
    })
  },

  getAccountDetails: () => apiRequest("/accounts/account/"),

  submitKYC: (formData: FormData) =>
    apiRequest("/accounts/kyc/", {
      method: "POST",
      body: formData,
      headers: {},
    }),

  enable2FA: () => apiRequest("/accounts/2fa/enable/", { method: "POST" }),

  toggleSashi: () => apiRequest("/accounts/sashi/toggle/", { method: "POST" }),

  getAccount: () => apiRequest("/accounts/account/"),

  // Markets & Trading
  getMarkets: () => apiRequest("/trading/markets/"),

  getTradeTypes: () => apiRequest("/trading/trade-types/"),

  getAssets: () => apiRequest("/trading/assets/"),

  placeTrade: (data: any) => apiRequest("/trading/trades/place/", { method: "POST", body: JSON.stringify(data) }),

  getTradeHistory: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return apiRequest(`/trading/trades/history/${queryString}`)
  },

  cancelTrade: (tradeId: number) => apiRequest(`/trading/trades/${tradeId}/cancel/`, { method: "POST" }),

  getPriceHistory: (assetId: number) => apiRequest(`/trading/price/history/?asset_id=${assetId}`),

  getRobots: () => apiRequest("/trading/robots/"),

  getUserRobots: () => apiRequest("/trading/user-robots/"),

  purchaseRobot: (robotId: number) => apiRequest(`/trading/robots/${robotId}/purchase/`, { method: "POST" }),

  resetDemoBalance: () => apiRequest("/trading/reset-demo-balance/", { method: "POST" }),

  // Bots
  getBots: () => apiRequest("/bots/bots/"),

  createBot: (data: any) => apiRequest("/bots/bots/create/", { method: "POST", body: JSON.stringify(data) }),

  toggleBot: (botId: number) => apiRequest(`/bots/bots/${botId}/toggle/`, { method: "POST" }),

  getSubscription: () => apiRequest("/bots/subscription/"),

  subscribe: () => apiRequest("/bots/subscription/", { method: "POST" }),

  // Payments
  getPaymentMethods: () => apiRequest("/payments/methods/"),

  deposit: (data: { method_id: number; amount: number }) =>
    apiRequest("/payments/deposit/", { method: "POST", body: JSON.stringify(data) }),

  withdraw: (data: { method_id: number; amount: number }) =>
    apiRequest("/payments/withdraw/", { method: "POST", body: JSON.stringify(data) }),

  getTransactionHistory: () => apiRequest("/payments/history/"),

  // Dashboard
  getDashboard: () => apiRequest("/dashboard/"),

  getChatMessages: (market: string) => apiRequest(`/chat/messages/${market}/`),

}