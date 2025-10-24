"use client"

import { WalletHeader } from "@/components/wallet/wallet-header"
import { BalanceCard } from "@/components/wallet/balance-card"
import { ActionButtons } from "@/components/wallet/action-buttons"
import { TransactionList } from "@/components/wallet/transaction-list"
import { DepositModal } from "@/components/wallet/deposit-modal"
import { WithdrawModal } from "@/components/wallet/withdraw-modal"
import { VerifyWithdrawalModal } from "@/components/wallet/verify-withdrawal-modal"
import { useState } from "react"
import { Sidebar } from "@/components/sidebar"  // Import Sidebar
import { TopNavbar } from "@/components/top-navbar"  // Import TopNavbar

export default function Page() {
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  return (
    <>
      <TopNavbar />  {/* Add TopNavbar at the top */}
      <Sidebar />  {/* Add Sidebar for navigation */}
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8 md:ml-64">  {/* Add md:ml-64 for sidebar space on desktop */}
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <WalletHeader />

          {/* Balance Card */}
          <BalanceCard />

          {/* Action Buttons */}
          <ActionButtons onDeposit={() => setShowDepositModal(true)} onWithdraw={() => setShowWithdrawModal(true)} />

          {/* Transaction List */}
          <TransactionList />

          {/* Modals */}
          {showDepositModal && <DepositModal onClose={() => setShowDepositModal(false)} />}
          {showWithdrawModal && (
            <WithdrawModal onClose={() => setShowWithdrawModal(false)} onVerify={() => setShowVerifyModal(true)} />
          )}
          {showVerifyModal && <VerifyWithdrawalModal onClose={() => setShowVerifyModal(false)} />}
        </div>
      </main>
    </>
  )
}