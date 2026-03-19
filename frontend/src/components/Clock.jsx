import { useState, useEffect } from "react"

export default function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1 style={{ fontSize: "4rem", margin: 0 }}>
        {time.toLocaleTimeString()}
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#aaa" }}>
        {time.toDateString()}
      </p>
    </div>
  )
}