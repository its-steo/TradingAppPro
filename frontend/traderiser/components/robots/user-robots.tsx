"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

interface UserRobot {
  id: number
  robot: {
    id: number
    name: string
    description: string
    price: number
  }
  purchased_at: string
}

export function UserRobots() {
  const { toast } = useToast()
  const [userRobots, setUserRobots] = useState<UserRobot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserRobots = async () => {
      const { data, error } = await api.getUserRobots()
      if (error) {
        toast({
          title: "Error",
          description: "Failed to load your robots",
          variant: "destructive",
        })
      } else {
        console.log("API Response:", data) // Temporary logging for debugging
        setUserRobots(data as UserRobot[])
      }
      setIsLoading(false)
    }
    fetchUserRobots()
  }, [toast])

  if (isLoading) {
    return <p className="text-white/60">Loading your robots...</p>
  }

  if (userRobots.length === 0) {
    return (
      <div className="rounded-2xl p-12 bg-white/10 backdrop-blur-md border border-white/20 text-center">
        <p className="text-white/60 mb-4">You haven't purchased any robots yet</p>
        <p className="text-sm text-white/60">Visit the marketplace to purchase your first robot</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {userRobots.map((userRobot) => (
        <div key={userRobot.id} className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20">
          <h3 className="text-lg font-bold text-white mb-2">{userRobot.robot.name}</h3>
          <p className="text-sm text-white/60 mb-4">{userRobot.robot.description}</p>
          <div className="space-y-3 pt-4 border-t border-white/20">
            <div className="flex justify-between">
              <span className="text-sm text-white/60">Price</span>
              <span className="text-sm font-bold text-white">
                {typeof userRobot.robot.price === 'number' && !isNaN(userRobot.robot.price)
                  ? `$${userRobot.robot.price.toFixed(2)}`
                  : 'Price unavailable'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-white/60">Purchased</span>
              <span className="text-sm font-bold text-white">
                {new Date(userRobot.purchased_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <Button className="w-full mt-6 bg-pink-500 hover:bg-pink-600 text-white">Use Robot</Button>
        </div>
      ))}
    </div>
  )
}