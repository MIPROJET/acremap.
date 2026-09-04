/**
 * AcreMap V1.1 — Module de morcellement intelligent : COUCHE UI / MOCK UNIQUEMENT.
 *
 * Aucune écriture base de données, aucun appel backend, aucun moteur réel.
 * Tout est simulé localement pour valider l'expérience utilisateur (UI FIRST).
 */

export const TOLERANCE_M2 = 100;

export type ObjectifType = "lots_fixes" | "partage_ac" | "partage_perso" | "autre";
export type Orientation = "auto" | "horizontale" | "verticale" | "geometrie" | "personnalisee";
export type OrganisationPartage = "auto" | "horizontale" | "verticale" | "blocs" | "personnalisee";
export type PositionVoie = "auto" | "traversante" | "laterale" | "centrale" | "personnalisee";
export type OrientationVoie = "auto" | "horizontale" | "verticale" | "terrain";
export type OrientationVoieSec = "auto" | "horizontale" | "verticale" | "adaptative";
export type PrioriteOptim =
  | "auto" | "superficie" | "accessibilite" | "formes" | "voirie" | "equilibre";
export type ApercuMode = "global" | "entreprise" | "client";

export interface CollectePoint {
  id: string;
  type: "principal" | "secondaire";
  areaM2: number;
}

export interface MorcConfig {
  objectif: ObjectifType;
  cibleHa: number;             // 1..9 ou libre
  cibleLibre: boolean;
  orientation: Orientation;

  partageActif: boolean;
  partAcPct: number;
  organisationPartage: OrganisationPartage;

  voiePrincipale: boolean;
  largeurVoieM: number;
  positionVoie: PositionVoie;
  orientationVoie: OrientationVoie;

  voiesSecondaires: boolean;
  largeurVoieSecM: number;
  nbVoiesSec: number;
  orientationVoieSec: OrientationVoieSec;
  frequenceLots: number;

  collecteActive: boolean;
  nbCollecte: number;
  collecte: CollectePoint[];

  reserveActive: boolean;
  reserveM2: number;
  familleNom: string;

  optim: {
    superficie: boolean; acces: boolean; residuels: boolean; etroits: boolean;
    formes: boolean; circulation: boolean; positionVoies: boolean;
    positionCollecte: boolean; partage: boolean; orientationAuto: boolean;
  };
  priorite: PrioriteOptim;
}

export const defaultConfig = (): MorcConfig => ({
  objectif: "lots_fixes",
  cibleHa: 1,
  cibleLibre: false,
  orientation: "auto",
  partageActif: false,
  partAcPct: 60,
  organisationPartage: "auto",
  voiePrincipale: true,
  largeurVoieM: 6,
  positionVoie: "auto",
  orientationVoie: "auto",
  voiesSecondaires: true,
  largeurVoieSecM: 4,
  nbVoiesSec: 2,
  orientationVoieSec: "auto",
  frequenceLots: 4,
  collecteActive: false,
  nbCollecte: 1,
  collecte: [{ id: "PC1", type: "principal", areaM2: 1500 }],
  reserveActive: false,
  reserveM2: 8600,
  familleNom: "Famille KOFFI",
  optim: {
    superficie: true, acces: true, residuels: true, etroits: true, formes: true,
    circulation: true, positionVoies: true, positionCollecte: true, partage: true,
    orientationAuto: true,
  },
  priorite: "auto",
});

export interface Assignation {
  nom: string;
  contact: string;
  compte: string;
}

export interface PlanLot {
  code: string;
  part: "ac" | "proprietaire";
  poly: [number, number][];    // repère normalisé 0..100
  cibleM2: number;
  reelM2: number;
  conforme: boolean;
  kind: "lot" | "reserve" | "collecte";
  label?: string;
}

export interface PlanVoie {
  kind: "principale" | "secondaire";
  poly: [number, number][];
  largeurM: number;
}

export interface PlanScore {
  global: number;
  superficies: number;
  accessibilite: number;
  formes: number;
  voies: number;
  residuels: number;
}

export interface PlanResult {
  lots: PlanLot[];
  voies: PlanVoie[];
  parcelle: [number, number][];
  score: PlanScore;
  conforme: boolean;
  cibleM2: number;
  totalM2: number;
  createdAt: number;
}

export const ETAPES = [
  "Analyse de la géométrie",
  "Organisation des lots",
  "Optimisation des voies",
  "Positionnement des points de collecte",
  "Vérification des superficies",
  "Préparation de l'aperçu",
];

/** Emprise de démonstration (quadrilatère légèrement irrégulier). */
export const PARCELLE_DEMO: [number, number][] = [
  [4, 6], [95, 2], [98, 88], [46, 97], [2, 84],
];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function clipX(y: number): [number, number] {
  // bornes approximatives gauche/droite de l'emprise de démonstration
  const left = 4 - (y / 100) * 2;
  const right = 95 + (y / 100) * 3 - (y > 88 ? (y - 88) * 4 : 0);
  return [Math.max(2, left), Math.min(98, right)];
}

