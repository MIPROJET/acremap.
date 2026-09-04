import type { ApercuMode, PlanResult, PlanLot } from "@/lib/morcellement-v11";

/** Aperçu vectoriel du morcellement (données mockées V1.1). */
export function PlanPreview({
  plan, mode, selected, assigned, onSelect, reference,
}: {
  plan: PlanResult;
  mode: ApercuMode;
  selected?: string | null;
  assigned?: Record<string, { nom: string; compte: string }>;
  onSelect?: (code: string) => void;
  reference: string;
}) {
  const dim = (l: PlanLot) => {
    if (mode === "entreprise" && l.kind === "lot" && l.part !== "ac") return true;
    if (mode === "client" && l.kind === "lot" && l.code !== selected) return true;
    return false;
  };

  const fill = (l: PlanLot) => {
    if (l.kind === "reserve") return "hsl(var(--accent) / 0.22)";
    if (l.kind === "collecte") return "hsl(var(--warn) / 0.3)";
    if (!l.conforme) return "hsl(var(--destructive) / 0.22)";
    if (l.part === "ac") return "hsl(var(--primary) / 0.22)";
    return "hsl(var(--secondary) / 0.18)";
  };

  return (
    <svg viewBox="-4 -4 108 116" className="w-full h-full" role="img" aria-label="Aperçu du morcellement">
      <polygon points={plan.parcelle.map((p) => p.join(",")).join(" ")}
        fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="0.6" />

      {plan.voies.map((v, i) => (
        <polygon key={`v${i}`} points={v.poly.map((p) => p.join(",")).join(" ")}
          fill="hsl(var(--foreground) / 0.13)" stroke="hsl(var(--foreground) / 0.35)"
          strokeWidth="0.2" strokeDasharray="1 1" />
      ))}

      {plan.lots.map((l) => {
        const cx = l.poly.reduce((a, p) => a + p[0], 0) / l.poly.length;
        const cy = l.poly.reduce((a, p) => a + p[1], 0) / l.poly.length;
        const faded = dim(l);
        return (
          <g key={l.code} opacity={faded ? 0.22 : 1}
            onClick={() => l.kind === "lot" && onSelect?.(l.code)}
            className={l.kind === "lot" ? "cursor-pointer" : ""}>
            <polygon points={l.poly.map((p) => p.join(",")).join(" ")}
              fill={fill(l)}
              stroke={selected === l.code ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.6)"}
              strokeWidth={selected === l.code ? 0.8 : 0.25} />
            {l.kind === "lot" ? (
              <>
                <text x={cx} y={cy - 0.4} textAnchor="middle" fontSize="2.1" fontWeight="700"
                  fill="hsl(var(--foreground))">{l.code}</text>
                <text x={cx} y={cy + 2.2} textAnchor="middle" fontSize="1.5"
                  fill="hsl(var(--muted-foreground))">
                  {l.reelM2.toLocaleString("fr-FR")} m²
                </text>
                {assigned?.[l.code] && (
                  <text x={cx} y={cy + 4.4} textAnchor="middle" fontSize="1.4" fill="hsl(var(--primary))">
                    {assigned[l.code].nom}
                  </text>
                )}
              </>
            ) : (
              <text x={cx} y={cy + 1} textAnchor="middle" fontSize="1.7" fontWeight="700"
                fill="hsl(var(--foreground))">{l.label}</text>
            )}
          </g>
        );
      })}

      <text x="0" y="106" fontSize="2.6" fontWeight="700" fill="hsl(var(--foreground))">{reference}</text>
      <text x="0" y="110" fontSize="2" fill="hsl(var(--muted-foreground))">
        Coordonnées relatives · WGS84 / UTM 30N · aperçu {mode}
      </text>
    </svg>
  );
}
