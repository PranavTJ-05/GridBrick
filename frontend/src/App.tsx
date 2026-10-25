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
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function WindReadyMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`windready-mark ${className}`} viewBox="0 0 100 100" role="img" aria-label="WindReady mark">
      <path className="windready-mark-ring" d="M18 35 A33 33 0 1 1 25 73" />
      <path className="windready-mark-w" d="M25 33 L35 68 L50 44 L65 68 L75 33" />
      <path className="windready-mark-tail" d="M62 74 H79" />
      <circle className="windready-mark-node" cx="79" cy="74" r="2.5" />
    </svg>
  );
}

function App() {
  const [introVisible, setIntroVisible] = useState(true);
  const [activeView, setActiveView] = useState<"decision" | "accuracy">("decision");
  const [deliveryDate, setDeliveryDate] = useState("2026-01-15");
  const [cutoff, setCutoff] = useState("23:59");
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroVisible(false), 1550);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const request = activeView === "decision"
      ? getDecisionView(deliveryDate, cutoff, controller.signal)
      : getAccuracy(cutoff, controller.signal);

    request
      .then((result) => {
        if (activeView === "decision") {
          setDecision(result as DecisionResponse);
        } else {
          setAccuracy(result as AccuracyResponse);
        }
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load data");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [activeView, deliveryDate, cutoff]);

  const underforecastCount = useMemo(
    () => decision?.rows.filter((row) => row.status === "Underforecast").length ?? 0,
    [decision],
  );

  const latestPublish = useMemo(() => {
    const values = decision?.rows
      .map((row) => row.forecast_publish_time)
      .filter(Boolean)
      .sort() ?? [];
    return values[values.length - 1];
  }, [decision]);

  return (
    <div className={`app-shell ${introVisible ? "is-intro-visible" : ""}`}>
      <div className="intro-screen" aria-hidden={!introVisible}>
        <div className="intro-lockup">
          <WindReadyMark className="intro-mark" />
          <div className="intro-wordmark">WINDREADY</div>
          <div className="intro-rule" />
          <div className="intro-caption">DAY-AHEAD WIND INTELLIGENCE</div>
        </div>
      </div>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><WindReadyMark /></div>
          <div>
            <div className="brand-name">WindReady <span>CONTROL ROOM</span></div>
            <div className="brand-subtitle">Day-ahead wind intelligence</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="live-dot" />
          <span>Historical pilot</span>
          <span className="topbar-divider" />
          <span className="source-tag">ELEXON BMRS</span>
          <div className="avatar">PT</div>
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="pulse-mark" /> PROCUREMENT CONTROL ROOM <span className="hero-kicker-line" /> LIVE ANALYSIS</div>
            <h1>Buy with a clearer view of the wind.</h1>
            <p>See the forecast the desk could actually use, measure the miss against realized generation, and carry a quantified uncertainty buffer into the day-ahead decision.</p>
            <div className="hero-footnote"><span className="hero-footnote-icon">↗</span><span>Latest eligible forecast vintage before the decision cutoff</span></div>
          </div>
          <div className="hero-note">
            <div className="hero-note-top"><div className="hero-note-label">ANALYSIS WINDOW</div><span className="hero-note-chip">LOCKED</span></div>
            <strong>01 — 31 <em>JAN</em></strong>
            <span>2026 · National wind generation</span>
            <div className="hero-sparkline"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
        </section>

        <section className="control-panel">
          <div className="control-panel-heading"><span className="eyebrow">DECISION CONTEXT</span><strong>Set the moment the buyer makes the call</strong></div>
          <div className="control-item"><label htmlFor="delivery-date">Delivery date</label><input id="delivery-date" type="date" min="2026-01-01" max="2026-01-31" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></div>
          <div className="control-item"><label htmlFor="cutoff">Decision cutoff <span>(UTC)</span></label><input id="cutoff" type="time" value={cutoff} onChange={(event) => setCutoff(event.target.value)} /></div>
          <div className="control-explainer"><span className="info-icon">i</span><span>We select the newest forecast published before <b>{cutoff}</b> on the day before delivery.</span></div>
        </section>

        <nav className="view-tabs" aria-label="Dashboard views">
          <div className="tab-group">
            <button className={activeView === "decision" ? "tab active" : "tab"} onClick={() => setActiveView("decision")}><span className="tab-icon">◒</span> Decision view</button>
            <button className={activeView === "accuracy" ? "tab active" : "tab"} onClick={() => setActiveView("accuracy")}><span className="tab-icon">⌁</span> Accuracy analysis</button>
          </div>
          <span className="tab-spacer" />
          <span className="scope-label"><span className="scope-dot" /> Scope locked to January 2026</span>
        </nav>

        {loading && <div className="notice loading"><span className="loading-spinner" /> Refreshing the Elexon-backed view…</div>}
        {error && <div className="notice error"><span className="notice-icon">!</span><span>{error}</span></div>}

        {activeView === "decision" && decision && (
          <>
            <section className="section-intro">
              <div><span className="eyebrow">01 / DECISION SNAPSHOT</span><h2>{formatDay(decision.delivery_date)}</h2></div>
              <div className="section-intro-meta"><span className="source-badge"><span className="source-badge-dot" /> {decision.data_source}</span><span>{decision.rows.length} hourly delivery periods</span></div>
            </section>

            <section className="summary-row">
              <MetricCard label="Forecast MAE" value={formatMw(decision.metrics.mae_mw)} detail="Average absolute error" tone="blue" />
              <MetricCard label="Forecast bias" value={formatMw(decision.metrics.bias_mw)} detail={decision.metrics.bias_mw !== null && decision.metrics.bias_mw < 0 ? "Tends to underforecast" : "Tends to overforecast"} tone={decision.metrics.bias_mw !== null && decision.metrics.bias_mw < 0 ? "orange" : "green"} />
              <MetricCard label="Underforecast periods" value={`${underforecastCount} / ${decision.rows.length}`} detail={`${formatPercent(decision.metrics.underforecast_rate)} of valid periods`} tone="orange" />
              <MetricCard label="P90 error buffer" value={formatMw(decision.metrics.p90_absolute_error_mw)} detail="Absolute error at the 90th percentile" tone="red" />
            </section>

            <section className="panel main-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-title-row"><span className="eyebrow">Observed vs selected forecast</span><span className="confidence-tag">PRE-CUTOFF VINTAGE</span></div>
                  <h2>Generation profile</h2>
                  <p>Latest eligible forecast published at {formatDateTime(latestPublish)} <span className="panel-separator">·</span> Cutoff {formatDateTime(decision.decision_cutoff)}</p>
                </div>
                <div className="chart-legend"><span><i className="legend-line forecast-line" /> Forecast</span><span><i className="legend-line actual-line" /> Actual</span></div>
              </div>
              <ForecastChart rows={decision.rows} />
            </section>

            <section className="lower-grid">
              <section className="panel table-panel">
                <div className="panel-heading compact"><div><span className="eyebrow">Period detail</span><h3>What the buyer could see</h3></div><span className="table-count">{decision.rows.length} hourly periods</span></div>
                <div className="table-scroll"><table><thead><tr><th>Delivery</th><th>Forecast</th><th>Actual</th><th>Error</th><th>Published</th><th>Lead time</th><th>Status</th></tr></thead><tbody>{decision.rows.map((row) => <tr key={row.target_time}><td>{formatDateTime(row.target_time)}</td><td>{formatMw(row.forecast_mw)}</td><td>{formatMw(row.actual_mw)}</td><td className={row.error_mw !== null && row.error_mw < 0 ? "negative" : "positive"}>{formatMw(row.error_mw)}</td><td>{formatDateTime(row.forecast_publish_time)}</td><td>{row.lead_time_hours === null ? "—" : `${row.lead_time_hours.toFixed(1)}h`}</td><td><StatusPill status={row.status} /></td></tr>)}</tbody></table></div>
              </section>
              <aside className="panel insight-panel"><span className="eyebrow">Decision note</span><h3>Use the error as a buffer signal.</h3><p>Periods where actual wind exceeds the selected forecast are shown as underforecast exposure. This prototype does not convert that exposure to a procurement volume or cost because demand and price data are outside the challenge scope.</p><div className="insight-divider" /><div className="mini-stat"><span>Data normalization</span><strong>Half-hourly → hourly</strong></div><div className="mini-stat"><span>Actual dataset</span><strong>FUELHH · WIND</strong></div><div className="mini-stat"><span>Forecast dataset</span><strong>WINDFOR</strong></div></aside>
            </section>
          </>
        )}

        {activeView === "accuracy" && accuracy && (
          <>
            <section className="section-intro"><div><span className="eyebrow">02 / ACCURACY INTELLIGENCE</span><h2>How reliable was the decision signal?</h2></div><div className="section-intro-meta"><span>{accuracy.metrics.sample_count.toLocaleString()} hourly comparisons</span><span className="source-badge"><span className="source-badge-dot" /> {accuracy.data_source}</span></div></section>
            <section className="summary-row"><MetricCard label="MAE" value={formatMw(accuracy.metrics.mae_mw)} detail="Average absolute error" tone="blue" /><MetricCard label="RMSE" value={formatMw(accuracy.metrics.rmse_mw)} detail="Penalizes large misses" tone="red" /><MetricCard label="WAPE" value={formatPercent(accuracy.metrics.wape)} detail="Weighted error against actuals" tone="green" /><MetricCard label="P90 error" value={formatMw(accuracy.metrics.p90_absolute_error_mw)} detail="Useful planning buffer" tone="orange" /></section>
            <section className="analysis-callout"><span className="analysis-callout-mark">⌁</span><div><strong>Read the shape, not just the score.</strong><span>Daily MAE surfaces difficult delivery days, while hourly bias shows where the forecast consistently leans high or low.</span></div><span className="analysis-callout-source">CUT-OFF {cutoff} UTC</span></section>
            <AccuracyCharts data={accuracy} />
          </>
        )}
      </main>

      <footer className="footer"><span>WindReady pilot · Elexon FUELHH + WINDFOR</span><span>Forecast error is shown as forecast minus actual.</span></footer>
    </div>
  );
}

export default App;
