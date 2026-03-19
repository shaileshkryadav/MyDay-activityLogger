import { useState, useEffect } from "react"
import axios from "axios"

export default function ActivityFeed() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/activity/today")
        setLogs(res.data)
      } catch (e) {
        console.error("Backend not reachable", e)
      }
    }
    fetch()
    const interval = setInterval(fetch, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: "16px" }}>
      <h2>Today's Activity</h2>
      {logs.length === 0 ? (
        <p style={{ color: "#aaa" }}>No activity logged yet.</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} style={{
            padding: "8px 12px",
            marginBottom: "8px",
            background: "#1e1e1e",
            borderRadius: "8px",
            borderLeft: `4px solid ${log.type === "active" ? "#4caf50" : "#888"}`
          }}>
            <span style={{ fontWeight: "bold" }}>{log.type}</span>
            <span style={{ float: "right", color: "#aaa", fontSize: "0.85rem" }}>
              {new Date(log.time).toLocaleTimeString()}
            </span>
          </div>
        ))
      )}
    </div>
  )
}