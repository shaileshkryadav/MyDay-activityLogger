import Clock from "./components/Clock";
import ActivityFeed from "./components/ActivityFeed";
import DailySummary from "./components/Dailysummary";

export default function App() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "auto 1fr",
      gap: "16px",
      padding: "24px",
      minHeight: "100vh",
      background: "#121212",
      color: "#fff",
      fontFamily: "sans-serif"
    }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <Clock />
      </div>
      <ActivityFeed />
      <DailySummary />
    </div>
  )
}