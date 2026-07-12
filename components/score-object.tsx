"use client";

/*
  Score-Objekt (Signatur).

  Eine grosse Serifen-Zahl ueber einem kategorie-segmentierten Balken: jedes
  Kriterium ist ein Segment, dessen Breite dem maxPoints entspricht und dessen
  Fuellung dem erreichten Anteil. Die Farbe ist die Kategorie-Farbe des
  Kriteriums (grammar/sentence/vocabulary/connectives); Inhalts-Kriterien ohne
  Kategorie fuellen sich im Gold-Akzent.

  Reaktiv: die Fuellung animiert bei jeder Punkteaenderung (respektiert
  prefers-reduced-motion global in globals.css). Dasselbe visuelle Objekt
  erscheint als Kopf von PDF-Seite 1, damit App und Blatt sichtbar ein Stueck
  sind (siehe lib/pdf/feedback-pdf.ts).
*/

export interface ScoreSegment {
  key: string;
  name: string;
  points: number;
  maxPoints: number;
  /** grammar | sentence | vocabulary | connectives, sonst null (Inhalt). */
  colorKey?: string | null;
}

const CATEGORY_COLOR: Record<string, string> = {
  grammar: "var(--cat-grammar)",
  sentence: "var(--cat-sentence)",
  vocabulary: "var(--cat-vocabulary)",
  connectives: "var(--cat-connectives)",
};

function colorFor(colorKey?: string | null): string {
  return (colorKey && CATEGORY_COLOR[colorKey]) || "var(--amber-strong)";
}

export function ScoreObject({
  display,
  label,
  caption,
  segments,
}: {
  /** Anzeigewert im Notensystem, z.B. "14 / 15", "2,0", "80 %". */
  display: string;
  /** Klartext-Einordnung, z.B. "very good". */
  label?: string;
  /** Kleine Beschriftung, z.B. "99 / 105 points". */
  caption?: string;
  segments: ScoreSegment[];
}) {
  const hasSegments = segments.some((s) => s.maxPoints > 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-serif text-5xl leading-none text-ink tabular-nums lining-nums tracking-tight">
          {display}
        </span>
        {label && (
          <span className="font-serif text-xl italic text-ink-soft capitalize">{label}</span>
        )}
        {caption && <span className="text-ink-soft text-[13px] ml-auto">{caption}</span>}
      </div>

      {hasSegments && (
        <div
          className="mt-3 flex gap-1 h-3"
          role="img"
          aria-label={label ? `${display}, ${label}` : display}
        >
          {segments.map((s) => {
            const color = colorFor(s.colorKey);
            const pct =
              s.maxPoints > 0 ? Math.min(100, Math.max(0, (s.points / s.maxPoints) * 100)) : 0;
            return (
              <div
                key={s.key}
                className="relative h-full rounded-full overflow-hidden"
                style={{
                  flexGrow: Math.max(0.001, s.maxPoints),
                  background: `color-mix(in srgb, ${color} 16%, var(--paper))`,
                }}
                title={`${s.name}: ${s.points} / ${s.maxPoints}`}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
