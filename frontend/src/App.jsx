import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from "recharts"

const API = "http://127.0.0.1:8000"

// ── clock hook ────────────────────────────────────────────────────────────────
function useTick() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

// ── live camera feed ──────────────────────────────────────────────────────────
function LiveFeed() {
  const [src, setSrc] = useState("")

  useEffect(() => {
    let active = true
    const fetchFrame = async () => {
      try {
        const res = await fetch(`${API}/cv/frame?t=` + Date.now())
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        if (active) setSrc(prev => {
          URL.revokeObjectURL(prev)
          return url
        })
      } catch (e) {}
      if (active) setTimeout(fetchFrame, 150)
    }
    fetchFrame()
    return () => { active = false }
  }, [])

  return (
    <img
      src={src}
      alt="live feed"
      style={{ width: "100%", display: "block", borderRadius: 8 }}
    />
  )
}

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, highlight }) {
  return (
    <div style={{
      background: "#0f1a14",
      border: `0.5px solid ${highlight ? "#1D9E75" : "#1a2e22"}`,
      borderRadius: 10,
      padding: "14px 16px",
    }}>
      <div style={{ fontSize: 22, fontWeight: 500, color: highlight ? "#1D9E75" : "#c2fce0" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#5DCAA5", marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  )
}

// ── weekly chart ──────────────────────────────────────────────────────────────
function WeeklyChart({ data }) {
  if (!data || data.length === 0) return (
    <div style={{ color: "#555", fontSize: 13 }}>No weekly data yet.</div>
  )

  const formatted = data.map(d => ({
    day: new Date(d.date).toLocaleDateString("en", { weekday: "short" }),
    active: Math.round(d.active / 60),
    idle: Math.round(d.idle / 60),
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={formatted} barSize={14} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="day" tick={{ fill: "#5DCAA5", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#5DCAA5", fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#0a0f0d", border: "0.5px solid #1D9E75", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#5DCAA5" }}
          itemStyle={{ color: "#c2fce0" }}
          formatter={(v) => [`${v} min`]}
        />
        <Bar dataKey="active" name="Active" radius={[4, 4, 0, 0]}>
          {formatted.map((_, i) => <Cell key={i} fill="#1D9E75" />)}
        </Bar>
        <Bar dataKey="idle" name="Idle" radius={[4, 4, 0, 0]}>
          {formatted.map((_, i) => <Cell key={i} fill="#1a2e22" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const time     = useTick()
  const [cv, setCv]           = useState(null)
  const [stats, setStats]     = useState(null)
  const [logs, setLogs]       = useState([])
  const [summary, setSummary] = useState("")
  const [weekData, setWeekData] = useState([])
  const [generating, setGenerating] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [cvRes, statsRes, logsRes, sumRes, weekRes] = await Promise.all([
        axios.get(`${API}/cv/status`),
        axios.get(`${API}/activity/stats`),
        axios.get(`${API}/activity/today`),
        axios.get(`${API}/summary/today`),
        axios.get(`${API}/activity/week`),
      ])
      setCv(cvRes.data)
      setStats(statsRes.data)
      setLogs(logsRes.data.slice(0, 7))
      setSummary(sumRes.data.summary)
      setWeekData(weekRes.data)
    } catch (e) {
      console.error("API error", e)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await axios.post(`${API}/summary/generate`)
      setSummary(res.data.summary)
    } catch (e) {
      setSummary("Failed to generate summary. Is Ollama running?")
    } finally {
      setGenerating(false)
    }
  }

  const fmtSeconds = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div style={{
      background: "#0a0f0d",
      minHeight: "100vh",
      padding: 24,
      fontFamily: "monospace",
      color: "#c2fce0",
      boxSizing: "border-box",
    }}>

      {/* ── header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#1D9E75", letterSpacing: "0.12em" }}>
          MYDAY // ACTIVITY OS
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#1D9E75" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#1D9E75", display: "inline-block",
              animation: "pulse 1.5s infinite"
            }} />
            CV ACTIVE
          </span>
          <span style={{ color: "#888" }}>{time.toDateString().toUpperCase()}</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#e0fff4" }}>
            {time.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* ── stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Presence"    value={cv?.status === "in_room" ? "IN ROOM" : "AWAY"} highlight={cv?.status === "in_room"} />
        <StatCard label="Active today" value={stats ? fmtSeconds(stats.active_seconds) : "—"} />
        <StatCard label="Focus score"  value={stats ? `${stats.focus_score}%` : "—"} />
        <StatCard label="Idle breaks"  value={stats?.idle_breaks ?? "—"} />
      </div>

      {/* ── camera + activity log ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 14 }}>

        {/* camera panel */}
        <div style={{ background: "#0f1a14", border: "0.5px solid #1a2e22", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#5DCAA5", letterSpacing: "0.1em", marginBottom: 12 }}>
            CAMERA FEED // LIVE
          </div>
          <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", marginBottom: 12, border: "0.5px solid #1D9E75" }}>
            <LiveFeed />
            <div style={{
              position: "absolute", top: 8, left: 8,
              background: "#0a0f0d", border: "0.5px solid #1D9E75",
              borderRadius: 4, padding: "2px 8px",
              fontSize: 10, color: "#1D9E75", letterSpacing: "0.1em",
              display: "flex", alignItems: "center", gap: 4
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#1D9E75", display: "inline-block",
                animation: "pulse 1.5s infinite"
              }} />
              LIVE
            </div>
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: "#0a0f0d", border: "0.5px solid #333",
              borderRadius: 4, padding: "2px 8px",
              fontSize: 10, color: "#5DCAA5", letterSpacing: "0.08em"
            }}>
              FACES: {cv?.faces ?? 0}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              ["STATUS",     cv?.status?.toUpperCase() ?? "—"],
              ["CONFIDENCE", cv ? `${Math.round(cv.confidence * 100)}%` : "—"],
              ["FACES",      cv?.faces ?? "—"],
            ].map(([label, val]) => (
              <div key={label} style={{
                background: "#0a0f0d", border: "0.5px solid #1a2e22",
                borderRadius: 8, padding: 10, textAlign: "center"
              }}>
                <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#c2fce0", fontWeight: 500 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* activity log */}
        <div style={{ background: "#0f1a14", border: "0.5px solid #1a2e22", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#5DCAA5", letterSpacing: "0.1em", marginBottom: 12 }}>
            ACTIVITY LOG
          </div>
          {logs.length === 0
            ? <div style={{ color: "#555", fontSize: 13 }}>No logs yet.</div>
            : logs.map((log, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 10 }}>
                <span style={{ color: log.type === "active" ? "#1D9E75" : "#888" }}>
                  {log.type === "active" ? "▶" : "○"} {log.type}
                </span>
                <span style={{ color: "#555" }}>
                  {new Date(log.time).toLocaleTimeString()}
                </span>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── weekly breakdown ── */}
      <div style={{ background: "#0f1a14", border: "0.5px solid #1a2e22", borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#5DCAA5", letterSpacing: "0.1em" }}>
            WEEKLY BREAKDOWN
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#888" }}>
            <span><span style={{ color: "#1D9E75" }}>■</span> Active (min)</span>
            <span><span style={{ color: "#1a2e22", border: "1px solid #333", display: "inline-block", width: 10 }} /> Idle</span>
          </div>
        </div>
        <WeeklyChart data={weekData} />
      </div>

      {/* ── ai summary ── */}
      <div style={{ background: "#0f1a14", border: "0.5px solid #1a2e22", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#5DCAA5", letterSpacing: "0.1em" }}>
            AI SUMMARY // OLLAMA · MISTRAL
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: "transparent",
              border: "0.5px solid #1D9E75",
              color: "#1D9E75",
              borderRadius: 6,
              padding: "4px 14px",
              fontSize: 11,
              cursor: generating ? "not-allowed" : "pointer",
              letterSpacing: "0.08em",
              opacity: generating ? 0.5 : 1,
            }}>
            {generating ? "GENERATING..." : "GENERATE"}
          </button>
        </div>
        <div style={{ fontSize: 13, color: "#c2fce0", lineHeight: 1.8 }}>
          {summary || "Press GENERATE to summarize your day with AI."}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0f0d; }
        ::-webkit-scrollbar-thumb { background: #1D9E75; border-radius: 2px; }
      `}</style>
    </div>
  )
}