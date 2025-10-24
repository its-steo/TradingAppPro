"use client"

import { useState } from "react"
import Link from "next/link"
import { TrendingUp, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface User {
  username: string
  email: string
  image?: string
  accountType?: "real" | "demo"
}

interface TopNavbarProps {
  isLoggedIn?: boolean
  user?: User | null
  accountBalance?: number
  onLogout?: () => void
  showBalance?: boolean
}

export function TopNavbar({
  isLoggedIn = false,
  user = null,
  accountBalance = 0,
  onLogout,
  showBalance = false,
}: TopNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    onLogout?.()
    setIsMobileMenuOpen(false)
    window.dispatchEvent(new Event("custom-storage-change"))
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-black/50 backdrop-blur-md border-b border-white/20">
      <div className="px-4 sm:px-6 md:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white hidden sm:inline">Traderiser</span>
          </Link>

          {/* Center - Balance (Trading Page Only) */}
          {showBalance && isLoggedIn && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-white/70">Account Balance</span>
              <span className="text-lg font-bold text-white">${accountBalance.toFixed(2)}</span>
            </div>
          )}

          {/* Right Side - Auth Actions */}
          <div className="flex items-center gap-3">
            {isLoggedIn && user ? (
              <>
                {/* Desktop Profile */}
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-medium text-white">{user.username}</p>
                    <p className="text-xs text-white/70 capitalize">
                      {user.accountType === "demo" ? "Demo Account" : "Real Account"}
                    </p>
                  </div>
                  {user.image && (
                    <img
                      src={user.image || "/placeholder.svg"}
                      alt={user.username}
                      className="w-8 h-8 rounded-full border border-white/30"
                    />
                  )}
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="sm:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5 text-white" />
                  ) : (
                    <Menu className="w-5 h-5 text-white" />
                  )}
                </button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && isLoggedIn && user && (
          <div className="sm:hidden mt-4 pt-4 border-t border-white/20 space-y-3">
            <div className="flex items-center gap-3 pb-3">
              {user.image && (
                <img
                  src={user.image || "/placeholder.svg"}
                  alt={user.username}
                  className="w-10 h-10 rounded-full border border-white/30"
                />
              )}
              <div>
                <p className="text-sm font-medium text-white">{user.username}</p>
                <p className="text-xs text-white/70 capitalize">
                  {user.accountType === "demo" ? "Demo Account" : "Real Account"}
                </p>
              </div>
            </div>
            {showBalance && (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-white/70 mb-1">Account Balance</p>
                <p className="text-lg font-bold text-white">${accountBalance.toFixed(2)}</p>
              </div>
            )}
            <Button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}