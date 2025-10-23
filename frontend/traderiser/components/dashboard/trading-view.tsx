"use client"

import { useEffect, useState } from "react"

export function TradingViewWidget() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if the script is already loaded to avoid duplicates
    if (document.getElementById("tradingview-widget-script")) {
      setIsScriptLoaded(true)
      return
    }

    // Create and append the TradingView script after a slight delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const script = document.createElement("script")
      script.id = "tradingview-widget-script"
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
      script.async = true
      script.type = "text/javascript"
      script.innerHTML = JSON.stringify({
        allow_symbol_change: true,
        calendar: false,
        details: false,
        hide_side_toolbar: true,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_volume: false,
        hotlist: false,
        interval: "D",
        locale: "en",
        save_image: true,
        style: "1",
        symbol: "NASDAQ:AAPL",
        theme: "dark",
        timezone: "Etc/UTC",
        backgroundColor: "#0F0F0F",
        gridColor: "rgba(242, 242, 242, 0.06)",
        watchlist: [],
        withdateranges: false,
        compareSymbols: [],
        studies: [],
        autosize: false, // Disable autosize to enforce fixed dimensions
      })

      script.onload = () => setIsScriptLoaded(true)
      script.onerror = () => setError("Failed to load TradingView widget")

      const container = document.getElementById("tradingview-widget-container")
      if (container) {
        container.appendChild(script)
      }
    }, 100) // 100ms delay to ensure DOM readiness

    // Cleanup on component unmount
    return () => {
      clearTimeout(timer)
      const script = document.getElementById("tradingview-widget-script")
      if (script && script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-bold text-white mb-6">Market Overview</h3>
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-8">
      <h3 className="text-xl font-bold text-white mb-6">Market Overview</h3>
      <div
        id="tradingview-widget-container"
        className="tradingview-widget-container w-full"
        style={{ height: "500px !important", width: "100% !important", minHeight: "500px", maxHeight: "500px" }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: "calc(100% - 32px) !important", width: "100% !important" }}
        ></div>
        {isScriptLoaded ? (
          <div className="tradingview-widget-copyright text-sm text-slate-400 mt-2">

          </div>
        ) : (
          <div className="text-white text-center py-8">Loading TradingView chart... Please wait.</div>
        )}
      </div>
    </div>
  )
}