import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlanPreview } from "@/components/PlanPreview";
import {
  defaultConfig, generatePlan, ETAPES, TOLERANCE_M2,
  type ApercuMode, type Assignation, type MorcConfig, type PlanResult,
} from "@/lib/morcellement-v11";

export const Route = createFileRoute("/app/morcellement")({
  component: MorcellementV11,
  head: () => ({
    meta: [
      { title: "Morcellement intelligent V1.1 — AcreMap" },
      { name: "description", content: "Configurer, prévisualiser et assigner les lots d'un morcellement agricole intelligent." },
      { property: "og:title", content: "Morcellement intelligent V1.1 — AcreMap" },
      { property: "og:description", content: "Configuration complète du morcellement : voirie, partage, points de collecte, aperçus et exports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const REFERENCE = "AC-PP-SP001-DOM001-PARC001";
const TOTAL_AREA_M2 = 184_000;

function MorcellementV11() {
  const [cfg, setCfg] = useState<MorcConfig>(defaultConfig());
  const [phase, setPhase] = useState<"config" | "generation" | "resultat">("config");
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [mode, setMode] = useState<ApercuMode>("global");
  const [selected, setSelected] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Record<string, Assignation>>({});
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const set = <K extends keyof MorcConfig>(k: K, v: MorcConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

  const lots = useMemo(() => plan?.lots.filter((l) => l.kind === "lot") ?? [], [plan]);
  const nonConformes = lots.filter((l) => !l.conforme);

  const lancer = () => {
    setPhase("generation"); setStep(0); setPlan(null); setSelected(null);
    ETAPES.forEach((_, i) => {
      setTimeout(() => {
        setStep(i + 1);
        if (i === ETAPES.length - 1) {
          setPlan(generatePlan(cfg, TOTAL_AREA_M2));
          setPhase("resultat");
        }
      }, 420 * (i + 1));
    });
  };

  const demoExport = (name: string) => {
    setToast(`Mode démonstration — ${name} (génération réelle prévue en phase backend)`);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Version 1.1 — interface</div>
          <h1 className="text-2xl lg:text-3xl font-bold">Morcellement intelligent</h1>
          <p className="text-sm text-muted-foreground">
            Configuration complète du projet de découpage · données de démonstration (aucune écriture en base).
          </p>
        </div>
        <div className="text-xs px-3 py-2 rounded-xl bg-warn/15 text-warn border border-warn/30 font-medium">
          Tolérance maximale : ±{TOLERANCE_M2} m² par lot
        </div>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-5 items-start">
        {/* ---------------- Colonne configuration ---------------- */}
        <div className="space-y-4">
          <Card title="A — Parcelle">
            <Row k="Référence" v={REFERENCE} />
            <Row k="Code parcelle" v="PARC001" />
            <Row k="Superficie totale" v={`${(TOTAL_AREA_M2 / 10000).toLocaleString("fr-FR")} ha`} />
            <Row k="Localisation" v="Gonaté · Haut-Sassandra" />
            <Row k="Référence spatiale" v="WGS84 / UTM 30N" />
          </Card>

          <Card title="B — Objectif de morcellement">
            <Field label="Type">
              <Select value={cfg.objectif} onChange={(v) => set("objectif", v as MorcConfig["objectif"])}
                options={[
                  ["lots_fixes", "Lots de superficie fixe"],
                  ["partage_ac", "Partage AC / Propriétaire"],
                  ["partage_perso", "Partage personnalisé"],
                  ["autre", "Autre configuration"],
                ]} />
            </Field>
            <Field label="Superficie cible">
              <Select value={cfg.cibleLibre ? "autre" : String(cfg.cibleHa)}
                onChange={(v) => v === "autre" ? set("cibleLibre", true) : (setCfg((c) => ({ ...c, cibleLibre: false, cibleHa: Number(v) })))}
                options={[...Array.from({ length: 9 }, (_, i) => [String(i + 1), `${i + 1} ha`] as [string, string]), ["autre", "Autre…"]]} />
            </Field>
            {cfg.cibleLibre && (
              <Field label="Superficie libre (ha)">
                <Num value={cfg.cibleHa} step={0.1} min={0.1} onChange={(v) => set("cibleHa", v)} />
              </Field>
            )}
            <Field label="Orientation du morcellement">
              <Select value={cfg.orientation} onChange={(v) => set("orientation", v as MorcConfig["orientation"])}
                options={[["auto", "Automatique — recommandé"], ["horizontale", "Horizontale"], ["verticale", "Verticale"],
                  ["geometrie", "Suivre la géométrie"], ["personnalisee", "Personnalisée"]]} />
            </Field>
            <p className="text-[11px] text-muted-foreground">
              L'orientation est une préférence : le moteur pourra l'adapter à la géométrie réelle.
            </p>
          </Card>

          <Card title="C — Partage AC / Propriétaire">
            <Check label="Activer le partage AC / Propriétaire" checked={cfg.partageActif}
              onChange={(v) => set("partageActif", v)} />
            {cfg.partageActif && (
              <>
                <Field label={`Part AgriCapital — ${cfg.partAcPct} %`}>
                  <input type="range" min={0} max={100} value={cfg.partAcPct} className="w-full"
                    onChange={(e) => set("partAcPct", Number(e.target.value))} />
                </Field>
                <Row k="Part Propriétaire" v={`${100 - cfg.partAcPct} %`} />
                <Field label="Organisation du partage">
                  <Select value={cfg.organisationPartage} onChange={(v) => set("organisationPartage", v as MorcConfig["organisationPartage"])}
                    options={[["auto", "Automatique"], ["horizontale", "Horizontale"], ["verticale", "Verticale"],
                      ["blocs", "Par blocs"], ["personnalisee", "Personnalisée"]]} />
                </Field>
              </>
            )}
          </Card>

          <Card title="D — Voirie et accès">
            <Check label="Activer une voie principale" checked={cfg.voiePrincipale} onChange={(v) => set("voiePrincipale", v)} />
            {cfg.voiePrincipale && (
              <>
                <Field label="Largeur">
                  <Select value={String(cfg.largeurVoieM)} onChange={(v) => set("largeurVoieM", Number(v))}
                    options={[["4", "4 m"], ["5", "5 m"], ["6", "6 m"], ["8", "8 m"], ["10", "10 m"]]} />
                </Field>
                <Field label="Positionnement">
                  <Select value={cfg.positionVoie} onChange={(v) => set("positionVoie", v as MorcConfig["positionVoie"])}
                    options={[["auto", "Automatique"], ["traversante", "Traversante"], ["laterale", "Latérale"],
                      ["centrale", "Centrale"], ["personnalisee", "Personnalisée"]]} />
                </Field>
                <Field label="Orientation de la voie">
                  <Select value={cfg.orientationVoie} onChange={(v) => set("orientationVoie", v as MorcConfig["orientationVoie"])}
                    options={[["auto", "Automatique"], ["horizontale", "Horizontale"], ["verticale", "Verticale"], ["terrain", "Suivre le terrain"]]} />
                </Field>
              </>
            )}
            <div className="h-px bg-border my-1" />
            <Check label="Ajouter des voies secondaires" checked={cfg.voiesSecondaires} onChange={(v) => set("voiesSecondaires", v)} />
            {cfg.voiesSecondaires && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Largeur (m)"><Num value={cfg.largeurVoieSecM} min={2} step={1} onChange={(v) => set("largeurVoieSecM", v)} /></Field>
                <Field label="Nombre"><Num value={cfg.nbVoiesSec} min={0} step={1} onChange={(v) => set("nbVoiesSec", v)} /></Field>
                <Field label="Orientation">
                  <Select value={cfg.orientationVoieSec} onChange={(v) => set("orientationVoieSec", v as MorcConfig["orientationVoieSec"])}
                    options={[["auto", "Automatique"], ["horizontale", "Horizontale"], ["verticale", "Verticale"], ["adaptative", "Adaptative"]]} />
                </Field>
                <Field label="Fréquence">
                  <Select value={String(cfg.frequenceLots)} onChange={(v) => set("frequenceLots", Number(v))}
                    options={[["2", "Tous les 2 lots"], ["3", "Tous les 3 lots"], ["4", "Tous les 4 lots"],
                      ["5", "Tous les 5 lots"], ["6", "Tous les 6 lots"]]} />
                </Field>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Géométrie intelligente prévue : voies droites ou inclinées, virages, liaisons, continuité des axes
              et adaptation aux limites de la parcelle.
            </p>
          </Card>

          <Card title="E — Points de collecte">
            <Check label="Ajouter des points de collecte" checked={cfg.collecteActive} onChange={(v) => set("collecteActive", v)} />
            {cfg.collecteActive && (
              <>
                <Field label="Nombre de points">
                  <Num value={cfg.nbCollecte} min={1} max={6} step={1} onChange={(v) => {
                    const n = Math.max(1, Math.min(6, v));
                    setCfg((c) => ({
                      ...c, nbCollecte: n,
                      collecte: Array.from({ length: n }, (_, i) => c.collecte[i] ?? {
                        id: `PC${i + 1}`, type: i === 0 ? "principal" : "secondaire", areaM2: 1500,
                      }),
                    }));
                  }} />
                </Field>
                {cfg.collecte.slice(0, cfg.nbCollecte).map((pc, i) => (
                  <div key={pc.id} className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-muted/50">
                    <Field label={`${pc.id} — type`}>
                      <Select value={pc.type} onChange={(v) => setCfg((c) => ({
                        ...c, collecte: c.collecte.map((p, j) => j === i ? { ...p, type: v as "principal" | "secondaire" } : p),
                      }))} options={[["principal", "Principal"], ["secondaire", "Secondaire"]]} />
                    </Field>
                    <Field label="Superficie">
                      <Select value={String(pc.areaM2)} onChange={(v) => setCfg((c) => ({
                        ...c, collecte: c.collecte.map((p, j) => j === i ? { ...p, areaM2: Number(v) } : p),
                      }))} options={[["1000", "1 000 m²"], ["1500", "1 500 m²"], ["2500", "2 500 m²"]]} />
                    </Field>
                  </div>
                ))}
              </>
            )}
          </Card>

          <Card title="F — Réserve / zone familiale">
            <Check label="Activer une réserve / zone familiale" checked={cfg.reserveActive} onChange={(v) => set("reserveActive", v)} />
            {cfg.reserveActive && (
              <>
                <Field label="Superficie (m²)"><Num value={cfg.reserveM2} min={100} step={100} onChange={(v) => set("reserveM2", v)} /></Field>
                <Field label="Famille propriétaire">
                  <input className="input" value={cfg.familleNom} onChange={(e) => set("familleNom", e.target.value)} />
                </Field>
                <p className="text-[11px] text-muted-foreground">Une seule zone graphique, libellé unique au centre.</p>
              </>
            )}
          </Card>

          <Card title="G — Contraintes et optimisation">
            <div className="grid grid-cols-1 gap-1.5">
              {([
                ["superficie", "Respecter au maximum la superficie cible"],
                ["acces", "Garantir l'accès à chaque lot"],
                ["residuels", "Minimiser les espaces résiduels"],
                ["etroits", "Éviter les lots trop étroits"],
                ["formes", "Éviter les formes difficilement exploitables"],
                ["circulation", "Optimiser la circulation"],
                ["positionVoies", "Optimiser la position des voies"],
                ["positionCollecte", "Optimiser la position des points de collecte"],
                ["partage", "Respecter le partage AC / Propriétaire"],
                ["orientationAuto", "Adapter automatiquement l'orientation"],
              ] as [keyof MorcConfig["optim"], string][]).map(([k, label]) => (
                <Check key={k} label={label} checked={cfg.optim[k]}
                  onChange={(v) => setCfg((c) => ({ ...c, optim: { ...c.optim, [k]: v } }))} />
              ))}
            </div>
            <Field label="Priorité">
              <Select value={cfg.priorite} onChange={(v) => set("priorite", v as MorcConfig["priorite"])}
                options={[["auto", "Automatique — recommandé"], ["superficie", "Superficie"], ["accessibilite", "Accessibilité"],
                  ["formes", "Forme des lots"], ["voirie", "Voirie"], ["equilibre", "Équilibre global"]]} />
            </Field>
          </Card>

          <button onClick={lancer} disabled={phase === "generation"}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-lg shadow-card disabled:opacity-60">
            {phase === "generation" ? "Génération en cours…" : "MORCELER LA PARCELLE"}
          </button>
        </div>

        {/* ---------------- Colonne aperçu ---------------- */}
        <div className="space-y-4">
          <section className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="p-3 border-b flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">H — Prévisualisation</h2>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {([["global", "Aperçu global"], ["entreprise", "Aperçu entreprise"], ["client", "Aperçu client"]] as [ApercuMode, string][])
                  .map(([m, l]) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium ${mode === m ? "bg-card shadow-card text-primary" : "text-muted-foreground"}`}>
                      {l}
                    </button>
                  ))}
              </div>
            </div>

            <div className="aspect-[4/3] bg-muted/40 relative">
              {phase === "config" && !plan && (
                <div className="absolute inset-0 grid place-items-center text-center p-8">
                  <div>
                    <div className="text-5xl">🗺️</div>
                    <p className="mt-3 font-medium">Avant morcellement — parcelle seule</p>
                    <p className="text-sm text-muted-foreground">Configurez le projet puis lancez « MORCELER LA PARCELLE ».</p>
                  </div>
                </div>
              )}
              {phase === "generation" && (
                <div className="absolute inset-0 grid place-items-center p-8">
                  <div className="w-full max-w-sm space-y-3">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(step / ETAPES.length) * 100}%` }} />
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {ETAPES.map((e, i) => (
                        <li key={e} className={i < step ? "text-primary font-medium" : "text-muted-foreground"}>
                          {i < step ? "✓" : "•"} {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {phase === "resultat" && plan && (
                <div className="absolute inset-0 p-3">
                  <PlanPreview plan={plan} mode={mode} selected={selected} reference={REFERENCE}
                    assigned={Object.fromEntries(Object.entries(assigned).map(([k, v]) => [k, { nom: v.nom, compte: v.compte }]))}
                    onSelect={(c) => setSelected(c)} />
                </div>
              )}
            </div>

            {plan && (
              <div className="p-3 border-t flex flex-wrap gap-3 text-xs text-muted-foreground">
                <Legend color="hsl(var(--primary) / 0.35)" label="Lots AgriCapital" />
                <Legend color="hsl(var(--secondary) / 0.3)" label="Lots propriétaire" />
                <Legend color="hsl(var(--accent) / 0.35)" label="Réserve familiale" />
                <Legend color="hsl(var(--warn) / 0.4)" label="Point de collecte" />
                <Legend color="hsl(var(--destructive) / 0.35)" label="Hors tolérance" />
                <Legend color="hsl(var(--foreground) / 0.2)" label="Voirie" />
              </div>
            )}
          </section>

          {plan && (
            <>
              <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <ScoreCard label="Score global" value={plan.score.global} big />
                <ScoreCard label="Superficies" value={plan.score.superficies} />
                <ScoreCard label="Accessibilité" value={plan.score.accessibilite} />
                <ScoreCard label="Formes" value={plan.score.formes} />
                <ScoreCard label="Voies" value={plan.score.voies} />
                <ScoreCard label="Espaces résiduels" value={plan.score.residuels} />
              </section>

              <div className={`rounded-xl p-3 text-sm border ${plan.conforme
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
                {plan.conforme
                  ? `Résultat optimisé — ${lots.length} lots conformes à ±${TOLERANCE_M2} m².`
                  : `Non-conformité — ${nonConformes.length} lot(s) hors tolérance : ${nonConformes.map((l) => l.code).join(", ")}.`}
              </div>

              <section className="bg-card rounded-2xl shadow-card overflow-hidden">
                <div className="p-3 border-b font-semibold">Tableau des lots</div>
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                      <tr>
                        <Th>Lot</Th><Th>Part</Th><Th>Cible</Th><Th>Réel</Th><Th>Écart</Th><Th>Statut</Th><Th>Client</Th><Th> </Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lots.map((l) => {
                        const ecart = l.reelM2 - l.cibleM2;
                        return (
                          <tr key={l.code} className={`${selected === l.code ? "bg-primary/5" : ""} hover:bg-muted/40`}>
                            <Td><button className="font-semibold underline-offset-2 hover:underline"
                              onClick={() => { setSelected(l.code); setMode("client"); }}>{l.code}</button></Td>
                            <Td>{l.part === "ac" ? "AgriCapital" : "Propriétaire"}</Td>
                            <Td>{l.cibleM2.toLocaleString("fr-FR")} m²</Td>
                            <Td>{l.reelM2.toLocaleString("fr-FR")} m²</Td>
                            <Td className={l.conforme ? "" : "text-destructive font-medium"}>
                              {ecart > 0 ? "+" : ""}{ecart.toLocaleString("fr-FR")} m²
                            </Td>
                            <Td>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${l.conforme
                                ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                                {l.conforme ? "CONFORME" : "NON CONFORME"}
                              </span>
                            </Td>
                            <Td className="text-xs">
                              {assigned[l.code]
                                ? <span>{assigned[l.code].nom}<br /><span className="text-muted-foreground">{assigned[l.code].compte}</span></span>
                                : <span className="text-muted-foreground">—</span>}
                            </Td>
                            <Td>
                              <button onClick={() => setAssignFor(l.code)}
                                className="text-xs px-2.5 py-1 rounded-md border hover:bg-muted">
                                {assigned[l.code] ? "Modifier" : "Assigner"}
                              </button>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="bg-card rounded-2xl shadow-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">J — Exports</h3>
                  <span className="text-[11px] text-muted-foreground">Mode démonstration — V1.1 UI</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Exp onClick={() => demoExport(`${REFERENCE}-PLAN-GLOBAL.pdf`)}
                    t="PDF Plan Global" s="Cotes & coordonnées relatives" />
                  <Exp onClick={() => demoExport(`${REFERENCE}-PLAN-ENTREPRISE.pdf`)}
                    t="PDF Plan Entreprise" s="Part AgriCapital · cotes & coordonnées" />
                  <Exp onClick={() => demoExport(`${REFERENCE}-${selected ?? "H01"}-PLAN-CLIENT.pdf`)}
                    t="PDF Plan Client" s={`Lot ${selected ?? "H01"} · cotes & coordonnées`} />
                  <Exp onClick={() => demoExport(`${REFERENCE}-PLANS-CLIENTS.zip`)}
                    t="Tous les plans clients (ZIP)" s="1 PDF par lot" />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Format :</span>
                  {["A4", "A3", "A2", "A1", "A0"].map((f) => (
                    <span key={f} className="text-xs px-2 py-1 rounded-md border">{f}</span>
                  ))}
                  <span className="text-[11px] text-muted-foreground">Haute résolution — lignes, cotes, légendes et tableaux préservés.</span>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {assignFor && (
        <AssignDialog
          code={assignFor}
          initial={assigned[assignFor]}
          onClose={() => setAssignFor(null)}
          onSave={(a) => {
            setAssigned((m) => ({ ...m, [assignFor]: a }));
            setAssignFor(null);
            setToast(`Lot ${assignFor} assigné à ${a.nom} (simulation locale).`);
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-foreground text-background text-sm shadow-elevated max-w-[92vw]">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- sous-composants ------------------------------- */

function AssignDialog({ code, initial, onClose, onSave }: {
  code: string; initial?: Assignation; onClose: () => void; onSave: (a: Assignation) => void;
}) {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [compte, setCompte] = useState(initial?.compte ?? "");
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-elevated w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">Assigner le lot {code}</h3>
        <Field label="Nom complet"><input className="input" value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
        <Field label="Contact"><input className="input" value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <Field label="Numéro de compte client"><input className="input" value={compte} onChange={(e) => setCompte(e.target.value)} /></Field>
        <p className="text-[11px] text-muted-foreground">Information simulée localement en V1.1 (aucun enregistrement en base).</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Annuler</button>
          <button disabled={!nom.trim()} onClick={() => onSave({ nom: nom.trim(), contact, compte })}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            Assigner
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl shadow-card p-4 space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
function Num({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return <input type="number" value={value} min={min} max={max} step={step}
    onChange={(e) => onChange(Number(e.target.value))}
    className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-[hsl(var(--primary))]" />
      <span>{label}</span>
    </label>
  );
}
function ScoreCard({ label, value, big }: { label: string; value: number; big?: boolean }) {
  const tone = value >= 85 ? "text-primary" : value >= 70 ? "text-warn" : "text-destructive";
  return (
    <div className="bg-card rounded-xl shadow-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-bold ${big ? "text-3xl" : "text-xl"} ${tone}`}>{value}<span className="text-xs text-muted-foreground">/100</span></div>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border" style={{ background: color }} />{label}</span>;
}
function Exp({ t, s, onClick }: { t: string; s: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left p-3 rounded-xl border hover:bg-muted/50 transition-colors">
      <div className="font-medium text-sm">{t}</div>
      <div className="text-xs text-muted-foreground">{s}</div>
    </button>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="text-left font-medium px-3 py-2">{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
