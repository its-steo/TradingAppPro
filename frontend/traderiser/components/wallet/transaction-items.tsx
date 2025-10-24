import Image from "next/image"

interface TransactionItemProps {
  transaction: {
    id: number
    type: string
    amount: string
    convertedAmount?: string
    date: string
    transactionType: string
    exchangeRateUsed?: number
    status: string
  }
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
        return "text-green-600 bg-green-50"
      case "pending":
        return "text-yellow-600 bg-yellow-50"
      case "failed":
      case "error":
        return "text-red-600 bg-red-50"
      default:
        return "text-slate-600 bg-slate-50"
    }
  }

  // Helper: format numbers/strings to a currency-like string with 2 decimals
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? Number(value.replace(/[^0-9.-]+/g, "")) : Number(value)
    if (Number.isNaN(num)) return String(value)
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
  }

  // Determine image based on transaction type
  const imageSrc = transaction.transactionType.toLowerCase() === "deposit" ? "/real-account-icon.png" : "/transaction-icon.png"

  // Determine display amount (converted currency only)
  let displayAmount: string
  if (transaction.transactionType.toLowerCase() === "deposit" && transaction.convertedAmount) {
    displayAmount = transaction.convertedAmount // e.g., "7.75 USD"
  } else if (transaction.transactionType.toLowerCase() === "withdrawal" && transaction.exchangeRateUsed) {
    const kshAmount = Number(transaction.amount.split(" ")[0]) / transaction.exchangeRateUsed
    displayAmount = `${formatCurrency(kshAmount.toFixed(2))} KSH` // e.g., "1333.33 KSH"
  } else {
    displayAmount = transaction.amount // Fallback to original amount
  }

  return (
    <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 transition-colors">
      {/* Left: Image and Details */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center overflow-hidden shadow-md">
            <Image
              src={imageSrc}
              alt={`${transaction.type} Transaction`}
              width={64}
              height={64}
              className="w-10 h-10 sm:w-11 sm:h-11 object-cover"
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{transaction.type}</p>
          <p className="text-xs sm:text-sm text-slate-500">{transaction.date}</p>
        </div>
      </div>

      {/* Right: Amount and Status */}
      <div className="flex flex-col items-end gap-2 ml-3 sm:ml-4 flex-shrink-0">
        <p className="font-bold text-slate-900 text-sm sm:text-base" aria-label={`Amount: ${displayAmount}`}>
          {displayAmount}
        </p>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </span>
      </div>
    </div>
  )
}