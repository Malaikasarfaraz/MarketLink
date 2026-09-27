import React, { useEffect, useState } from "react";

const SPLASH_KEY = "marketlink_splash_seen";

export default function SplashScreen({ duration = 2600 }) {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;

    const started = performance.now();
    let frame;

    const tick = (now) => {
      const value = Math.min(100, ((now - started) / duration) * 100);
      setProgress(value);
      if (value < 100) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    const exitTimer = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => {
        try {
          sessionStorage.setItem(SPLASH_KEY, "1");
        } catch {}
        setVisible(false);
      }, 620);
    }, duration);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(exitTimer);
    };
  }, [visible, duration]);

  if (!visible) return null;

  return (
    <div className={`marketlink-splash ${leaving ? "is-leaving" : ""}`} aria-label="Loading MarketLink" role="status">
      <div className="splash-grain" aria-hidden="true" />
      <div className="splash-orbit splash-orbit-one" aria-hidden="true" />
      <div className="splash-orbit splash-orbit-two" aria-hidden="true" />

      <div className="splash-field" aria-hidden="true">
        <span className="splash-leaf leaf-one">✦</span>
        <span className="splash-leaf leaf-two">✦</span>
        <span className="splash-leaf leaf-three">✦</span>
      </div>

      <main className="splash-content">
        <div className="splash-mark-wrap">
          <div className="splash-mark" aria-hidden="true">
            <span className="splash-mark-stem" />
            <span className="splash-mark-leaf leaf-left" />
            <span className="splash-mark-leaf leaf-right" />
          </div>
        </div>

        <p className="splash-kicker">LOCAL • FRESH • DIRECT</p>
        <h1>Market<span>Link</span></h1>
        <p className="splash-tagline">
          Fresh from local farmers, closer to you.
        </p>

        <div className="splash-loader" aria-hidden="true">
          <div className="splash-loader-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="splash-loader-meta">
            <span>GROW LOCAL</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </main>

      <div className="splash-footer">
        <span>DISCOVER</span>
        <span className="splash-dot" />
        <span>PRE-ORDER</span>
        <span className="splash-dot" />
        <span>PICK UP</span>
      </div>
    </div>
  );
}