/** Génération simulée : produit une organisation plausible, pas une grille parfaite. */
export function generatePlan(cfg: MorcConfig, totalAreaM2: number): PlanResult {
  const rand = rng(Math.round(cfg.cibleHa * 1000) + cfg.partAcPct + cfg.nbVoiesSec * 7 + Date.now() % 997);
  const cibleM2 = Math.round(cfg.cibleHa * 10_000);
  const vertical = cfg.orientation === "verticale";

  const lots: PlanLot[] = [];
  const voies: PlanVoie[] = [];

  let yTop = 8;
  const yBottom = 92;
  const rows: { y0: number; y1: number }[] = [];
  const rowH = Math.max(9, Math.min(20, 100 / Math.max(3, Math.round(totalAreaM2 / cibleM2 / 3))));

  if (cfg.voiePrincipale) {
    const y = cfg.positionVoie === "laterale" ? 12 : cfg.positionVoie === "centrale" ? 50 : 34;
    voies.push({
      kind: "principale",
      largeurM: cfg.largeurVoieM,
      poly: vertical
        ? [[y - 2.2, 6], [y + 2.2, 6], [y + 2.2, 94], [y - 2.2, 94]]
        : [[3, y - 2.2], [97, y - 3.4], [97, y + 1], [3, y + 2.2]],
    });
  }

  while (yTop < yBottom - 4) {
    const h = rowH * (0.85 + rand() * 0.3);
    rows.push({ y0: yTop, y1: Math.min(yBottom, yTop + h) });
    yTop += h + 1.4;
  }

  let n = 0;
  rows.forEach((row, ri) => {
    const [xl, xr] = clipX((row.y0 + row.y1) / 2);
    const cols = Math.max(2, Math.round((xr - xl) / (12 + rand() * 4)));
    const w = (xr - xl) / cols;
    for (let c = 0; c < cols; c++) {
      const skew = (rand() - 0.5) * 1.6;
      const x0 = xl + c * w;
      const x1 = x0 + w - 0.8;
      n += 1;
      const code = `H${String(n).padStart(2, "0")}`;
      const ecart = Math.round((rand() - 0.45) * 260);
      const reel = cibleM2 + ecart;
      const isAc = cfg.partageActif && (n % 100) / 100 < cfg.partAcPct / 100;
      lots.push({
        code,
        part: isAc ? "ac" : "proprietaire",
        poly: [
          [x0, row.y0 + skew], [x1, row.y0 - skew],
          [x1, row.y1 + skew], [x0, row.y1 - skew],
        ],
        cibleM2,
        reelM2: reel,
        conforme: Math.abs(reel - cibleM2) <= TOLERANCE_M2,
        kind: "lot",
      });
    }
    if (cfg.voiesSecondaires && ri > 0 && ri % Math.max(1, Math.round(cfg.frequenceLots / 2)) === 0
        && voies.filter((v) => v.kind === "secondaire").length < cfg.nbVoiesSec) {
      const y = row.y0 - 1.1;
      voies.push({
        kind: "secondaire", largeurM: cfg.largeurVoieSecM,
        poly: [[xl, y - 0.9], [xr, y - 1.4], [xr, y + 0.6], [xl, y + 1.1]],
      });
    }
  });

  if (cfg.reserveActive && lots.length > 3) {
    const victims = lots.splice(0, 2);
    const xs = victims.flatMap((l) => l.poly.map((p) => p[0]));
    const ys = victims.flatMap((l) => l.poly.map((p) => p[1]));
    lots.unshift({
      code: "RES",
      part: "proprietaire",
      kind: "reserve",
      poly: [
        [Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)],
        [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)],
      ],
      cibleM2: cfg.reserveM2,
      reelM2: cfg.reserveM2,
      conforme: true,
      label: `RÉSERVE FAMILIALE — ${(cfg.reserveM2 / 10000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha`,
    });
  }

  if (cfg.collecteActive) {
    cfg.collecte.slice(0, cfg.nbCollecte).forEach((pc, i) => {
      const cx = 20 + i * 26, cy = 20 + (i % 2) * 55;
      const s = pc.type === "principal" ? 6 : 4;
      lots.push({
        code: pc.id, part: "ac", kind: "collecte",
        poly: [[cx, cy], [cx + s, cy - 0.5], [cx + s, cy + s], [cx, cy + s]],
        cibleM2: pc.areaM2, reelM2: pc.areaM2, conforme: true,
        label: `${pc.type === "principal" ? "PC PRINCIPAL" : "PC SECONDAIRE"} — ${pc.areaM2} m²`,
      });
    });
  }

  const utiles = lots.filter((l) => l.kind === "lot");
  const nonConformes = utiles.filter((l) => !l.conforme).length;
  const superficies = Math.round(100 - (nonConformes / Math.max(1, utiles.length)) * 100);
  const score: PlanScore = {
    superficies,
    accessibilite: cfg.voiePrincipale ? (cfg.voiesSecondaires ? 96 : 84) : 62,
    formes: cfg.optim.etroits ? 91 : 76,
    voies: cfg.optim.positionVoies ? 93 : 78,
    residuels: cfg.optim.residuels ? 88 : 70,
    global: 0,
  };
  score.global = Math.round(
    (score.superficies * 0.35 + score.accessibilite * 0.2 + score.formes * 0.15 +
     score.voies * 0.15 + score.residuels * 0.15),
  );

  return {
    lots, voies, parcelle: PARCELLE_DEMO, score,
    conforme: nonConformes === 0,
    cibleM2,
    totalM2: utiles.reduce((a, l) => a + l.reelM2, 0),
    createdAt: Date.now(),
  };
}
