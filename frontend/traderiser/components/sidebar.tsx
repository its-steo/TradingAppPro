"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Zap, LogOut, Menu, X, Wallet as WalletIcon } from "lucide-react"
import { useState, useEffect } from "react"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("account_type")
    router.push("/login")
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/trading", label: "Trading", icon: BarChart3 },
    { href: "/robots", label: "Robots", icon: Zap },
    { href: "/wallet", label: "Wallet", icon: WalletIcon }, // NEW: Wallet
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-60 md:hidden bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-2 text-white hover:from-pink-600 hover:to-pink-700 transition-all shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-xl border-r border-white/10 p-6 transition-transform duration-300 z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Traderiser</span>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                    isActive
                      ? "bg-gradient-to-r from-pink-500/30 to-pink-600/30 border border-pink-500/50 text-pink-300 shadow-lg shadow-pink-500/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:border hover:border-white/10"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-pink-300" : "text-white/70 group-hover:text-white"} />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-8 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-all w-full group"
          >
            <LogOut size={20} className="text-white/70 group-hover:text-red-400" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
        />
      )}
    </>
  )
}