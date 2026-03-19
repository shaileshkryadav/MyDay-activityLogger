import { useState, useEffect } from "react"
import axios from "axios"

export default function DailySummary() {
  const [summary, setSummary] = useState("")

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/summary/today")
      .then(res => setSummary(res.data.summary))
      .catch(() => setSummary("Could not load summary."))
  }, [])

  return (
    <div style={{ padding: "16px" }}>
      <h2>Daily Summary</h2>
      <p style={{ color: "#ccc", lineHeight: "1.6" }}>{summary}</p>
    </div>
  )
}