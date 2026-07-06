/*
  Reine Geometrie-Bausteine fuer das Ingest (kein Browser, kein Node-fs).
  Alles hier ist testbar mit einfachen Zahlen und Puffern.

  Enthaelt:
  - Punkt-Typen und kleine Vektor-Helfer
  - Loesen eines linearen Gleichungssystems (Gauss)
  - Homographie (perspektivische Abbildung) aus vier Punktpaaren
  - Anwenden einer Homographie auf einen Punkt
*/

export interface Point {
  x: number;
  y: number;
}

/** Vier Eckpunkte in fester Reihenfolge: oben-links, oben-rechts, unten-rechts, unten-links. */
export interface Quad {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Loest ein lineares Gleichungssystem A x = b mit Gauss-Elimination und
 * Teil-Pivotisierung. A ist n x n (Zeilen-Major), b hat Laenge n.
 * Gibt den Loesungsvektor x zurueck. Wirft bei Singularitaet.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Erweiterte Matrix
  const m = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Pivot suchen (groesster Betrag)
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) {
      throw new Error("Gleichungssystem ist singulaer (Marker liegen entartet).");
    }
    // Zeilen tauschen
    [m[col], m[pivot]] = [m[pivot], m[col]];

    // Normieren und eliminieren
    const pivVal = m[col][col];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col] / pivVal;
      for (let c = col; c <= n; c++) {
        m[r][c] -= factor * m[col][c];
      }
    }
  }

  const x = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    x[i] = m[i][n] / m[i][i];
  }
  return x;
}

/**
 * Homographie 3x3 (als 9-Element-Array, Zeilen-Major, h22 = 1) aus vier
 * Quell- zu vier Zielpunkten. src[i] wird auf dst[i] abgebildet.
 *
 * Es werden acht Unbekannte (h00..h21) aus acht Gleichungen bestimmt.
 */
export function computeHomography(src: Point[], dst: Point[]): number[] {
  if (src.length !== 4 || dst.length !== 4) {
    throw new Error("Homographie braucht genau vier Punktpaare.");
  }
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    // X = (h00 x + h01 y + h02) / (h20 x + h21 y + 1)
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    b.push(X);
    // Y = (h10 x + h11 y + h12) / (h20 x + h21 y + 1)
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    b.push(Y);
  }
  const h = solveLinearSystem(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** Wendet eine Homographie (9er-Array) auf einen Punkt an. */
export function applyHomography(h: number[], p: Point): Point {
  const denom = h[6] * p.x + h[7] * p.y + h[8];
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / denom,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / denom,
  };
}

/** Ordnet vier Punkte zu einem Quad (oben-links, oben-rechts, unten-rechts, unten-links). */
export function orderCorners(points: Point[]): Quad {
  if (points.length !== 4) {
    throw new Error("orderCorners braucht genau vier Punkte.");
  }
  // Nach Summe (x+y): kleinster ist oben-links, groesster unten-rechts.
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const topLeft = bySum[0];
  const bottomRight = bySum[3];
  // Von den verbleibenden zwei: kleineres x ist unten-links, groesseres oben-rechts.
  const rest = bySum.slice(1, 3).sort((a, b) => a.x - b.x);
  const bottomLeft = rest[0].y > rest[1].y ? rest[0] : rest[1];
  const topRight = rest[0].y > rest[1].y ? rest[1] : rest[0];
  return { topLeft, topRight, bottomRight, bottomLeft };
}
