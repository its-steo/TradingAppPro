
"use client"

import type React from "react"
import { TopNavbar } from "@/components/top-navbar"
import { Sidebar } from "@/components/sidebar"
import { useState, useEffect } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{
    username: string
    email: string
    balance: number
    accountType: string
  } | null>(null)
  const [balance, setBalance] = useState(0)

  // Function to check user session from localStorage
  const checkUserSession = () => {
    const userSession = localStorage.getItem("user_session")
    if (userSession) {
      try {
        const userData = JSON.parse(userSession)
        setIsLoggedIn(true)
        setUser(userData)
        setBalance(userData.balance || 0)
      } catch (e) {
        setIsLoggedIn(false)
        setUser(null)
        setBalance(0)
      }
    } else {
      setIsLoggedIn(false)
      setUser(null)
      setBalance(0)
    }
  }

  useEffect(() => {
    // Initial check on mount
    checkUserSession()

    // Listen for custom storage change event
    const handleStorageChange = () => {
      checkUserSession()
    }

    window.addEventListener("custom-storage-change", handleStorageChange)

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("custom-storage-change", handleStorageChange)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-black via-black to-black/80">
      {/* Top Navbar */}
      <TopNavbar
        isLoggedIn={isLoggedIn}
        user={user}
        accountBalance={balance}
        showBalance={true} // Set to true to show balance in navbar
        onLogout={() => {
          setIsLoggedIn(false)
          setUser(null)
          setBalance(0)
          localStorage.removeItem("user_session")
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          localStorage.removeItem("account_type")
          window.dispatchEvent(new Event("custom-storage-change"))
        }}
      />

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Only visible when logged in */}
        {isLoggedIn && <Sidebar />}

        {/* Main Content */}
        <main className={`flex-1 overflow-auto transition-all duration-300 ${isLoggedIn ? "lg:ml-64" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
