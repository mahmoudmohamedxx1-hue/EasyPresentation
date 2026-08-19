import { CSSProperties } from "react";
import { DeckTheme } from "../lib/themes";
import { SlideData } from "../lib/types";

interface Props {
  slide: SlideData;
  deckTitle: string;
  theme: DeckTheme;
  index: number;
  total: number;
  selected?: boolean;
  onSelect?: () => void;
}

/* Renders one slide of deck JSON as a true 16:9 card. All sizes use
   container-query units (cqi) so cards scale perfectly at any width. */
export default function SlideCard({ slide, deckTitle, theme: t, index, total, selected, onSelect }: Props) {
  const bulletSize = slide.bullets.length > 4 ? "2.5cqi" : "2.85cqi";

  const kicker = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1.3cqi",
        fontSize: "1.85cqi",
        letterSpacing: "0.2em",
        fontWeight: 700,
        color: t.accent,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <span style={{ width: "1.15cqi", height: "1.15cqi", background: t.accent, flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{deckTitle || "Untitled deck"}</span>
    </div>
  );

  const heading = (size = "4.5cqi") => (
    <h3
      style={{
        fontFamily: `'${t.displayFont}', sans-serif`,
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.12,
        letterSpacing: "-0.01em",
        margin: "1.7cqi 0 2.6cqi",
        color: t.ink,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}
    >
      {slide.title || "Untitled"}
    </h3>
  );

  const Bullet = ({ text }: { text: string }) => (
    <li style={{ display: "flex", gap: "1.7cqi", alignItems: "baseline" }}>
      <span
        style={{
          width: "1.05cqi",
          height: "1.05cqi",
          background: t.accent,
          flexShrink: 0,
          transform: "translateY(-0.25cqi)",
        }}
      />
      <span style={{ lineHeight: 1.45, minWidth: 0 }}>{text}</span>
    </li>
  );

  let content: React.ReactNode;
  const rail =
    slide.layout === "title" ? (
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "1.5cqi", background: t.accent }} />
    ) : null;

  switch (slide.layout) {
    case "title":
      content = (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ width: "9cqi", height: "0.55cqi", background: t.accent2, marginBottom: "3.2cqi" }} />
          <h3
            style={{
              fontFamily: `'${t.displayFont}', sans-serif`,
              fontSize: "7cqi",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              color: t.ink,
              margin: 0,
            }}
          >
            {slide.title || "Untitled deck"}
          </h3>
          {slide.subtitle && (
            <p style={{ fontSize: "2.6cqi", color: t.muted, marginTop: "2.6cqi", maxWidth: "82%", lineHeight: 1.5 }}>
              {slide.subtitle}
            </p>
          )}
        </div>
      );
      break;

    case "quote":
      content = (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "1cqi" }}>
          <span style={{ width: "8cqi", height: "0.55cqi", background: t.accent, marginBottom: "3cqi" }} />
          <p
            style={{
              fontFamily: `'${t.displayFont}', sans-serif`,
              fontSize: "3.9cqi",
              fontStyle: "italic",
              fontWeight: 600,
              lineHeight: 1.32,
              color: t.ink,
              margin: 0,
              maxWidth: "95%",
            }}
          >
            “{slide.quote?.text || slide.bullets[0] || slide.title}”
          </p>
          {slide.quote?.attribution && (
            <p style={{ fontSize: "2.2cqi", color: t.muted, marginTop: "2.6cqi" }}>— {slide.quote.attribution}</p>
          )}
        </div>
      );
      break;

    case "stats": {
      const stats =
        slide.stats && slide.stats.length
          ? slide.stats.slice(0, 3)
          : slide.bullets.slice(0, 3).map((b) => ({ value: b.split(" ").slice(0, 3).join(" "), label: b.split(" ").slice(3, 9).join(" ") }));
      content = (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {kicker}
          {heading()}
          <div style={{ display: "flex", gap: "2.6cqi", flex: 1, minHeight: 0, marginTop: "1cqi" }}>
            {stats.map((st, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: t.surface,
                  border: `1px solid ${t.line}`,
                  borderTop: `0.55cqi solid ${i % 2 ? t.accent2 : t.accent}`,
                  borderRadius: "1cqi",
                  padding: "2.8cqi 1.8cqi",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: "1.6cqi",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontFamily: `'${t.displayFont}', sans-serif`,
                    fontSize: "4.9cqi",
                    fontWeight: 800,
                    color: i % 2 ? t.accent2 : t.accent,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {st.value || "—"}
                </span>
                <span style={{ fontSize: "1.95cqi", color: t.muted, lineHeight: 1.4 }}>{st.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
      break;
    }

    case "two_col": {
      const half = Math.ceil(slide.bullets.length / 2);
      const cols = [slide.bullets.slice(0, half), slide.bullets.slice(half)];
      content = (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {kicker}
          {heading()}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 4.5cqi", flex: 1, minHeight: 0, overflow: "hidden" }}>
            {cols.map((col, ci) => (
              <ul key={ci} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1.6cqi", fontSize: bulletSize }}>
                {col.map((b, i) => (
                  <Bullet key={i} text={b} />
                ))}
              </ul>
            ))}
          </div>
        </div>
      );
      break;
    }

    case "closing":
      content = (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <h3
            style={{
              fontFamily: `'${t.displayFont}', sans-serif`,
              fontSize: "5.4cqi",
              fontWeight: 800,
              color: t.ink,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {slide.title}
          </h3>
          <span style={{ width: "7cqi", height: "0.55cqi", background: t.accent, margin: "2.6cqi auto" }} />
          {slide.bullets.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1.3cqi", fontSize: "2.35cqi", color: t.muted }}>
              {slide.bullets.slice(0, 4).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      );
      break;

    default:
      content = (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {kicker}
          {heading()}
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "1.7cqi",
              fontSize: bulletSize,
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {slide.bullets.map((b, i) => (
              <Bullet key={i} text={b} />
            ))}
          </ul>
        </div>
      );
  }

  const wrapperStyle: CSSProperties = {
    containerType: "inline-size",
    position: "relative",
    cursor: onSelect ? "pointer" : undefined,
  };

  const cardStyle: CSSProperties = {
    aspectRatio: "16 / 9",
    background: t.bg,
    color: t.ink,
    fontFamily: `'${t.bodyFont}', sans-serif`,
    borderRadius: "12px",
    border: `1px solid ${t.mode === "light" ? "rgba(22,28,29,0.14)" : "rgba(255,255,255,0.1)"}`,
    overflow: "hidden",
    position: "relative",
    padding: "5.2cqi 6cqi 7.5cqi",
    transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease",
    boxShadow: selected
      ? "0 0 0 2.5px #2fd4b5, 0 24px 50px -20px rgba(0,0,0,0.55)"
      : "0 14px 34px -18px rgba(0,0,0,0.45)",
  };

  return (
    <div
      style={wrapperStyle}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => e.key === "Enter" && onSelect() : undefined}
      className={onSelect ? "group" : undefined}
    >
      <div style={cardStyle} className={onSelect ? "transition-transform group-hover:-translate-y-1" : undefined}>
        {rail}
        {content}
        <div
          style={{
            position: "absolute",
            left: "6cqi",
            right: "6cqi",
            bottom: "2.4cqi",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "1.7cqi",
            color: t.muted,
            opacity: 0.9,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
            {deckTitle || "Untitled deck"}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
