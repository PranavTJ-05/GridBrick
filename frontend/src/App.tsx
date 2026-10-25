import { useEffect, useMemo, useState } from "react";
import { AccuracyCharts } from "./components/AccuracyCharts";
import { ForecastChart } from "./components/ForecastChart";
import { MetricCard } from "./components/MetricCard";
import { StatusPill } from "./components/StatusPill";
import { getAccuracy, getDecisionView } from "./api";
import type { AccuracyResponse, DecisionResponse } from "./types";

function formatMw(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${Math.round(value).toLocaleString()} MW`;
}

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function App() {
  const [activeView, setActiveView] = useState<"decision" | "accuracy">("decision");
  const [deliveryDate, setDeliveryDate] = useState("2026-01-15");
  const [cutoff, setCutoff] = useState("23:59");
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const request = activeView === "decision" ? getDecisionView(deliveryDate, cutoff) : getAccuracy(cutoff);
    request.then((result) => activeView === "decision" ? setDecision(result as DecisionResponse) : setAccuracy(result as AccuracyResponse)).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load data")).finally(() => setLoading(false));
  }, [activeView, deliveryDate, cutoff]);

  const underforecastCount = useMemo(() => decision?.rows.filter((row) => row.status === "Underforecast").length ?? 0, [decision]);
  const latestPublish = useMemo(() => {
    const values = decision?.rows.map((row) => row.forecast_publish_time).filter(Boolean).sort() ?? [];
    return values[values.length - 1];
  }, [decision]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">W</div><div><div className="brand-name">WindReady</div><div className="brand-subtitle">Day-ahead wind intelligence</div></div></div>
        <div className="topbar-right"><span className="live-dot" /> Historical pilot <span className="source-tag">ELEXON BMRS</span></div>
      </header>

      <main className="content">
        <section className="hero">
          <div><span className="eyebrow eyebrow-light">PROCUREMENT CONTROL ROOM</span><h1>Know what wind forecast was available before you bought.</h1><p>Review the latest pre-cutoff forecast, compare it with actual generation, and quantify the uncertainty behind day-ahead procurement decisions.</p></div>
          <div className="hero-note"><div className="hero-note-label">Analysis window</div><strong>January 1–31, 2026</strong><span>National wind generation · hourly comparison</span></div>
        </section>

        <section className="control-panel">
          <div className="control-item"><label htmlFor="delivery-date">Delivery date</label><input id="delivery-date" type="date" min="2026-01-01" max="2026-01-31" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></div>
          <div className="control-item"><label htmlFor="cutoff">Decision cutoff (UTC)</label><input id="cutoff" type="time" value={cutoff} onChange={(event) => setCutoff(event.target.value)} /></div>
          <div className="control-explainer"><span className="info-icon">i</span><span>We select the newest forecast published before {cutoff} on the day before delivery.</span></div>
        </section>

        <nav className="view-tabs" aria-label="Dashboard views"><button className={activeView === "decision" ? "tab active" : "tab"} onClick={() => setActiveView("decision")}>Decision view</button><button className={activeView === "accuracy" ? "tab active" : "tab"} onClick={() => setActiveView("accuracy")}>Accuracy analysis</button><span className="tab-spacer" /><span className="scope-label">Scope locked to January 2026</span></nav>

        {loading && <div className="notice loading">Refreshing the Elexon-backed view…</div>}
        {error && <div className="notice error">{error}</div>}

        {activeView === "decision" && decision && (
          <>
            <section className="summary-row">
              <MetricCard label="Forecast MAE" value={formatMw(decision.metrics.mae_mw)} detail="Average absolute error" tone="blue" />
              <MetricCard label="Forecast bias" value={formatMw(decision.metrics.bias_mw)} detail={decision.metrics.bias_mw !== null && decision.metrics.bias_mw < 0 ? "Tends to underforecast" : "Tends to overforecast"} tone={decision.metrics.bias_mw !== null && decision.metrics.bias_mw < 0 ? "orange" : "green"} />
              <MetricCard label="Underforecast periods" value={`${underforecastCount} / ${decision.rows.length}`} detail={`${formatPercent(decision.metrics.underforecast_rate)} of valid periods`} tone="orange" />
              <MetricCard label="P90 error buffer" value={formatMw(decision.metrics.p90_absolute_error_mw)} detail="Absolute error at the 90th percentile" tone="red" />
            </section>

            <section className="panel main-panel"><div className="panel-heading"><div><span className="eyebrow">Selected delivery day</span><h2>{new Date(`${decision.delivery_date}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2><p>Latest eligible forecast published at {formatDateTime(latestPublish)} · Cutoff {formatDateTime(decision.decision_cutoff)}</p></div><div className="data-status"><span className="status-dot" /> {decision.data_source}</div></div><ForecastChart rows={decision.rows} /></section>

            <section className="lower-grid"><section className="panel table-panel"><div className="panel-heading compact"><div><span className="eyebrow">Period detail</span><h3>What the buyer could see</h3></div><span className="table-count">{decision.rows.length} hourly periods</span></div><div className="table-scroll"><table><thead><tr><th>Delivery</th><th>Forecast</th><th>Actual</th><th>Error</th><th>Published</th><th>Lead time</th><th>Status</th></tr></thead><tbody>{decision.rows.map((row) => <tr key={row.target_time}><td>{formatDateTime(row.target_time)}</td><td>{formatMw(row.forecast_mw)}</td><td>{formatMw(row.actual_mw)}</td><td className={row.error_mw !== null && row.error_mw < 0 ? "negative" : "positive"}>{formatMw(row.error_mw)}</td><td>{formatDateTime(row.forecast_publish_time)}</td><td>{row.lead_time_hours === null ? "—" : `${row.lead_time_hours.toFixed(1)}h`}</td><td><StatusPill status={row.status} /></td></tr>)}</tbody></table></div></section><aside className="panel insight-panel"><span className="eyebrow">Decision note</span><h3>Use the error as a buffer signal.</h3><p>Periods where actual wind exceeds the selected forecast are shown as underforecast exposure. This prototype does not convert that exposure to a procurement volume or cost because demand and price data are outside the challenge scope.</p><div className="insight-divider" /><div className="mini-stat"><span>Data normalization</span><strong>Half-hourly → hourly</strong></div><div className="mini-stat"><span>Actual dataset</span><strong>FUELHH · WIND</strong></div><div className="mini-stat"><span>Forecast dataset</span><strong>WINDFOR</strong></div></aside></section>
          </>
        )}

        {activeView === "accuracy" && accuracy && (
          <>
            <section className="summary-row"><MetricCard label="MAE" value={formatMw(accuracy.metrics.mae_mw)} detail="Average absolute error" tone="blue" /><MetricCard label="RMSE" value={formatMw(accuracy.metrics.rmse_mw)} detail="Penalizes large misses" tone="red" /><MetricCard label="WAPE" value={formatPercent(accuracy.metrics.wape)} detail="Weighted error against actuals" tone="green" /><MetricCard label="P90 error" value={formatMw(accuracy.metrics.p90_absolute_error_mw)} detail="Useful planning buffer" tone="orange" /></section><section className="analysis-intro"><div><span className="eyebrow">Month-level evaluation</span><h2>How reliable was the decision signal?</h2></div><p>{accuracy.metrics.sample_count.toLocaleString()} hourly comparisons across January 2026 using the {accuracy.data_source.toLowerCase()}.</p></section><AccuracyCharts data={accuracy} /></>
        )}
      </main>
      <footer className="footer"><span>WindReady pilot · Elexon FUELHH + WINDFOR</span><span>Forecast error is shown as forecast minus actual.</span></footer>
    </div>
  );
}

export default App;
