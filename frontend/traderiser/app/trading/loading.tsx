"use client"

import type React from "react"
import { TopNavbar } from "@/components/top-navbar"
import { useState, useEffect } from "react"

interface TradingLayoutProps {
  children: React.ReactNode
}

export default function TradingLayout({ children }: TradingLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    // Check if user is logged in (from localStorage or API)
    const userSession = localStorage.getItem("user_session")
    if (userSession) {
      try {
        const userData = JSON.parse(userSession)
        setIsLoggedIn(true)
        setUser(userData)
        setBalance(userData.balance || 0)
      } catch (e) {
        setIsLoggedIn(false)
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-black via-black to-black/80">
      {/* Top Navbar */}
      <TopNavbar
        isLoggedIn={isLoggedIn}
        user={user}
        accountBalance={balance}
        showBalance={true}
        onLogout={() => {
          setIsLoggedIn(false)
          setUser(null)
          localStorage.removeItem("user_session")
        }}
      />

      {/* Main Content - Full Width for Trading */}
      <div className="flex-1 w-full overflow-hidden">{children}</div>
    </div>
  )
}