// Tymczasowy plik do wklejania kodu z Claude.
//
// Zasada pracy:
// - wklej tutaj pełny kod JSX wygenerowany/testowany w Claude,
// - ten plik NIE jest uruchamiany przez aplikację i NIE trafia do GitHub Pages,
// - traktujemy go jako materiał porównawczy do przeniesienia zmian do `szafki.jsx`,
// - docelowym plikiem aplikacji pozostaje `szafki.jsx`.
//
// Jeśli wklejasz kod z Claude, najlepiej zastąp całą zawartość tego pliku.

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ============================================================
   SZAFKI — poziomy, kolumny, przegrody
   ============================================================ */

const INK = "#1c1917";
const LINE = "#57534e";
const DIMC = "#0369a1";
const WARNC = "#b45309";
const ERRC = "#b91c1c";
const ACC = "#0f766e";
const PALETA = [
  ["Biały", "#f4f2ee"],
  ["Biały mat", "#e8e6e1"],
  ["Szary", "#9c9b97"],
  ["Antracyt", "#4a4d4f"],
  ["Czarny", "#2b2a28"],
  ["Dąb sonoma", "#d8c3a0"],
  ["Dąb wotan", "#b39a76"],
  ["Orzech", "#7a5638"],
  ["Buk", "#d9b98a"],
  ["Brąz", "#5b4433"],
];

const MIN_COL = 200; // najwezsza sensowna kolumna

/* Sevroll V-BOX 3D Slim, wymiary elementow dla plyty 18 mm */
const VBOX = {
  heights: [80, 95, 127, 178, 210, 238],
  backH: { 80: 71, 95: 86, 127: 118, 178: 169, 210: 200, 238: 230 },
  // minimalna wysokosc frontu zalezy od tego, czy front idzie na korpus czy w niego
  minFront: {
    overlay: { 80: 95, 95: 110, 127: 142, 178: 192, 210: 223, 238: 253 },
    inset: { 80: 93, 95: 108, 127: 140, 178: 190, 210: 221, 238: 251 },
  },
  nl: [250, 270, 300, 350, 400, 450, 500, 550, 600],
};

const fmt = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

const num = (v) =>
  v === "" || v === null || v === undefined || Number.isNaN(Number(v))
    ? null
    : Math.round(Number(v));

/* zawiasy: dwa w standardzie, wiecej dopiero przy duzym i szerokim skrzydle */
function autoHinges(h, w) {
  if (w <= 500) return 2;
  if (h > 2000) return 4;
  if (h > 1400) return 3;
  return 2;
}

/* rozdziela `total` na pola: podane zostaja, puste dziela reszte po rowno */
function distribute(total, targets) {
  const t = targets.map(num);
  const fixed = t.reduce((s, v) => s + (v === null ? 0 : v), 0);
  const auto = t.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  const out = t.slice();
  if (auto.length) {
    const rest = total - fixed;
    const base = rest >= 0 ? Math.floor(rest / auto.length) : 0;
    const rem = rest >= 0 ? rest - base * auto.length : 0;
    auto.forEach((idx, k) => (out[idx] = rest >= 0 ? base + (k < rem ? 1 : 0) : 0));
  }
  const sum = out.reduce((s, v) => s + v, 0);
  return { sizes: out, diff: total - sum };
}

/* ---------- domyslny projekt ---------- */

const defaultMaterials = {
  board: { name: "Płyta laminowana 18", thickness: 18, color: "#d8c3a0" },
  front: { name: "Płyta laminowana 18", thickness: 18, color: "#c2a880" },
  shelf: { name: "Płyta laminowana 18", thickness: 18, color: "#d0bb96" },
  back: { name: "HDF 3", thickness: 3, color: "#9c7b56" },
  mirror: { name: "Lustro 4", thickness: 4, color: "#c3d0d6" },
};

const newColumn = (doors = 1, shelves = 0) => ({
  w: null,
  kind: "doors",
  doors,
  shelfTargets: Array(shelves + 1).fill(null),
  nl: null,
  drawers: [],
  doorWidths: [],
  mirrors: [],
  handles: [],
  hinges: [],
  backMode: "inherit",
  fix: { side: "none", w: 60, mode: "overlay", support: false, supportDepth: 100 },
  blendaMode: "overlay",
  hinge: "auto",
});

const newDrawer = (h = "auto") => ({ h, front: null, handle: true });

const newLevel = (doors = 2, shelves = 3) => ({
  h: null,
  cols: [newColumn(doors, shelves)],
});

const defaultCab = {
  version: 4,
  name: "Szafka 1",
  W: 600,
  H: 720,
  D: 500,
  bottomMode: "between",
  topMode: "between",
  depthIncludesBack: false,
  depthIncludesFront: false,
  back: "hdf",
  backPos: "inside",
  backBoardMat: "shelf",
  backGroove: { on: false, offset: 3, depth: 4, play: 1 },
  frontMode: "overlay",
  gaps: { edge: 2, between: 2, top: 2, bottom: 2, inset: 2, divOverlay: 8 },
  maxGap: 5,
  shelfExtraSetback: 0,
  levels: [newLevel(2, 3)],
  plinth: { on: false, height: 100, mode: "inbody", setback: 0 },
  rail: { on: false, height: 100, pos: "top", upright: false },
  frontSameAsBoard: true,
  shelfSameAsBoard: true,
  openAngle: 90,
  legs: { on: false, height: 100 },
  grainMatters: false,
  realColors: false,
  cutout: { on: false, corner: "backRight", w: 100, d: 100, fullHeight: true, levelIndex: 0, mask: true, maskType: "auto", maskFront: "over" },
  obstacles: [],
  // kazdy element: { on, w, d, h, side, fromSide, fromBack, fromBottom, fullHeight,
  //   mask, maskType, maskFront, maskCorner, maskToShelf, maskH }
  obstacle: { on: false, w: 80, d: 80, h: 0, side: "right", fromSide: 0, fromBack: 0, fromBottom: 0, fullHeight: true, mask: false, maskType: "auto", maskFront: "over" },
  edgeOverrides: {},
};

/* ---------- geometria ---------- */

function computeGeo(cab, mat) {
  const t = mat.board.thickness;
  const tf = mat.front.thickness;
  const backIsBoard = cab.back === "board";
  // plyta na plecy ma grubosc korpusu, HDF swoja wlasna
  const tb = backIsBoard ? mat.board.thickness : mat.back.thickness;
  const backPos = cab.backPos === "outside" ? "outside" : "inside";
  const { W, H, D } = cab;
  const g = cab.gaps;
  const msgs = [];
  const add = (level, text) => msgs.push({ level, text });

  const gr = cab.backGroove || { on: false, offset: 3, depth: 4, play: 1 };
  const grooved = cab.back === "hdf" && !!gr.on;
  const grOff = Math.max(0, Math.round(gr.offset ?? 3));
  const grDep = Math.max(0, Math.round(gr.depth ?? 4));
  const grPlay = Math.max(0, Math.round(gr.play ?? 1));

  // plecy we frezie chowaja sie w korpusie, wiec nie doliczaja sie do glebokosci
  let carcassDepth = D;
  if (!grooved && cab.depthIncludesBack && cab.back !== "none") carcassDepth -= tb;
  // front nakladany wystaje przed korpus; jesli podana glebokosc go zawiera, korpus jest plytszy
  if (cab.depthIncludesFront && cab.frontMode === "overlay") {
    const anyFront = (cab.levels || []).some((lv) =>
      (lv.cols || []).some((c) => (c.kind !== "blenda") && ((c.doors ?? 0) > 0 || (c.drawers || []).length))
    );
    if (anyFront) carcassDepth -= tf;
  }
  const hasBack = cab.back !== "none";
  const rear = !hasBack;

  if (grooved) {
    if (grDep >= t)
      add("error", `Frez ${grDep} mm jest głębszy niż płyta ${fmt(t)} mm.`);
    if (grPlay >= grDep)
      add("error", "Luz we frezie jest większy niż jego głębokość — plecy nie wejdą.");
    if (grOff + tb > carcassDepth)
      add("error", "Frez wypada poza głębokość korpusu.");
  }

  if (W <= 2 * t) add("error", "Szerokość jest mniejsza niż dwie grubości płyty.");
  if (H <= 2 * t) add("error", "Wysokość jest mniejsza niż dwie grubości płyty.");
  if (carcassDepth <= 0) add("error", "Głębokość korpusu wychodzi zero lub mniej.");

  // dno i wieniec: kazde zlacze osobno — "between" = plyta miedzy bokami, "over" = plyta na boku
  const J = cab.joints || {};
  const legacy = (m) => (m === "outside" || m === "under" ? "over" : "between");
  const topL = J.topL || legacy(cab.topMode);
  const topR = J.topR || legacy(cab.topMode);
  const botL = J.botL || legacy(cab.bottomMode);
  const botR = J.botR || legacy(cab.bottomMode);

  const leftLen = H - (topL === "over" ? t : 0) - (botL === "over" ? t : 0);
  const rightLen = H - (topR === "over" ? t : 0) - (botR === "over" ? t : 0);
  const leftY0 = botL === "over" ? t : 0;
  const rightY0 = botR === "over" ? t : 0;
  const topX0 = topL === "between" ? t : 0;
  const topX1 = topR === "between" ? W - t : W;
  const botX0 = botL === "between" ? t : 0;
  const botX1 = botR === "between" ? W - t : W;

  const pMode = cab.plinth.mode === "between" ? "inbody" : cab.plinth.mode;
  const plinthInBody =
    cab.plinth.on && pMode === "inbody" && botL === "between" && botR === "between";
  const plinthH = cab.plinth.on ? cab.plinth.height : 0;
  const bottomY = plinthInBody ? plinthH : 0;

  const interior = { x0: t, x1: W - t, y0: bottomY + t, y1: H - t };
  const innerW = interior.x1 - interior.x0;
  const innerH = interior.y1 - interior.y0;

  // przy plecach we frezie polka musi zatrzymac sie przed HDF
  const backIntrusion = grooved ? grOff + tb : 0; // polka konczy sie przed licem HDF
  const frontCut =
    (cab.shelfExtraSetback || 0) + (cab.frontMode === "inset" ? tf + 5 : 0);
  const shelfDepth = Math.round(carcassDepth - backIntrusion - frontCut);
  const dividerDepth = Math.round(carcassDepth - backIntrusion);
  if (shelfDepth <= 0)
    add("error", "Głębokość półki wychodzi zero lub mniej — zmniejsz cofnięcie półki.");

  /* --- poziomy: rozdzielone półkami na całą szerokość --- */
  const rawLevels = cab.levels && cab.levels.length ? cab.levels : [newLevel()];
  const L = rawLevels.length;
  const levFree = innerH - (L - 1) * t;
  const lev = distribute(levFree, rawLevels.map((l) => l.h));
  if (lev.diff !== 0)
    add(
      "error",
      lev.diff < 0
        ? `Zadane wysokości poziomów przekraczają wnętrze o ${fmt(-lev.diff)} mm.`
        : `Zadane wysokości poziomów nie wypełniają wnętrza — brakuje ${fmt(lev.diff)} mm.`
    );

  const levels = [];
  const sepShelves = [];
  let cy = interior.y0;
  for (let i = 0; i < L; i++) {
    const h = lev.sizes[i];
    levels.push({ i, y0: cy, y1: cy + h, h, cols: [], fixed: num(rawLevels[i].h) !== null });
    cy += h;
    if (i < L - 1) {
      sepShelves.push({ y: cy });
      cy += t;
    }
    if (h > 0 && h < 60) add("warn", `Poziom ${i + 1} ma tylko ${fmt(h)} mm światła.`);
    if (h < 0) add("error", `Poziom ${i + 1} ma ujemną wysokość.`);
  }

  /* --- kolumny wewnątrz poziomów --- */
  const dividers = [];
  levels.forEach((lv) => {
    const rawCols = rawLevels[lv.i].cols && rawLevels[lv.i].cols.length
      ? rawLevels[lv.i].cols
      : [newColumn()];
    const K = rawCols.length;
    const colFree = innerW - (K - 1) * t;
    const col = distribute(colFree, rawCols.map((c) => c.w));
    if (col.diff !== 0)
      add(
        "error",
        col.diff < 0
          ? `Poziom ${lv.i + 1}: kolumny przekraczają szerokość wnętrza o ${fmt(-col.diff)} mm.`
          : `Poziom ${lv.i + 1}: kolumny nie wypełniają szerokości — brakuje ${fmt(col.diff)} mm.`
      );

    let cx = interior.x0;
    for (let j = 0; j < K; j++) {
      const w = col.sizes[j];
      const c = {
        j,
        x0: cx,
        x1: cx + w,
        w,
        fixed: num(rawCols[j].w) !== null,
        shelves: [],
        openings: [],
        doors: [],
      };
      if (w > 0 && w < MIN_COL)
        add(
          "warn",
          `Poziom ${lv.i + 1}, kolumna ${j + 1}: światło ${fmt(w)} mm, poniżej rozsądnego minimum ${MIN_COL} mm.`
        );
      if (w <= 0)
        add("error", `Poziom ${lv.i + 1}, kolumna ${j + 1}: szerokość zero lub mniej.`);

      /* półki wewnątrz kolumny — kolumna z szufladami ich nie ma */
      const st =
        rawCols[j].kind === "drawers" ? [null] : rawCols[j].shelfTargets || [null];
      const nS = Math.max(0, st.length - 1);
      const shFree = lv.h - nS * t;
      const sh = distribute(shFree, st);
      if (sh.diff !== 0)
        add(
          "error",
          `Poziom ${lv.i + 1}, kolumna ${j + 1}: zadane światła nie zgadzają się o ${fmt(Math.abs(sh.diff))} mm.`
        );
      let sy = lv.y0;
      for (let k = 0; k <= nS; k++) {
        c.openings.push({ k, from: sy, to: sy + sh.sizes[k], h: sh.sizes[k], fixed: num(st[k]) !== null });
        if (sh.sizes[k] > 0 && sh.sizes[k] < 50)
          add(
            "warn",
            `Poziom ${lv.i + 1}, kolumna ${j + 1}, światło ${k + 1}: tylko ${fmt(sh.sizes[k])} mm.`
          );
        sy += sh.sizes[k];
        if (k < nS) {
          c.shelves.push({ y: sy });
          sy += t;
        }
      }

      lv.cols.push(c);
      cx += w;
      if (j < K - 1) {
        dividers.push({ x: cx, y0: lv.y0, y1: lv.y1, h: lv.h, level: lv.i });
        cx += t;
      }
    }
  });

  /* --- fronty: pasmo pionowe z poziomu, poziome z kolumny --- */
  const half = g.between / 2;
  const divOv = Math.max(0, Math.round(g.divOverlay ?? 8));
  const divGap = t - 2 * divOv; // szczelina miedzy frontami nad przegroda
  if (cab.frontMode === "overlay") {
    if (divGap < 2)
      add(
        "error",
        `Nałożenie ${divOv} mm z obu stron zostawia nad przegrodą tylko ${fmt(divGap)} mm szczeliny — potrzeba minimum 2 mm.`
      );
    else if (divGap > cab.maxGap)
      add(
        "warn",
        `Szczelina nad przegrodą to ${fmt(divGap)} mm — powyżej przyjętego maksimum.`
      );
  }
  const doors = [];
  const drawerParts = [];
  const fixParts = [];
  const blendaParts = [];
  const mirrorParts = [];
  let handleCount = 0;
  let hingeCount = 0;
  const slideGroups = new Map();
  const supportParts = [];
  const insetExtra = cab.frontMode === "inset" ? tf : 0;
  const maxNL = [...VBOX.nl].reverse().find((v) => v + 3 + insetExtra <= carcassDepth) ?? null;

  // przeszkody ograniczajace glebokosc szuflad: wyciecie narożnika i element kolizyjny
  const backBlocks = [];
  {
    const cu = cab.cutout;
    if (cu?.on) {
      const onL = cu.corner === "backLeft" || cu.corner === "frontLeft";
      const onB = cu.corner === "backLeft" || cu.corner === "backRight";
      const cwv = Math.round(cu.w || 0), cdv = Math.round(cu.d || 0);
      if (onB && cwv > 0 && cdv > 0) {
        // zabudowa zabiera dodatkowo grubosc plyty czola
        const maskT = cu.mask !== false ? t : 0;
        backBlocks.push({ x0: onL ? 0 : W - cwv, x1: onL ? cwv : W, free: carcassDepth - cdv - maskT });
      }
    }
    const preList = (Array.isArray(cab.obstacles) && cab.obstacles.length
      ? cab.obstacles
      : cab.obstacle?.on ? [cab.obstacle] : []).filter((o) => o && o.on !== false);
    preList.forEach((obs) => {
      const ow = Math.round(obs.w || 0), od = Math.round(obs.d || 0);
      const fs = Math.round(obs.fromSide || 0), fb = Math.round(obs.fromBack || 0);
      if (ow > 0 && od > 0) {
        const x0 = obs.side === "left" ? fs : W - fs - ow;
        const maskT = obs.mask ? t : 0;
        backBlocks.push({ x0, x1: x0 + ow, free: carcassDepth - (fb + od) - maskT });
      }
    });
  }
  // najglebsze NL, jakie zmiesci sie w danym pasmie szerokosci
  const maxNlFor = (x0, x1) => {
    let blocked = false;
    const lim = backBlocks.reduce((acc, b) => {
      if (Math.min(b.x1, x1) - Math.max(b.x0, x0) > 0) {
        blocked = true;
        return Math.min(acc, b.free);
      }
      return acc;
    }, carcassDepth);
    // przy przeszkodzie wymagamy 4 mm luzu miedzy szuflada a zabudowa
    const margin = blocked ? 4 : 3;
    return [...VBOX.nl].reverse().find((v) => v + margin + insetExtra <= lim) ?? null;
  };

  levels.forEach((lv) => {
    let lo, hi;
    if (cab.frontMode === "overlay") {
      lo =
        lv.i === 0
          ? bottomY + g.bottom
          : Math.round(sepShelves[lv.i - 1].y + t / 2 + Math.ceil(half));
      hi =
        lv.i === levels.length - 1
          ? H - g.top
          : Math.round(sepShelves[lv.i].y + t / 2 - Math.floor(half));
    } else {
      lo = lv.y0 + g.inset;
      hi = lv.y1 - g.inset;
    }
    lv.frontLo = lo;
    lv.frontHi = hi;
    const bandH = Math.round(hi - lo);

    lv.cols.forEach((c, j) => {
      const rawCol = rawLevels[lv.i].cols[j];
      const kind =
        rawCol.kind === "drawers" || rawCol.kind === "blenda" ? rawCol.kind : "doors";
      c.kind = kind;
      const where = `Poziom ${lv.i + 1}, kolumna ${j + 1}`;

      let sx0, sx1;
      if (cab.frontMode === "overlay") {
        // front zachodzi na przegrode o zadana wartosc, reszta przegrody to szczelina
        sx0 = j === 0 ? g.edge : Math.round(c.x0 - divOv);
        sx1 = j === lv.cols.length - 1 ? W - g.edge : Math.round(c.x1 + divOv);
      } else {
        sx0 = c.x0 + g.inset;
        sx1 = c.x1 - g.inset;
      }
      /* element staly (fix) zabiera kawalek pasma od strony sciany */
      const rawFix = rawCol.fix || { side: "none", w: 0 };
      const fixW = Math.max(0, Math.round(rawFix.w || 0));
      const hasFix = rawFix.side === "left" || rawFix.side === "right";
      const fixInset = rawFix.mode === "inset";
      if (hasFix && fixW > 0) {
        // fix wpuszczany siedzi w swietle korpusu, nakladany w pasmie frontu
        const fLo = fixInset ? lv.y0 + g.inset : lo;
        const fH = fixInset ? Math.round(lv.y1 - lv.y0 - 2 * g.inset) : bandH;
        const fx = fixInset
          ? rawFix.side === "left"
            ? c.x0 + g.inset
            : c.x1 - g.inset - fixW
          : rawFix.side === "left"
          ? sx0
          : sx1 - fixW;
        c.fix = { x: fx, y: fLo, w: fixW, h: fH, side: rawFix.side, inset: fixInset };
        fixParts.push({ h: fH, w: fixW });
        doors.push({
          lvl: lv.i,
          key: `f${lv.i}-${j}`,
          type: "fix",
          colKey: `${lv.i}-${j}`,
          x: fx,
          y: fLo,
          w: fixW,
          h: fH,
          iInGroup: 0,
          groupN: 1,
        });
        if (rawFix.support) {
          const sd = Math.max(0, Math.round(rawFix.supportDepth || 0));
          if (sd <= 0) add("error", `${where}: wspornik pionowy ma zerową głębokość.`);
          else if (sd > carcassDepth)
            add("error", `${where}: wspornik pionowy głębszy niż korpus.`);
          else if (kind === "drawers") {
            const needNl = num(rawCol.nl) ?? maxNL;
            if (needNl && sd < needNl)
              add(
                "error",
                `${where}: wspornik ma ${fmt(sd)} mm, a prowadnica NL ${needNl} musi się na nim oprzeć na całej długości — daj minimum ${needNl} mm.`
              );
          }
          else {
            supportParts.push({ h: lv.h, d: sd });
            c.support = { d: sd, side: rawFix.side };
          }
        }
        if (rawFix.side === "left") sx0 = Math.max(sx0, fx + fixW + g.between);
        else sx1 = Math.min(sx1, fx - g.between);
        if (sx1 - sx0 <= 0)
          add("error", `${where}: element stały nie zostawia miejsca na front.`);
      }

      c.frontX0 = sx0;
      c.frontX1 = sx1;

      if (kind === "blenda") {
        const bi = rawCol.blendaMode === "inset";
        const bx0 = bi ? c.x0 + g.inset : sx0;
        const bx1 = bi ? c.x1 - g.inset : sx1;
        const by0 = bi ? lv.y0 + g.inset : lo;
        const by1 = bi ? lv.y1 - g.inset : hi;
        const bw = Math.round(bx1 - bx0);
        const bh = Math.round(by1 - by0);
        c.count = 1;
        if (bw <= 0 || bh <= 0) {
          add("error", `${where}: blenda ma wymiar zero lub mniej.`);
        } else {
          blendaParts.push({ h: bh, w: bw });
          doors.push({
            lvl: lv.i,
            key: `b${lv.i}-${j}`,
            type: "blenda",
          colKey: `${lv.i}-${j}`,
            x: bx0,
            y: by0,
            w: bw,
            h: bh,
            iInGroup: 0,
            groupN: 1,
          });
        }
        return;
      }

      if (kind === "doors") {
        const cnt = Math.max(0, Math.round(rawCol.doors ?? 0));
        c.count = cnt;
        if (cnt <= 0) return;
        // luz miedzy drzwiami: wlasny dla kolumny albo globalny
        const colGap = num(rawCol.gapBetween) ?? g.between;
        c.gapBetween = colGap;
        const availW = Math.round(sx1 - sx0 - (cnt - 1) * colGap);
        const wTargets = [];
        for (let i = 0; i < cnt; i++) wTargets.push((rawCol.doorWidths || [])[i]);
        const dws = distribute(availW, wTargets);
        if (dws.diff !== 0)
          add(
            "error",
            `${where}: zadane szerokości drzwi nie wypełniają pasma — różnica ${fmt(Math.abs(dws.diff))} mm.`
          );
        c.doorWs = dws.sizes;
        // gdy dzielimy rowno, a wychodza rozne szerokosci o 1-2 mm — podpowiedz zeby zwiekszyc luz
        const autoCnt = (rawCol.doorWidths || []).filter((v) => num(v) === null).length || cnt;
        if (autoCnt > 1) {
          const uniq = [...new Set(dws.sizes.map((v) => Math.round(v)))];
          if (uniq.length > 1) {
            const spread = Math.max(...uniq) - Math.min(...uniq);
            if (spread <= 2)
              add("info", `${where}: przy równym podziale drzwi różnią się o ${fmt(spread)} mm. Zwiększ luz między drzwiami o ${fmt(spread)} mm, żeby formatki były identyczne.|fixgap:${lv.i}:${j}:${colGap + spread}`);
          }
        }
        c.doorW = dws.sizes[0];
        c.doorH = bandH;
        let dx = sx0;
        for (let i = 0; i < cnt; i++) {
          const dw = dws.sizes[i];
          const d = {
            lvl: lv.i,
            key: `d${lv.i}-${j}-${i}`,
            type: "door",
          colKey: `${lv.i}-${j}`,
            x: dx,
            y: lo,
            w: dw,
            h: bandH,
            iInGroup: i,
            groupN: cnt,
            mirror: !!(rawCol.mirrors || [])[i],
            hinges: num((rawCol.hinges || [])[i]) ?? autoHinges(bandH, dw),
            handle: (rawCol.handles || [])[i] !== false,
            hingeSide:
              cnt === 1
                ? rawCol.hinge === "left" || rawCol.hinge === "right"
                  ? rawCol.hinge
                  : hasFix && rawFix.side === "left"
                  ? "right"
                  : "left"
                : i < cnt / 2
                ? "left"
                : "right",
          };
          doors.push(d);
          c.doors.push(d);
          dx += dw + colGap;
          if (dw <= 0) add("error", `${where}: drzwi ${i + 1} mają szerokość zero lub mniej.`);
          if ((rawCol.mirrors || [])[i] && dw > 1 && bandH > 1)
            mirrorParts.push({ a: bandH - 1, b: dw - 1 });
          if ((rawCol.handles || [])[i] !== false) handleCount += 1;
          const autoH = autoHinges(bandH, dw);
          const ovH = num((rawCol.hinges || [])[i]);
          hingeCount += ovH !== null ? ovH : autoH;
        }
        if (bandH <= 0) add("error", `${where}: wysokość drzwi zero lub mniej.`);

        if (hasFix && fixW > 0) {
          const auto = rawFix.side === "left" ? "right" : "left";
          const hinge =
            rawCol.hinge === "left" || rawCol.hinge === "right" ? rawCol.hinge : auto;
          c.hinge = cnt >= 2 ? "obie" : hinge;
          const sides = cnt >= 2 ? ["left", "right"] : [hinge];
          if (sides.includes(rawFix.side) && !rawFix.support)
            add(
              "warn",
              `${where}: zawias wypada na elemencie stałym, a tam nie ma go w co przykręcić — włącz wspornik pionowy, dodaj przegrodę albo przenieś zawiasy.`
            );
        }
        return;
      }

      /* --- szuflady V-BOX --- */
      const ds = rawCol.drawers && rawCol.drawers.length ? rawCol.drawers : [];
      c.count = ds.length;
      c.drawers = [];
      if (!ds.length) return;

      const LW = c.w;
      const colMaxNL = maxNlFor(sx0, sx1); // ile realnie wchodzi w tej kolumnie
      const colNl = num(rawCol.nl) ?? colMaxNL; // domyslne dla kolumny
      c.nl = colNl;
      if (colNl === null)
        add("error", `${where}: korpus za płytki na najkrótszą szufladę (potrzeba ${250 + 3 + insetExtra} mm).`);
      if (LW > 600)
        add("warn", `${where}: szuflada szersza niż 600 mm — wzmocnij dno kątownikiem (Sevroll 40343).`);

      const drGap = num(rawCol.gapBetween) ?? g.between;
      c.gapBetween = drGap;
      if (ds.length > 1) {
        if (drGap <= 0)
          add("error", `${where}: luz między szufladami ${fmt(drGap)} mm — fronty się stykają, potrzeba minimum 2 mm.`);
        else if (drGap === 1)
          add("warn", `${where}: luz między szufladami tylko 1 mm — zalecane 2 mm, żeby fronty się nie ocierały.`);
      }
      const avail = bandH - (ds.length - 1) * drGap;
      const fr = distribute(avail, ds.map((d) => d.front));
      if (fr.diff !== 0)
        add(
          "error",
          `${where}: wysokości frontów szuflad nie zgadzają się o ${fmt(Math.abs(fr.diff))} mm.`
        );
      // podpowiedz wyrownania, gdy rowny podzial daje rozne fronty o 1-2 mm
      const autoFronts = ds.filter((d) => num(d.front) === null).length;
      if (autoFronts > 1) {
        const uniq = [...new Set(fr.sizes.map((v) => Math.round(v)))];
        const spread = uniq.length > 1 ? Math.max(...uniq) - Math.min(...uniq) : 0;
        if (spread >= 1 && spread <= 2)
          add("info", `${where}: przy równym podziale fronty szuflad różnią się o ${fmt(spread)} mm. Żeby były identyczne, dobierz luz między frontami lub wysokość pasma tak, by dzieliło się równo.`);
      }

      let y = lo;
      ds.forEach((d, i) => {
        const fh = fr.sizes[i];
        // wysokosc boku V-BOX: auto dobiera najwyzszy bok mieszczacy sie w froncie
        let hClass;
        if (d.h === "auto" || d.h == null) {
          const fit = [...VBOX.heights]
            .filter((hc) => VBOX.minFront[cab.frontMode][hc] <= fh)
            .pop();
          hClass = fit || VBOX.heights[0];
        } else {
          hClass = VBOX.heights.includes(Number(d.h)) ? Number(d.h) : 127;
        }
        const nl = num(d.nl) ?? colNl; // NL tej konkretnej szuflady
        if (nl !== null) {
          const need = nl + 3 + insetExtra;
          if (need > carcassDepth)
            add("error", `${where}, szuflada ${i + 1}: NL ${nl} wymaga korpusu ${need} mm, a jest ${fmt(carcassDepth)} mm.`);
          else if (colMaxNL && nl < colMaxNL)
            add("info", `${where}, szuflada ${i + 1}: zmieści się głębsza NL ${colMaxNL}.|fixnl:${lv.i}:${j}:${i}:${colMaxNL}`);
        }
        const dr = {
          i,
          y,
          h: fh,
          x: sx0,
          w: sx1 - sx0,
          hClass,
          nl,
          fixed: num(d.front) !== null,
        };
        c.drawers.push(dr);
        doors.push({
          lvl: lv.i,
          key: `x${lv.i}-${j}-${i}`,
          type: "drawer",
          colKey: `${lv.i}-${j}`,
          x: sx0,
          y,
          w: sx1 - sx0,
          h: fh,
          nl,
          handle: d.handle !== false,
          iInGroup: 0,
          groupN: 1,
        });
        if (d.handle !== false) handleCount += 1;
        if (nl !== null) {
          const kk = `${hClass}|${nl}`;
          slideGroups.set(kk, (slideGroups.get(kk) || 0) + 1);
        }

        const minF = VBOX.minFront[cab.frontMode][hClass];
        if (fh < minF)
          add(
            "error",
            `${where}, szuflada ${i + 1}: front ${fmt(fh)} mm, a minimum dla wysokości ${hClass} mm przy froncie ${
              cab.frontMode === "overlay" ? "na korpusie" : "wpuszczanym"
            } to ${minF} mm.`
          );
        if (fh - hClass > 140)
          add(
            "warn",
            `${where}, szuflada ${i + 1}: front wystaje ${fmt(fh - hClass)} mm ponad bok szuflady — zastosuj reling boczny.`
          );

        if (nl !== null && LW > 0) {
          drawerParts.push({ kind: "front", a: fh, b: sx1 - sx0 });
          drawerParts.push({ kind: "dno", a: LW - 75, b: nl - 24 });
          drawerParts.push({ kind: "tyl", a: LW - 87, b: VBOX.backH[hClass] });
        }
        y += fh + drGap;
      });
    });
  });

  /* --- suma kontrolna: sasiadujace fronty nie moga na siebie wchodzic --- */
  const nameOf = (d) =>
    d.type === "door"
      ? "drzwi"
      : d.type === "drawer"
      ? "front szuflady"
      : d.type === "blenda"
      ? "blenda"
      : "element stały";

  levels.forEach((lv) => {
    const band = doors.filter((d) => d.lvl === lv.i && d.w > 0);
    band.forEach((a2) => {
      // najblizszy front na prawo, ktory pokrywa sie w pionie
      let nb = null;
      band.forEach((b2) => {
        if (b2 === a2 || b2.x < a2.x + a2.w - 0.5) return;
        const vo = Math.min(a2.y + a2.h, b2.y + b2.h) - Math.max(a2.y, b2.y);
        if (vo <= 0) return;
        if (!nb || b2.x < nb.x) nb = b2;
      });
      if (!nb) return;
      const gap = Math.round(nb.x - (a2.x + a2.w));
      if (gap <= 0)
        add(
          "error",
          `Poziom ${lv.i + 1}: między ${nameOf(a2)} a ${nameOf(nb)} jest ${fmt(gap)} mm — fronty się stykają, potrzeba minimum 2 mm luzu.`
        );
      else if (gap === 1)
        add(
          "warn",
          `Poziom ${lv.i + 1}: między ${nameOf(a2)} a ${nameOf(nb)} tylko 1 mm luzu — zalecane 2 mm, żeby fronty się nie ocierały.`
        );
      else if (a2.colKey === nb.colKey && gap > cab.maxGap)
        add(
          "warn",
          `Poziom ${lv.i + 1}: między ${nameOf(a2)} a ${nameOf(nb)} jest ${fmt(gap)} mm szczeliny.`
        );
    });

    // nachodzenie liczone osobno, zeby zlapac tez wieksze zakladki
    band.forEach((a2, i) =>
      band.forEach((b2, k) => {
        if (k <= i) return;
        const ho = Math.min(a2.x + a2.w, b2.x + b2.w) - Math.max(a2.x, b2.x);
        const vo = Math.min(a2.y + a2.h, b2.y + b2.h) - Math.max(a2.y, b2.y);
        if (ho > 0 && vo > 0)
          add(
            "error",
            `Poziom ${lv.i + 1}: ${nameOf(a2)} i ${nameOf(b2)} zachodzą na siebie o ${fmt(ho)} mm.`
          );
      })
    );

    if (band.length && cab.frontMode === "overlay") {
      const minX = Math.min(...band.map((d) => d.x));
      const maxX = Math.max(...band.map((d) => d.x + d.w));
      if (minX < 0 || maxX > W)
        add("error", `Poziom ${lv.i + 1}: fronty wystają poza obrys szafki.`);
    }
  });

  /* --- luzy --- */
  const labels = {
    edge: "od krawędzi korpusu",
    between: "między drzwiami",
    top: "u góry",
    bottom: "u dołu",
    inset: "dookoła drzwi wpuszczanych",
    divOverlay: null,
  };
  Object.entries(g).forEach(([k, v]) => {
    if (!labels[k]) return; // nałożenie na przegrodę ma własną kontrolę
    if (v > cab.maxGap)
      add("warn", `Luz ${labels[k]} to ${fmt(v)} mm — powyżej przyjętego maksimum ${fmt(cab.maxGap)} mm.`);
    if (v < 0) add("error", `Luz ${labels[k]} jest ujemny.`);
  });
  if (doors.length >= 2 && g.between < 2)
    add("warn", "Luz między drzwiami poniżej 2 mm — mogą się blokować przy otwieraniu.");

  if (cab.frontMode === "inset" && doors.length > 0) {
    const need = carcassDepth - (tf + 5);
    if (shelfDepth > need)
      add("warn", `Półka jest głębsza niż ${fmt(need)} mm — drzwi wpuszczane się nie domkną.`);
  }

  /* --- formatki --- */
  let geoCut = null;
  const geoObs = [];
  const panels = [];
  const sameBoard = cab.frontSameAsBoard !== false;
  const sameShelf = cab.shelfSameAsBoard !== false;
  const P = (o) => {
    let key = o.matKey;
    if (sameBoard && key === "front") key = "board";
    if (sameShelf && key === "shelf") key = "board";
    panels.push(key === o.matKey ? o : { ...o, matKey: key });
  };

  // bok: przod zawsze, gora i dol tylko gdy bok tam wychodzi na wierzch
  const noteOf = (e, kind) => {
    const [n1, n2] =
      kind === "side" ? ["górna", "dolna"] : ["lewy koniec", "prawy koniec"];
    const parts = ["krawędź przednia"];
    if (e.b1) parts.push(n1);
    if (e.b2) parts.push(n2);
    return parts.length > 1 ? parts.join(" + ") : parts[0];
  };
  // --- skrocenia bokow i plecow przez narozniki (wyciecie + element na pelna wysokosc) ---
  // zbieramy ile uciac z glebokosci lewego/prawego boku i ile z szerokosci plecow
  const cornerCut = { sideLeftDepth: 0, sideRightDepth: 0, backLeftX: null, backRightX: null };
  // edgeX = krawedz otworu/bryly od strony wnetrza; plecy maja siegac az tam (przykrywajac scianke)
  const registerCorner = (onLeftSide, onBackWall, d, fullH, edgeX) => {
    if (!fullH || !onBackWall) return;
    if (onLeftSide) {
      cornerCut.sideLeftDepth = Math.max(cornerCut.sideLeftDepth, d);
      cornerCut.backLeftX = Math.max(cornerCut.backLeftX ?? 0, edgeX);
    } else {
      cornerCut.sideRightDepth = Math.max(cornerCut.sideRightDepth, d);
      cornerCut.backRightX = Math.min(cornerCut.backRightX ?? W, edgeX);
    }
  };
  {
    const cu = cab.cutout;
    if (cu?.on) {
      const onL = cu.corner === "backLeft" || cu.corner === "frontLeft";
      const onB = cu.corner === "backLeft" || cu.corner === "backRight";
      const cwv = Math.round(cu.w || 0);
      registerCorner(onL, onB, Math.round(cu.d || 0),
        cu.fullHeight !== false || (cab.levels || []).length <= 1,
        onL ? cwv : W - cwv);
    }
    const cornerList = (Array.isArray(cab.obstacles) && cab.obstacles.length
      ? cab.obstacles
      : cab.obstacle?.on ? [cab.obstacle] : []).filter((o) => o && o.on !== false);
    cornerList.forEach((obs) => {
      const atSide = Math.round(obs.fromSide || 0) === 0;
      const atBack = Math.round(obs.fromBack || 0) === 0;
      if (atSide && atBack) {
        const ow = Math.round(obs.w || 0);
        const onL = obs.side === "left";
        registerCorner(onL, true, Math.round(obs.d || 0), obs.fullHeight !== false,
          onL ? ow : W - ow);
      }
    });
  }

  const sideLDepth = carcassDepth - cornerCut.sideLeftDepth;
  const sideRDepth = carcassDepth - cornerCut.sideRightDepth;
  const sideL = {
    name: "Bok lewy", qty: 1, a: leftLen, b: sideLDepth, matKey: "board",
    edges: { a1: true, a2: rear, b1: topL === "between", b2: botL === "between" },
    note: cornerCut.sideLeftDepth > 0 ? `skrócony o ${fmt(cornerCut.sideLeftDepth)} mm przy narożniku` : undefined,
  };
  const sideR = {
    name: "Bok prawy", qty: 1, a: rightLen, b: sideRDepth, matKey: "board",
    edges: { a1: true, a2: rear, b1: topR === "between", b2: botR === "between" },
    note: cornerCut.sideRightDepth > 0 ? `skrócony o ${fmt(cornerCut.sideRightDepth)} mm przy narożniku` : undefined,
  };
  const same = (x, y) =>
    x.a === y.a && x.b === y.b && x.edges.b1 === y.edges.b1 && x.edges.b2 === y.edges.b2;
  if (same(sideL, sideR)) P({ ...sideL, name: "Bok", qty: 2, note: sideL.note || noteOf(sideL.edges, "side") });
  else {
    P({ ...sideL, note: sideL.note || noteOf(sideL.edges, "side") });
    P({ ...sideR, note: sideR.note || noteOf(sideR.edges, "side") });
  }

  const horiz = (name, l, r, x0, x1) => ({
    name, qty: 1, a: x1 - x0, b: carcassDepth, matKey: "board",
    edges: { a1: true, a2: rear, b1: l === "over", b2: r === "over" },
  });
  const wien = horiz("Wieniec", topL, topR, topX0, topX1);
  const dno = horiz("Dno", botL, botR, botX0, botX1);
  if (same(wien, dno)) P({ ...dno, name: "Dno / wieniec", qty: 2, note: noteOf(dno.edges, "horiz") });
  else {
    P({ ...dno, note: noteOf(dno.edges, "horiz") });
    P({ ...wien, note: noteOf(wien.edges, "horiz") });
  }

  if (sepShelves.length)
    P({ name: "Półka przelotowa", qty: sepShelves.length, a: innerW, b: shelfDepth,
        matKey: "board", edges: { a1: true, a2: rear, b1: false, b2: false },
        note: "krawędź przednia" });

  const shelfMat = sameShelf ? "board" : "shelf";
  const divSizes = new Map();
  dividers.forEach((d) => divSizes.set(d.h, (divSizes.get(d.h) || 0) + 1));
  divSizes.forEach((qty, h) =>
    P({ name: "Przegroda pionowa", qty, a: h, b: dividerDepth, matKey: "board",
        edges: { a1: true, a2: rear, b1: false, b2: false },
        note: "krawędź przednia" })
  );

  const shSizes = new Map();
  levels.forEach((lv) =>
    lv.cols.forEach((c) => {
      c.shelves.forEach(() => shSizes.set(c.w, (shSizes.get(c.w) || 0) + 1));
    })
  );
  shSizes.forEach((qty, w) =>
    P({ name: "Półka", qty, a: w, b: shelfDepth, matKey: shelfMat,
        edges: { a1: true, a2: rear, b1: false, b2: false },
        note: "krawędź przednia" })
  );

  const doorSizes = new Map();
  doors.forEach((d) => {
    // tylko wlasciwe drzwi — szuflady, fix i blenda maja osobne formatki
    if (d.type !== "door") return;
    const k = `${Math.round(d.h)}x${Math.round(d.w)}`;
    doorSizes.set(k, (doorSizes.get(k) || 0) + 1);
  });
  doorSizes.forEach((qty, k) => {
    const [dh, dw] = k.split("x").map(Number);
    P({ name: cab.frontMode === "overlay" ? "Drzwi nakładane" : "Drzwi wpuszczane",
        qty, a: dh, b: dw, matKey: "front",
        edges: { a1: true, a2: true, b1: true, b2: true },
        note: "oklejone wszystkie krawędzie" });
  });

  const fixGroups = new Map();
  fixParts.forEach((f) => {
    const k = `${Math.round(f.h)}|${Math.round(f.w)}`;
    fixGroups.set(k, (fixGroups.get(k) || 0) + 1);
  });
  fixGroups.forEach((qty, k) => {
    const [a, b] = k.split("|").map(Number);
    P({
      name: "Element stały (fix)",
      qty,
      a,
      b,
      matKey: "front",
      edges: { a1: true, a2: true, b1: true, b2: true },
      note: "oklejone wszystkie krawędzie",
    });
  });

  const blGroups = new Map();
  blendaParts.forEach((f) => {
    const k = `${Math.round(f.h)}|${Math.round(f.w)}`;
    blGroups.set(k, (blGroups.get(k) || 0) + 1);
  });
  blGroups.forEach((qty, k) => {
    const [a, b] = k.split("|").map(Number);
    P({
      name: "Blenda",
      qty,
      a,
      b,
      matKey: "front",
      edges: { a1: true, a2: true, b1: true, b2: true },
      note: "oklejone wszystkie krawędzie",
    });
  });

  const supGroups = new Map();
  supportParts.forEach((f) => {
    const k = `${Math.round(f.h)}|${Math.round(f.d)}`;
    supGroups.set(k, (supGroups.get(k) || 0) + 1);
  });
  supGroups.forEach((qty, k) => {
    const [a, b] = k.split("|").map(Number);
    P({
      name: "Wspornik pionowy",
      qty,
      a,
      b,
      matKey: "board",
      edges: { a1: false, a2: true, b1: false, b2: false },
      note: "krawędź tylna — przednia chowa się za elementem stałym",
    });
  });

  const dpGroups = new Map();
  drawerParts.forEach((d) => {
    const k = `${d.kind}|${Math.round(d.a)}|${Math.round(d.b)}`;
    dpGroups.set(k, (dpGroups.get(k) || 0) + 1);
  });
  dpGroups.forEach((qty, k) => {
    const [kind, a, b] = k.split("|");
    const meta = {
      front: {
        name: "Front szuflady",
        matKey: "front",
        edges: { a1: true, a2: true, b1: true, b2: true },
        note: "oklejone wszystkie krawędzie",
      },
      dno: {
        name: "Dno szuflady",
        matKey: "board",
        edges: { a1: false, a2: false, b1: false, b2: false },
        note: "bez obrzeża",
      },
      tyl: {
        name: "Tył szuflady",
        matKey: "board",
        edges: { a1: true, a2: false, b1: false, b2: false },
        note: "oklejona krawędź górna",
      },
    }[kind];
    P({ ...meta, qty, a: Number(a), b: Number(b) });
  });

  if (cab.plinth.on) {
    if (plinthH < 50)
      add("warn", `Cokół ma ${fmt(plinthH)} mm — poniżej rozsądnego minimum 50 mm.`);
    P({ name: "Cokół", qty: 1, a: plinthInBody ? innerW : W, b: plinthH, matKey: "board",
        edges: plinthInBody
          ? { a1: false, a2: true, b1: false, b2: false }
          : { a1: false, a2: true, b1: true, b2: true },
        note: plinthInBody ? "krawędź dolna" : "krawędź dolna oraz oba końce" });
  }

  if (cab.rail.on)
    P({ name: "Element wzmacniający", qty: 1, a: innerW, b: cab.rail.height, matKey: "board",
        edges: { a1: false, a2: false, b1: false, b2: false },
        note: "element niewidoczny — bez oklejania" });

  const backOverride = levels.some((lv) =>
    (rawLevels[lv.i].cols || []).some((c) => c.backMode && c.backMode !== "inherit")
  );

  if (backOverride) {
    if (grooved)
      add(
        "warn",
        "Plecy dzielone na kolumny są przybijane od tyłu — frez obowiązuje tylko przy jednym pełnym arkuszu."
      );
    const hh = Math.round(t / 2);
    levels.forEach((lv) => {
      const rc = rawLevels[lv.i].cols || [];
      lv.cols.forEach((c, j) => {
        const mode = rc[j]?.backMode && rc[j].backMode !== "inherit" ? rc[j].backMode : cab.back;
        if (mode === "none") return;
        const x0 = j === 0 ? 1 : c.x0 - hh;
        const x1 = j === lv.cols.length - 1 ? W - 1 : c.x1 + hh;
        const y0 = lv.i === 0 ? 1 : lv.y0 - hh;
        const y1 = lv.i === levels.length - 1 ? H - 1 : lv.y1 + hh;
        P({
          name: mode === "hdf" ? "Plecy HDF" : "Plecy z płyty",
          qty: 1,
          a: Math.round(x1 - x0),
          b: Math.round(y1 - y0),
          matKey: mode === "hdf" ? "back" : "board",
          edges: { a1: false, a2: false, b1: false, b2: false },
          note: `poziom ${lv.i + 1}, kolumna ${j + 1} — przybijane`,
        });
      });
    });
  } else if (cab.back === "hdf" && grooved) {
    const grab = grDep - grPlay; // ile plecow wchodzi w kazdy frez
    const gx0 = Math.max(interior.x0 - grab, cornerCut.backLeftX ?? (interior.x0 - grab));
    const gx1 = Math.min(interior.x1 + grab, cornerCut.backRightX ?? (interior.x1 + grab));
    P({ name: "Plecy HDF we frezie", qty: 1,
        a: gx1 - gx0, b: innerH + 2 * grab, matKey: "back",
        edges: { a1: false, a2: false, b1: false, b2: false },
        note: `wchodzi ${fmt(grab)} mm w każdy frez (${grDep} mm frezu minus ${grPlay} mm luzu)` });
  } else if (cab.back === "hdf") {
    const x0 = (cornerCut.backLeftX ?? 0) + 1;
    const x1 = (cornerCut.backRightX ?? W) - 1;
    const cutInfo = (cornerCut.backLeftX || cornerCut.backRightX) ? ", docięte przy narożniku" : "";
    P({ name: "Plecy HDF", qty: 1, a: x1 - x0, b: H - 2, matKey: "back",
        edges: { a1: false, a2: false, b1: false, b2: false },
        note: "luz 1 mm z każdej strony" + cutInfo });
  }
  else if (cab.back === "board") {
    const backMat = cab.backPos === "outside"
      ? (cab.backBoardMat === "shelf" ? shelfMat : "board")
      : shelfMat; // wewnatrz zawsze z plyty polek (jak ustalono)
    const cutInfo = (cornerCut.backLeftX || cornerCut.backRightX) ? " (docięte przy narożniku)" : "";
    if (backPos === "outside") {
      const x0 = cornerCut.backLeftX ?? 0;
      const x1 = cornerCut.backRightX ?? W;
      P({ name: "Plecy z płyty (na zewnątrz)", qty: 1, a: x1 - x0, b: H, matKey: backMat,
          edges: { a1: false, a2: false, b1: false, b2: false }, note: "na całą tylną płaszczyznę korpusu" + cutInfo });
    } else {
      const x0 = Math.max(interior.x0, cornerCut.backLeftX ?? interior.x0);
      const x1 = Math.min(interior.x1, cornerCut.backRightX ?? interior.x1);
      P({ name: "Plecy z płyty (wewnątrz)", qty: 1, a: x1 - x0, b: innerH, matKey: backMat,
          edges: { a1: false, a2: false, b1: false, b2: false }, note: "między bokami, wieńcem i dnem" + cutInfo });
    }
  }

  panels.forEach((p) => {
    p.a = Math.round(p.a);
    p.b = Math.round(p.b);
    const o = (cab.edgeOverrides || {})[p.name];
    if (o) {
      p.edges = { ...p.edges, ...o };
      p.note = "oklejanie ustawione ręcznie";
    }
    if (p.a <= 0 || p.b <= 0)
      add("error", `Formatka „${p.name}" ma wymiar zero lub ujemny.`);
  });

  /* --- wspolna zabudowa L/U obszaru [bx0..bx1] x [bz0..bz1] na wysokosci [by0..by1] --- */
  // zwraca liczbe scianek dodanych + ostrzezenia; sciana czolowa "over" przed bokami, "between" miedzy
  function buildEnclosure(name, bx0, bx1, bz0, bz1, by0, by1, opts) {
    // swiatlo ponizej progu traktujemy jak dotkniecie sciany — nie ma sensu stawiac tam scianki
    const near = opts.nearSide ?? 50;
    const bndL = opts.boundL ?? interior.x0;
    const bndR = opts.boundR ?? interior.x1;
    const touchLeft = opts.touchLeft ?? bx0 - bndL < near;
    const touchRight = opts.touchRight ?? bndR - bx1 < near;
    const touchBack = bz0 <= 1;
    const touchFront = bz1 >= carcassDepth - 1;
    const bh = by1 - by0;
    const wIn = bx1 - bx0;   // szerokosc obszaru
    const dIn = bz1 - bz0;   // glebokosc obszaru
    // auto: L gdy obszar dotyka boku LUB tyłu (naroznik/przy scianie), U gdy stoi wolno / tylko przy jednej scianie w glab
    const sidesTouch = (touchLeft ? 1 : 0) + (touchRight ? 1 : 0);
    let type = opts.maskType;
    if (type === "auto" || !type) {
      // przy boku (L wystarczy jesli dotyka tez tylu/przodu); w innym razie U
      if ((touchLeft || touchRight) && (touchBack || touchFront)) type = "L";
      else type = "U";
    }
    const front = opts.maskFront === "between" ? "between" : "over";
    const smat = shelfMat;
    let count = 0;
    const addWall = (label, a, b) => {
      P({ name: `${name} — ${label}`, qty: 1, a: bh, b, matKey: smat,
          edges: { a1: true, a2: false, b1: false, b2: false },
          note: "krawędź od strony wnętrza szafki" });
      count += 1;
    };

    if (type === "L") {
      // czolo dochodzi do lica boku, wiec na dalszym koncu odejmujemy jego grubosc
      const farCut = opts.farSideThickness || 0;
      // uklad A: boczna widoczna (dluzsza o t), czolo dobija do niej
      const vA = dIn + t, hA = wIn - farCut;
      // uklad B: czolo widoczne (siega za bok pionowej), boczna dobija
      const vB = dIn, hB = wIn - farCut + t;
      let visible = opts.maskCorner;
      if (visible !== "vertical" && visible !== "horizontal") {
        // auto: wybieramy uklad dajacy rowne (albo najblizsze) plyty
        visible = Math.abs(vB - hB) <= Math.abs(vA - hA) ? "horizontal" : "vertical";
      }
      if (visible === "vertical") {
        addWall("ścianka boczna (wzdłuż głębokości, widoczna)", bh, vA);
        addWall("ścianka czołowa (wzdłuż szerokości)", bh, hA);
      } else {
        addWall("ścianka boczna (wzdłuż głębokości)", bh, vB);
        addWall("ścianka czołowa (wzdłuż szerokości, widoczna)", bh, hB);
      }
      return { count, type, touchBack, touchFront, touchLeft, touchRight, visible };
    } else {
      // U: dwie boczne wzdluz glebokosci + czolowa laczaca od strony wnetrza
      const sideLen = front === "between" ? dIn + t : dIn;
      addWall("ścianka boczna lewa", bh, sideLen);
      addWall("ścianka boczna prawa", bh, sideLen);
      addWall(front === "between" ? "czoło (między bokami)" : "czoło (przed bokami)", bh, front === "between" ? wIn : wIn + 2 * t);
    }
    return { count, type, touchBack, touchFront, touchLeft, touchRight };
  }

  /* --- wyciecie w narozniku + maskownica L --- */
  const cut = cab.cutout || { on: false };
  if (cut.on) {
    const cw = Math.max(0, Math.round(cut.w || 0)); // szerokosc wciecia od boku
    const cdp = Math.max(0, Math.round(cut.d || 0)); // glebokosc wciecia od tylu
    const onLeft = cut.corner === "backLeft" || cut.corner === "frontLeft";
    const onBack = cut.corner === "backLeft" || cut.corner === "backRight";
    if (cw <= 0 || cdp <= 0) add("error", "Wycięcie w narożniku ma zerowy wymiar.");
    if (cw >= W) add("error", "Wycięcie szersze niż szafka.");
    else if (cw <= t)
      add("warn", `Wycięcie ${fmt(cw)} mm nie wychodzi poza grubość boku — sprawdź, czy to celowe.`);
    if (cdp >= carcassDepth) add("error", "Wycięcie głębsze niż korpus.");

    // pionowy zakres: cala szafka albo jeden poziom
    const li = Math.min(Math.max(0, Math.round(cut.levelIndex || 0)), levels.length - 1);
    const zFull = cut.fullHeight !== false || levels.length <= 1;
    const cy0 = zFull ? interior.y0 : levels[li].y0;
    const cy1 = zFull ? interior.y1 : levels[li].y1;
    const cutH = cy1 - cy0;

    // obszar wneki: wspolrzedne x i z (glebokosc od tyłu)
    // szerokosc i glebokosc wyciecia mierzone od ZEWNETRZNEJ krawedzi szafki
    const bx0 = onLeft ? 0 : W - cw;
    const bx1 = onLeft ? cw : W;
    const bz0 = onBack ? 0 : carcassDepth - cdp;
    const bz1 = onBack ? cdp : carcassDepth;

    geoCut = { cw, cdp, onLeft, onBack, cy0, cy1, cutH, bx0, bx1, bz0, bz1, zFull, li, maskType: cut.maskType };

    // detekcja kolizji: polki, przegrody, szuflady wchodzace we wneke
    const inRangeY = (y0, y1) => Math.min(y1, cy1) - Math.max(y0, cy0) > 0;
    const maskX = onLeft ? bx1 : bx0;
    levels.forEach((lv) => {
      if (!zFull && lv.i !== li) return;
      lv.cols.forEach((c) => {
        const colHitsX = onLeft ? c.x0 < maskX : c.x1 > maskX;
        if (!colHitsX) return;
        c.shelves.forEach((sh) => {
          if (inRangeY(sh.y, sh.y + t))
            add("warn", `Poziom ${lv.i + 1}: półka na wysokości ${fmt(sh.y)} mm wchodzi w wycięcie narożnika — przytnij ją na miejscu.`);
        });
        if (c.drawers && c.drawers.length) {
          // wneka od tyłu zabiera glebokosc; szuflada nie miesci sie, gdy jej NL siega wneki
          const maskT = cut.mask !== false ? t : 0; // zabudowa zabiera dodatkowa plyte
          const freeDepth = onBack ? carcassDepth - cdp - maskT : carcassDepth;
          c.drawers.forEach((dr) => {
            const drNl = dr.nl || 0;
            const gap = Math.round(freeDepth - drNl); // luz miedzy tylem szuflady a zabudowa
            if (gap >= 4) return; // w porzadku
            const maxNlFit = [600, 550, 500, 450, 400, 350, 300, 270, 250]
              .find((v) => v + 4 <= freeDepth);
            const act = maxNlFit ? `|fixnl:${lv.i}:${c.j}:${dr.i}:${maxNlFit}` : "";
            const gdzie = `Poziom ${lv.i + 1}, kolumna ${c.j + 1}, szuflada ${dr.i + 1}`;
            if (gap < 0) {
              const advice = maxNlFit
                ? `zejdź z prowadnicą do NL ${maxNlFit}`
                : `przed wycięciem zostaje ${fmt(freeDepth)} mm, a najkrótsza szuflada potrzebuje 254 mm — zabuduj tę kolumnę lub zmniejsz wycięcie`;
              add("error", `${gdzie}: NL ${drNl} nie mieści się przy wycięciu — ${advice}.${act}`);
            } else if (gap === 0) {
              add("error", `${gdzie}: szuflada styka się z zabudową wycięcia — brak luzu, potrzeba minimum 4 mm.${act}`);
            } else {
              add("warn", `${gdzie}: tylko ${fmt(gap)} mm luzu do zabudowy wycięcia — zalecane minimum 4 mm.${act}`);
            }
          });
        }
      });
    });

    // zabudowa
    if (cut.mask !== false) {
      const r = buildEnclosure("Zabudowa wycięcia", bx0, bx1, bz0, bz1, cy0, cy1,
        { maskType: "L", maskFront: cut.maskFront, maskCorner: cut.maskCorner, farSideThickness: t });
      geoCut.maskChosen = r.type;
      geoCut.maskVisible = r.visible;
    } else {
      add("warn", "Wycięcie narożnika nie ma zabudowy — otwór zostanie odsłonięty. Włącz maskownicę, jeśli ma być zakryty.");
    }
  }

  /* --- swobodny element kolizyjny (bryla) --- */
  // lista elementow kolizyjnych (wstecznie: pojedynczy cab.obstacle)
  const obsList = (Array.isArray(cab.obstacles) && cab.obstacles.length
    ? cab.obstacles
    : cab.obstacle?.on ? [cab.obstacle] : []).filter((o) => o && o.on !== false);
  obsList.forEach((ob, obIdx) => {
    const obName = obsList.length > 1 ? `Element ${obIdx + 1}` : "Element kolizyjny";
    const ow = Math.max(0, Math.round(ob.w || 0));
    const od = Math.max(0, Math.round(ob.d || 0));
    const fromSide = Math.round(ob.fromSide ?? ob.fromRight ?? 0); // odsuniecie od wybranego boku
    const fromB = Math.round(ob.fromBack || 0);  // odsuniecie od tylu
    const fromLeft = ob.side === "left";
    // pozycja mierzona od ZEWNETRZNEJ krawedzi szafki — tak samo jak wyciecie narożnika
    let ox0, ox1;
    if (fromLeft) {
      ox0 = fromSide;
      ox1 = ox0 + ow;
    } else {
      ox1 = W - fromSide;
      ox0 = ox1 - ow;
    }
    // odleglosci do zewnetrznych krawedzi szafki
    const distLeft = Math.round(ox0);
    const distRight = Math.round(W - ox1);
    const oz0 = fromB;
    const oz1 = fromB + od;
    const oFull = ob.fullHeight !== false;
    const oy0 = oFull ? interior.y0 : Math.round(ob.fromBottom || 0) + interior.y0;
    const oy1 = oFull ? interior.y1 : oy0 + Math.max(0, Math.round(ob.h || 0));

    if (ow <= 0 || od <= 0) add("error", `${obName} ma zerowy wymiar.`);
    // kontrola: czy bryla miesci sie w obrysie szafki
    if (ox0 < 0)
      add("warn", `${obName} wystaje poza lewą krawędź szafki o ${fmt(-ox0)} mm.`);
    if (ox1 > W)
      add("warn", `${obName} wystaje poza prawą krawędź szafki o ${fmt(ox1 - W)} mm.`);
    // bryla siegajaca w plyte boku wymaga jej przyciecia — informujemy
    if (ox0 < interior.x0 && ox0 >= 0)
      add("info", "Element sięga w płytę lewego boku — bok zostanie skrócony jak przy wycięciu narożnika.");
    if (ox1 > interior.x1 && ox1 <= W)
      add("info", "Element sięga w płytę prawego boku — bok zostanie skrócony jak przy wycięciu narożnika.");
    if (oz1 > carcassDepth)
      add("warn", `${obName} wystaje przed lico korpusu o ${fmt(oz1 - carcassDepth)} mm.`);
    if (!oFull && oy1 > interior.y1)
      add("warn", `${obName} wystaje ponad wnętrze szafki.`);

    // najblizsze ograniczenie z lewej i prawej: przegroda albo bok korpusu
    const boundL = dividers
      .filter((dv) => dv.x + t <= ox0 + 1)
      .reduce((a, dv) => Math.max(a, dv.x + t), interior.x0);
    const boundR = dividers
      .filter((dv) => dv.x >= ox1 - 1)
      .reduce((a, dv) => Math.min(a, dv.x), interior.x1);

    const geoOb = { ox0, ox1, oz0, oz1, oy0, oy1, ow, od, oFull, distLeft, distRight,
      touchLeft: ox0 - boundL < 50, touchRight: boundR - ox1 < 50, boundL, boundR,
      touchBack: oz0 <= 1, touchFront: oz1 >= carcassDepth - 1,
      mask: !!ob.mask, maskFront: ob.maskFront, name: obName, maskTop: null, shelfAbove: null };

    // kolizja z polkami i przegrodami
    const hitY = (y0, y1) => Math.min(y1, oy1) - Math.max(y0, oy0) > 0;
    const hitX = (x0, x1) => Math.min(x1, ox1) - Math.max(x0, ox0) > 0;
    levels.forEach((lv) => {
      lv.cols.forEach((c) => {
        if (!hitX(c.x0, c.x1)) return;
        c.shelves.forEach((sh) => {
          // polka koliduje, jesli bryla siega jej glebokosci od tylu
          if (hitY(sh.y, sh.y + t) && oz0 < backIntrusion + shelfDepth)
            add("warn", `Poziom ${lv.i + 1}: półka na ${fmt(sh.y)} mm koliduje z elementem — przytnij ją lub skróć.`);
        });
        // kolizja z szufladami: sprawdz czy bryla wchodzi w strefe prowadnicy
        if (c.drawers && c.drawers.length) {
          c.drawers.forEach((dr) => {
            const drNl = dr.nl || 0;
            if (!hitY(dr.y, dr.y + dr.h)) return;
            const freeDepth = carcassDepth - oz1 - (ob.mask ? t : 0);
            const gap = Math.round(freeDepth - drNl);
            if (gap >= 4) return;
            const maxNlFit = [600, 550, 500, 450, 400, 350, 300, 270, 250]
              .find((v) => v + 4 <= freeDepth);
            const act = maxNlFit ? `|fixnl:${lv.i}:${c.j}:${dr.i}:${maxNlFit}` : "";
            const gdzie = `Poziom ${lv.i + 1}, kolumna ${c.j + 1}, szuflada ${dr.i + 1}`;
            const co = ob.mask ? "zabudowy elementu" : "elementu";
            if (gap < 0) {
              const advice = maxNlFit
                ? `zejdź z prowadnicą do NL ${maxNlFit}`
                : `przed elementem zostaje ${fmt(freeDepth)} mm — najkrótsza szuflada się nie zmieści, przesuń bryłę`;
              add("error", `${gdzie}: NL ${drNl} sięga ${co} — ${advice}.${act}`);
            } else if (gap === 0) {
              add("error", `${gdzie}: szuflada styka się z ${co} — brak luzu, potrzeba minimum 4 mm.${act}`);
            } else {
              add("warn", `${gdzie}: tylko ${fmt(gap)} mm luzu do ${co} — zalecane minimum 4 mm.${act}`);
            }
          });
        }
      });
    });

    // polka nad elementem — zabudowa moze konczyc sie na niej
    let shelfAbove = null;
    levels.forEach((lv) => {
      lv.cols.forEach((c) => {
        if (Math.min(c.x1, ox1) - Math.max(c.x0, ox0) <= 0) return;
        (c.shelves || []).forEach((sh) => {
          if (sh.y >= oy1 - 1 && (shelfAbove === null || sh.y < shelfAbove)) shelfAbove = sh.y;
        });
      });
    });
    if (shelfAbove !== null && ob.mask && !ob.maskToShelf)
      add("info", `${obName}: nad elementem jest półka na ${fmt(shelfAbove)} mm — zabudowa może kończyć się na niej zamiast biec przez całą wysokość.`);
    // wysokosc zabudowy: do polki, wlasna albo do gory elementu
    const maskTop = ob.mask && ob.maskToShelf && shelfAbove !== null
      ? (num(ob.maskH) !== null ? oy0 + Math.round(ob.maskH) : shelfAbove)
      : oy1;

    // zabudowa bryly
    if (ob.mask) {
      const r = buildEnclosure(`Zabudowa: ${obName}`, ox0, ox1, oz0, oz1, oy0, maskTop,
        { maskType: ob.maskType || "auto", maskFront: ob.maskFront, maskCorner: ob.maskCorner,
          boundL, boundR, touchLeft: geoOb.touchLeft, touchRight: geoOb.touchRight,
          farSideThickness: (ox0 <= interior.x0 + 1 || ox1 >= interior.x1 - 1) ? t : 0 });
      geoOb.maskChosen = r.type;
      geoOb.maskVisible = r.visible;
      geoOb.maskTop = maskTop;
    } else if (ow > 0 && od > 0) {
      add("warn", `${obName} nie ma zabudowy — nie jest zakryty ani odgrodzony od wnętrza. Włącz zabudowę, jeśli ma być schowany.`);
    }
    geoOb.shelfAbove = shelfAbove;
    geoObs.push(geoOb);
  });
  const geoOb = geoObs[0] || null;

  /* --- produkty do zamowienia --- */
  const hardware = [];
  slideGroups.forEach((qty, k) => {
    const [h, nl] = k.split("|");
    hardware.push({
      name: `Prowadnica Sevroll V-BOX 3D Slim ${h} mm`,
      spec: `NL ${nl} mm`,
      qty,
      unit: "kpl.",
    });
  });
  const miGroups = new Map();
  mirrorParts.forEach((f) => {
    const k = `${Math.round(f.a)}|${Math.round(f.b)}`;
    miGroups.set(k, (miGroups.get(k) || 0) + 1);
  });
  miGroups.forEach((qty, k) => {
    const [a2, b2] = k.split("|").map(Number);
    hardware.push({
      name: "Lustro na drzwiach",
      spec: `${fmt(b2)} × ${fmt(a2)} mm — luz 0,5 mm na każdą stronę drzwi`,
      qty,
      unit: "szt.",
    });
  });

  if (handleCount)
    hardware.push({
      name: cab.handleName || "Uchwyt",
      spec: "na fronty z zaznaczonym uchwytem",
      qty: handleCount,
      unit: "szt.",
    });
  if (hingeCount)
    hardware.push({
      name: "Zawias",
      spec:
        (cab.frontMode === "overlay" ? "nakładany" : "wpuszczany") +
        ", 2 szt. na skrzydło poza szerokimi i wysokimi",
      qty: hingeCount,
      unit: "szt.",
    });
  if (cab.legs && cab.legs.on)
    hardware.push({
      name: "Nóżka regulowana",
      spec: `wysokość ${fmt(cab.legs.height || 100)} mm`,
      qty: 4,
      unit: "szt.",
    });

  return {
    hardware,
    t, tf, tb, carcassDepth, hasBack, interior, innerW, innerH,
    shelfDepth, dividerDepth, backIntrusion, frontCut, levels, sepShelves, dividers, doors, panels, msgs, maxNL,
    plinthInBody, plinthH, bottomY, pMode, grooved, grOff, grDep, grPlay, geoCut, geoOb, geoObs,
    backPos, backIsBoard, cornerCut,
    topL, topR, botL, botR, leftLen, rightLen, leftY0, rightY0,
    topX0, topX1, botX0, botX1, divOv,
  };
}

/* ---------- rysunki ---------- */

const DimH = ({ x1, x2, y, label, c = DIMC, above = true }) => (
  <g>
    <line x1={x1} y1={y} x2={x2} y2={y} stroke={c} strokeWidth="1.5" />
    <line x1={x1} y1={y - 8} x2={x1} y2={y + 8} stroke={c} strokeWidth="1.5" />
    <line x1={x2} y1={y - 8} x2={x2} y2={y + 8} stroke={c} strokeWidth="1.5" />
    <text x={(x1 + x2) / 2} y={above ? y - 8 : y + 22} textAnchor="middle"
      fontSize="22" fill={c} fontFamily="ui-monospace, monospace">{label}</text>
  </g>
);

const DimV = ({ y1, y2, x, label, c = DIMC, left = true }) => (
  <g>
    <line x1={x} y1={y1} x2={x} y2={y2} stroke={c} strokeWidth="1.5" />
    <line x1={x - 8} y1={y1} x2={x + 8} y2={y1} stroke={c} strokeWidth="1.5" />
    <line x1={x - 8} y1={y2} x2={x + 8} y2={y2} stroke={c} strokeWidth="1.5" />
    <text x={left ? x - 8 : x + 8} y={(y1 + y2) / 2 + 7}
      textAnchor={left ? "end" : "start"} fontSize="22" fill={c}
      fontFamily="ui-monospace, monospace">{label}</text>
  </g>
);

function FrontView({ cab, geo, mat, open, showDims, showGaps, showLabels }) {
  // tryb wizualizacji: gdy fronty z tej samej plyty, pokaz realny kolor korpusu
  const frontColor = cab.realColors && cab.frontSameAsBoard !== false
    ? mat.board.color : mat.front.color;
  const { W, H } = cab;
  const pad = 160;
  const belowExtra = Math.max(cab.legs?.on ? cab.legs.height || 100 : 0, geo.plinthH || 0) + 60;
  const leftExtra = cab.legs?.on || cab.plinth.on ? 80 : 0;
  const rightExtraF = cab.legs?.on || cab.plinth.on ? 320 : 0;
  const vb = `${-pad - leftExtra} ${-pad} ${W + 2 * pad + leftExtra + rightExtraF} ${H + pad + belowExtra + 60}`;
  const fy = (y) => H - y;
  const bf = mat.board.color;
  const ff = frontColor;
  const t = geo.t;

  return (
    <svg viewBox={vb} className="w-full h-auto" style={{ maxHeight: 540 }}>
      <rect x="0" y="0" width={W} height={H} fill="#fafaf9" stroke={LINE} strokeWidth="1.5" />

      {/* boki */}
      <rect x="0" y={fy(geo.leftY0 + geo.leftLen)} width={t} height={geo.leftLen}
        fill={bf} stroke={INK} strokeWidth="2" />
      <rect x={W - t} y={fy(geo.rightY0 + geo.rightLen)} width={t} height={geo.rightLen}
        fill={bf} stroke={INK} strokeWidth="2" />
      {/* wieniec */}
      <rect x={geo.topX0} y="0" width={geo.topX1 - geo.topX0} height={t}
        fill={bf} stroke={INK} strokeWidth="2" />
      {/* dno */}
      <rect x={geo.botX0} y={fy(geo.bottomY + t)} width={geo.botX1 - geo.botX0} height={t}
        fill={bf} stroke={INK} strokeWidth="2" />

      {geo.plinthInBody && (
        <rect x={geo.interior.x0} y={fy(geo.plinthH)} width={geo.innerW} height={geo.plinthH}
          fill={bf} stroke={INK} strokeWidth="2" />
      )}
      {cab.plinth.on && !geo.plinthInBody && (
        <rect x="0" y={H} width={W} height={geo.plinthH} fill={bf} stroke={INK} strokeWidth="2" opacity="0.75" />
      )}
      {cab.legs?.on && (
        <>
          <rect x={40} y={H} width={40} height={cab.legs.height || 100}
            fill="#3f3f46" stroke={INK} strokeWidth="2" />
          <rect x={W - 80} y={H} width={40} height={cab.legs.height || 100}
            fill="#3f3f46" stroke={INK} strokeWidth="2" />
        </>
      )}

      {cab.rail.on && (
        <rect x={geo.interior.x0}
          y={cab.rail.pos === "top" ? fy(geo.interior.y1) : fy(geo.interior.y0 + cab.rail.height)}
          width={geo.innerW} height={cab.rail.height} fill={bf} stroke={INK} strokeWidth="2" opacity="0.85" />
      )}

      {/* polki przelotowe */}
      {geo.sepShelves.map((s, i) => (
        <rect key={"sep" + i} x={geo.interior.x0} y={fy(s.y + t)} width={geo.innerW} height={t}
          fill={bf} stroke={INK} strokeWidth="2" />
      ))}

      {/* przegrody */}
      {geo.dividers.map((d, i) => (
        <rect key={"div" + i} x={d.x} y={fy(d.y1)} width={t} height={d.h}
          fill={bf} stroke={INK} strokeWidth="2" />
      ))}

      {/* polki w kolumnach */}
      {geo.levels.map((lv) =>
        lv.cols.map((c) =>
          c.shelves.map((s, k) => (
            <rect key={`s${lv.i}-${c.j}-${k}`} x={c.x0} y={fy(s.y + t)} width={c.w} height={t}
              fill={bf} stroke={INK} strokeWidth="2" />
          ))
        )
      )}

      {/* wsporniki pionowe za elementem stalym */}
      {geo.levels.flatMap((lv) =>
        lv.cols
          .filter((c) => c.support && c.fix)
          .map((c) => (
            <rect key={`sup${lv.i}-${c.j}`}
              x={c.fix.side === "left" ? c.fix.x + c.fix.w - t : c.fix.x}
              y={fy(lv.y1)} width={t} height={lv.h}
              fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="8 6" />
          ))
      )}

      {/* drzwi */}
      {geo.doors.map((d) =>
        d.type === "fix" || d.type === "blenda" ? (
          <g key={d.key}>
            <rect x={d.x} y={fy(d.y + d.h)} width={d.w} height={d.h}
              fill={ff} stroke={INK} strokeWidth="2.5" />
            {d.type === "fix" && (
              <>
                <line x1={d.x} y1={fy(d.y + d.h)} x2={d.x + d.w} y2={fy(d.y)}
                  stroke={INK} strokeWidth="1.5" opacity="0.4" />
                <line x1={d.x} y1={fy(d.y)} x2={d.x + d.w} y2={fy(d.y + d.h)}
                  stroke={INK} strokeWidth="1.5" opacity="0.4" />
              </>
            )}
            {d.type === "blenda" && (
              <text x={d.x + d.w / 2} y={fy(d.y + d.h / 2) - 20} textAnchor="middle"
                fontSize="20" fill={INK} opacity="0.55" fontFamily="ui-monospace, monospace">
                blenda
              </text>
            )}
            {showDims && d.w > 90 && d.h > 40 && (
              <text x={d.x + d.w / 2} y={fy(d.y + d.h / 2) + 7} textAnchor="middle"
                fontSize="20" fill={INK} opacity="0.75" fontFamily="ui-monospace, monospace">
                {fmt(d.w)}×{fmt(d.h)}
              </text>
            )}
          </g>
        ) : open ? (
          <g key={d.key}>
            {d.type === "drawer" ? (
              <>
                {/* front szuflady zostaje na miejscu, tylko przygaszony */}
                <rect x={d.x} y={fy(d.y + d.h)} width={d.w} height={d.h}
                  fill={ff} fillOpacity="0.35" stroke={INK} strokeWidth="2" />
                <line x1={d.x + d.w * 0.25} x2={d.x + d.w * 0.75}
                  y1={fy(d.y + d.h - Math.min(50, d.h / 2))}
                  y2={fy(d.y + d.h - Math.min(50, d.h / 2))}
                  stroke={INK} strokeWidth="5" opacity="0.5" />
                <text x={d.x + d.w / 2} y={fy(d.y + d.h * 0.42)} textAnchor="middle"
                  fontSize="19" fill={INK} opacity="0.8" fontFamily="ui-monospace, monospace">
                  szuflada
                </text>
              </>
            ) : (
              <>
                {/* obrys skrzydla po zamknieciu */}
                <rect x={d.x} y={fy(d.y + d.h)} width={d.w} height={d.h}
                  fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="12 9" opacity="0.6" />
                {/* symbol otwierania: wierzcholek po stronie zawiasu */}
                <path
                  d={`M ${d.hingeSide === "left" ? d.x + d.w : d.x} ${fy(d.y + d.h)}
                      L ${d.hingeSide === "left" ? d.x : d.x + d.w} ${fy(d.y + d.h / 2)}
                      L ${d.hingeSide === "left" ? d.x + d.w : d.x} ${fy(d.y)}`}
                  fill="none" stroke={INK} strokeWidth="1.8" opacity="0.5" />
                {/* skrzydlo otwarte widziane od czola */}
                <rect x={d.hingeSide === "right" ? d.x + d.w - geo.tf : d.x}
                  y={fy(d.y + d.h)} width={geo.tf} height={d.h}
                  fill={ff} stroke={INK} strokeWidth="2" />
              </>
            )}
          </g>
        ) : (
          <g key={d.key}>
            <rect x={d.x} y={fy(d.y + d.h)} width={d.w} height={d.h}
              fill={ff} stroke={INK} strokeWidth="2.5" />
            {d.type === "drawer" && !d.handle && (
              <line x1={d.x + d.w * 0.3} x2={d.x + d.w * 0.7}
                y1={fy(d.y + d.h * 0.78)} y2={fy(d.y + d.h * 0.78)}
                stroke={INK} strokeWidth="4" opacity="0.45" />
            )}
            {d.handle && d.w > 60 && d.h > 30 && (
              <rect
                x={d.type === "drawer" ? d.x + d.w / 2 - 60 : d.hingeSide === "left" ? d.x + d.w - 45 : d.x + 30}
                y={d.type === "drawer"
                  ? fy(d.y + d.h - Math.min(50, d.h / 2)) - 5
                  : fy(d.y + d.h * 0.5) - 60}
                width={d.type === "drawer" ? 120 : 15}
                height={d.type === "drawer" ? 10 : 120}
                rx="5" fill="#52525b" opacity="0.9" />
            )}
            {d.mirror && d.w > 2 && d.h > 2 && (
              <rect x={d.x + 0.5} y={fy(d.y + d.h) + 0.5} width={d.w - 1} height={d.h - 1}
                fill={mat.mirror.color} stroke={INK} strokeWidth="1" opacity="0.85" />
            )}
            {showDims && d.w > 90 && d.h > 40 && (
              <text x={d.x + d.w / 2}
                y={d.type === "drawer" ? fy(d.y + d.h * 0.3) : fy(d.y + d.h / 2) + 7}
                textAnchor="middle" fontSize="20" fill={INK} opacity="0.75"
                fontFamily="ui-monospace, monospace">
                {fmt(d.w)}×{fmt(d.h)}
              </text>
            )}
          </g>
        )
      )}

      {/* szczeliny — realne 2 mm bylyby niewidoczne, wiec zaznaczamy je znacznikiem */}
      {showGaps && !open &&
        geo.levels.flatMap((lv) => {
          const band = geo.doors
            .filter((d) => d.lvl === lv.i && d.w > 0)
            .sort((a, b) => a.x - b.x);
          const out = [];
          // pionowa szczelina (miedzy frontami, gora, dol) — kropka na krawedzi, etykieta wyprowadzona krotka kreska
          const marker = (key, xMid, yTop, val, up) => {
            const col = val < 2 ? ERRC : ACC;
            const dir = up ? -1 : 1;
            out.push(
              <g key={key}>
                <circle cx={xMid} cy={fy(yTop)} r="6" fill={col} />
                <line x1={xMid} y1={fy(yTop)} x2={xMid} y2={fy(yTop) + dir * 26}
                  stroke={col} strokeWidth="1.5" strokeDasharray="3 3" />
                <text x={xMid} y={fy(yTop) + dir * 34 + (up ? 0 : 14)} textAnchor="middle"
                  fontSize="20" fill={col} fontFamily="ui-monospace, monospace">
                  {fmt(val)}
                </text>
              </g>
            );
          };
          // boczna szczelina (lewy/prawy bok korpusu) — etykieta wyprowadzona poza obrys
          const sideMarker = (key, xMid, yMid, val, toLeft) => {
            const col = val < 2 ? ERRC : ACC;
            const lx = toLeft ? xMid - 34 : xMid + 34;
            out.push(
              <g key={key}>
                <circle cx={xMid} cy={fy(yMid)} r="6" fill={col} />
                <line x1={xMid} y1={fy(yMid)} x2={lx} y2={fy(yMid)}
                  stroke={col} strokeWidth="1.5" strokeDasharray="3 3" />
                <text x={lx} y={fy(yMid) + 7} textAnchor={toLeft ? "end" : "start"}
                  fontSize="20" fill={col} fontFamily="ui-monospace, monospace">
                  {fmt(val)}
                </text>
              </g>
            );
          };

          // dla kazdego pasma pionowego (kolumny) bierzemy skrajne fronty
          const colTop = {}; // najwyzszy front w kolumnie
          const colBot = {}; // najnizszy front w kolumnie
          band.forEach((d) => {
            const k = d.colKey;
            if (!colTop[k] || d.y + d.h > colTop[k].y + colTop[k].h) colTop[k] = d;
            if (!colBot[k] || d.y < colBot[k].y) colBot[k] = d;
          });

          band.forEach((d, i) => {
            const yTop = d.y + d.h;
            const yMid = d.y + d.h / 2;

            // czy po lewej stronie jest jakis front pokrywajacy sie w pionie
            let leftNb = null;
            band.forEach((b2) => {
              if (b2 === d || b2.x + b2.w > d.x + 0.5) return;
              const vo = Math.min(d.y + d.h, b2.y + b2.h) - Math.max(d.y, b2.y);
              if (vo <= 0) return;
              if (!leftNb || b2.x + b2.w > leftNb.x + leftNb.w) leftNb = b2;
            });
            // luz z lewej rysujemy tylko gdy nie ma sasiada (bok/przegroda) — sasiad da luz z prawej
            if (!leftNb) {
              const wall = cab.frontMode === "overlay" ? 0 : geo.interior.x0;
              sideMarker(`gl${d.key}`, (wall + d.x) / 2, yMid, Math.round(d.x - wall), true);
            }

            // luz z prawej: do najblizszego sasiada w pionie albo do sciany
            let nb = null;
            band.forEach((b2) => {
              if (b2 === d || b2.x < d.x + d.w - 0.5) return;
              const vo = Math.min(d.y + d.h, b2.y + b2.h) - Math.max(d.y, b2.y);
              if (vo <= 0) return;
              if (!nb || b2.x < nb.x) nb = b2;
            });
            if (nb) {
              const val = Math.round(nb.x - (d.x + d.w));
              // kropka na styku frontow u gory, kreska i opis wyprowadzone nad krawedz
              marker(`gm${d.key}`, (d.x + d.w + nb.x) / 2, Math.max(yTop, nb.y + nb.h), val, true);
            } else {
              const wall = cab.frontMode === "overlay" ? W : geo.interior.x1;
              sideMarker(`gr${d.key}`, (d.x + d.w + wall) / 2, yMid, Math.round(wall - (d.x + d.w)), false);
            }
            // luz gorny liczymy tylko dla najwyzszego frontu kolumny, dolny dla najnizszego
            const topRef = cab.frontMode === "overlay" ? H : geo.interior.y1;
            const botRef = cab.frontMode === "overlay" ? geo.bottomY : geo.interior.y0;
            if (colTop[d.colKey] === d)
              marker(`gt${d.key}`, d.x + d.w / 2, topRef, Math.round(topRef - (d.y + d.h)), true);
            if (colBot[d.colKey] === d)
              marker(`gb${d.key}`, d.x + d.w / 2, d.y, Math.round(d.y - botRef), false);

            // luz pionowy do frontu bezposrednio nad tym w tej samej kolumnie
            let above = null;
            band.forEach((b2) => {
              if (b2.colKey !== d.colKey || b2.y < d.y + d.h - 0.5) return;
              if (!above || b2.y < above.y) above = b2;
            });
            if (above) {
              const val = Math.round(above.y - (d.y + d.h));
              const col = val < 2 ? ERRC : ACC;
              // kropka na styku, kreska wyprowadzona az za prawa krawedz frontu
              const cxm = d.x + d.w / 2;
              const yv = fy(d.y + d.h);
              const lx = d.x + d.w + 30;
              out.push(
                <g key={`gv${d.key}`}>
                  <circle cx={cxm} cy={yv} r="6" fill={col} />
                  <line x1={cxm} y1={yv} x2={lx} y2={yv}
                    stroke={col} strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x={lx + 6} y={yv + 7} textAnchor="start" fontSize="20"
                    fill={col} fontFamily="ui-monospace, monospace">
                    {fmt(val)}
                  </text>
                </g>
              );
            }
          });
          return out;
        })}

      {showDims && (
        <>
          <DimH x1={0} x2={W} y={-50} label={`${fmt(W)}`} />
          <DimV y1={0} y2={H} x={-50} label={`${fmt(H)}`} />
          {(cab.legs?.on || cab.plinth.on) && (() => {
            const legH = cab.legs?.on ? cab.legs.height || 100 : 0;
            const plH = cab.plinth.on && !geo.plinthInBody ? geo.plinthH : 0;
            // nozki i cokol pod korpusem nie stoja na sobie — cokol jest zabudowa miedzy nozkami
            const extra = Math.max(plH, legH);
            if (extra <= 0) return null;
            return (
              <>
                {/* calkowita wysokosc z podstawa po lewej */}
                <DimV y1={0} y2={H + extra} x={-115} label={`${fmt(H + extra)}`} c={LINE} />
                {/* cokol: mierzony przy prawej krawedzi korpusu (cokol jest szerokosci szafki) */}
                {plH > 0 && (
                  <DimV y1={H} y2={H + plH} x={W + 70} label={`cokół ${fmt(plH)}`}
                    left={false} c={LINE} />
                )}
                {/* nozki: mierzone znacznie dalej w prawo, zeby opis sie nie nakladal */}
                {legH > 0 && (
                  <DimV y1={H} y2={H + legH} x={W + 200} label={`nóżki ${fmt(legH)}`}
                    left={false} c={LINE} />
                )}
              </>
            );
          })()}
          {geo.levels.map((lv) => (
            <DimV key={"lv" + lv.i} y1={fy(lv.y1)} y2={fy(lv.y0)} x={W + 60}
              label={`${fmt(lv.h)}`} left={false} c={lv.h < 60 ? WARNC : DIMC} />
          ))}
          {/* wysokosci frontow szuflad przy prawej krawedzi */}
          {!open &&
            geo.doors
              .filter((d) => d.type === "drawer")
              .map((d) => (
                <DimV key={"dr" + d.key} y1={fy(d.y + d.h)} y2={fy(d.y)} x={W + 120}
                  label={`${fmt(d.h)}`} left={false} c={DIMC} />
              ))}
          {open &&
            geo.levels[0] &&
            geo.levels[0].cols.length > 1 &&
            geo.levels[0].cols.map((c) => (
              <DimH key={"c" + c.j} x1={c.x0} x2={c.x1} y={H + geo.plinthH + 90}
                label={`${fmt(c.w)}`} above={false} c={c.w < MIN_COL ? WARNC : DIMC} />
            ))}
          {/* szerokosci wszystkich frontow dolnego rzedu */}
          {!open &&
            (() => {
              const bottomLvl = geo.levels[0];
              if (!bottomLvl) return null;
              const seen = new Set();
              const yLine = H + geo.plinthH + 90;
              return geo.doors
                .filter((d) => d.lvl === 0 && d.w > 0)
                .filter((d) => {
                  const key = Math.round(d.x);
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                })
                .map((d) => (
                  <DimH key={"fw" + d.key} x1={d.x} x2={d.x + d.w} y={yLine}
                    label={`${fmt(d.w)}`} above={false} c={DIMC} />
                ));
            })()}
        </>
      )}

      {/* swiatla miedzy polkami — w widoku otwartym */}
      {open && showDims &&
        geo.levels.flatMap((lv) =>
          lv.cols.flatMap((c) =>
            (c.openings || [])
              .filter((op) => op.h > 30)
              .map((op) => (
                <text key={`op${lv.i}-${c.j}-${op.k}`}
                  x={(c.x0 + c.x1) / 2} y={fy((op.from + op.to) / 2) + 8}
                  textAnchor="middle" fontSize="22" fill={DIMC}
                  fontFamily="ui-monospace, monospace">
                  {fmt(op.h)}
                </text>
              ))
          )
        )}

      {showLabels &&
        geo.levels.flatMap((lv) =>
          lv.cols.map((c) => {
            const cx = (c.x0 + c.x1) / 2;
            const cy = fy(lv.y1) + 34; // tuz pod gorna krawedzia pola
            return (
              <text key={`lbl${lv.i}-${c.j}`} x={cx} y={cy + 20}
                textAnchor="middle" fontSize="64" fontWeight="800"
                fill={INK} stroke="#ffffff" strokeWidth="8" paintOrder="stroke"
                fontFamily="ui-monospace, monospace"
                style={{ pointerEvents: "none" }}>
                Poz.{lv.i + 1}K{c.j + 1}
              </text>
            );
          })
        )}
    </svg>
  );
}

function RearView({ cab, geo, mat, showDims }) {
  const { W, H } = cab;
  const pad = 170;
  const rBelow = Math.max(
    cab.legs?.on ? cab.legs.height || 100 : 0,
    cab.plinth.on && !geo.plinthInBody ? geo.plinthH : 0
  );
  const vb = `${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad + 40 + rBelow}`;
  const fy = (y) => H - y;
  const mx = (x, w) => W - x - w; // patrzymy od tylu, wiec lustro w poziomie
  const bf = mat.board.color;
  const t = geo.t;

  const grab = geo.grooved ? geo.grDep - geo.grPlay : 0;
  let bx, by, bw, bh, label;
  if (cab.back === "none") {
    bx = by = bw = bh = 0;
    label = "brak pleców";
  } else if (cab.back === "board") {
    if (geo.backPos === "outside") {
      bx = 0; by = 0; bw = W; bh = H;
      label = "plecy z płyty na zewnątrz — cała tylna płaszczyzna";
    } else {
      bx = geo.interior.x0; by = geo.interior.y0;
      bw = geo.innerW; bh = geo.innerH;
      label = "plecy z płyty wewnątrz — między bokami";
    }
  } else if (geo.grooved) {
    bx = geo.interior.x0 - grab;
    by = geo.interior.y0 - grab;
    bw = geo.innerW + 2 * grab;
    bh = geo.innerH + 2 * grab;
    label = `HDF we frezie, wchodzi ${fmt(grab)} mm w każdy frez`;
  } else {
    bx = 1; by = 1; bw = W - 2; bh = H - 2;
    label = "HDF przybijane, luz 1 mm z każdej strony";
  }
  // przyciecie plecow do granic narożnika
  {
    const limL = geo.cornerCut?.backLeftX;
    const limR = geo.cornerCut?.backRightX;
    if ((limL != null || limR != null) && bw > 0) {
      const x0 = Math.max(bx, limL ?? bx);
      const x1 = Math.min(bx + bw, limR ?? bx + bw);
      bx = x0;
      bw = Math.max(0, x1 - x0);
      label += ", docięte przy narożniku";
    }
  }

  return (
    <svg viewBox={vb} className="w-full h-auto" style={{ maxHeight: 540 }}>
      {/* korpus widziany od tylu */}
      <rect x="0" y="0" width={W} height={H} fill="#fafaf9" stroke={LINE} strokeWidth="1.5" />
      {/* boki — widok od tylu, wiec lewy bok po prawej */}
      <rect x={W - t} y={fy(geo.leftY0 + geo.leftLen)} width={t} height={geo.leftLen}
        fill={bf} stroke={INK} strokeWidth="2" />
      <rect x="0" y={fy(geo.rightY0 + geo.rightLen)} width={t} height={geo.rightLen}
        fill={bf} stroke={INK} strokeWidth="2" />
      {/* wieniec */}
      <rect x={W - geo.topX1} y="0" width={geo.topX1 - geo.topX0} height={t}
        fill={bf} stroke={INK} strokeWidth="2" />
      {/* dno */}
      <rect x={W - geo.botX1} y={fy(geo.bottomY + t)} width={geo.botX1 - geo.botX0} height={t}
        fill={bf} stroke={INK} strokeWidth="2" />

      {/* polki i przegrody widoczne pod pleckami */}
      {geo.sepShelves.map((sh, i) => (
        <rect key={"s" + i} x={geo.interior.x0} y={fy(sh.y + t)} width={geo.innerW} height={t}
          fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="8 6" />
      ))}
      {geo.dividers.map((d, i) => (
        <rect key={"d" + i} x={mx(d.x, t)} y={fy(d.y1)} width={t} height={d.h}
          fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="8 6" />
      ))}
      {geo.levels.map((lv) =>
        lv.cols.map((c) =>
          c.shelves.map((sh, k) => (
            <rect key={`p${lv.i}-${c.j}-${k}`} x={mx(c.x0, c.w)} y={fy(sh.y + t)}
              width={c.w} height={t} fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="8 6" />
          ))
        )
      )}

      {/* plecy */}
      {cab.back !== "none" && (
        <rect x={mx(bx, bw)} y={fy(by + bh)} width={bw} height={bh}
          fill={geo.backIsBoard
            ? (cab.backPos === "outside" && cab.backBoardMat !== "shelf" ? mat.board.color : (mat.shelf?.color || mat.board.color))
            : mat.back.color}
          stroke={INK} strokeWidth="2.5" opacity={geo.backIsBoard ? 0.95 : 0.72} />
      )}

      {/* wyciecie w narozniku — widziane od tylu */}
      {geo.geoCut && (() => {
        const gc = geo.geoCut;
        // od tylu obraz jest lustrzany: mx(x, w)
        const xw = mx(gc.bx0, gc.bx1 - gc.bx0);
        // scianka pionowa stoi na zewnatrz otworu, po stronie wnetrza
        const wallX = gc.onLeft ? gc.bx1 : gc.bx0 - t;
        return (
          <>
            <rect x={xw} y={fy(gc.cy1)} width={gc.bx1 - gc.bx0} height={gc.cutH}
              fill={ERRC} opacity="0.14" stroke={ERRC} strokeWidth="1.5" strokeDasharray="6 4" />
            <rect x={mx(wallX, t)} y={fy(gc.cy1)} width={t} height={gc.cutH}
              fill={mat.shelf?.color || bf} stroke={INK} strokeWidth="2" opacity="0.9" />
            <text x={xw + (gc.bx1 - gc.bx0) / 2} y={fy((gc.cy0 + gc.cy1) / 2)} textAnchor="middle"
              fontSize="18" fill={ERRC} fontFamily="ui-monospace, monospace">
              wycięcie {fmt(gc.cw)}×{fmt(gc.cdp)}
            </text>
          </>
        );
      })()}

      {/* cokol pod korpusem / nozki */}
      {cab.plinth.on && !geo.plinthInBody && (
        <rect x="0" y={H} width={W} height={geo.plinthH}
          fill={bf} stroke={INK} strokeWidth="2" opacity="0.75" />
      )}
      {cab.legs?.on && (
        <>
          <rect x={40} y={H} width={40} height={cab.legs.height || 100}
            fill="#3f3f46" stroke={INK} strokeWidth="2" />
          <rect x={W - 80} y={H} width={40} height={cab.legs.height || 100}
            fill="#3f3f46" stroke={INK} strokeWidth="2" />
        </>
      )}

      {showDims && cab.back !== "none" && (
        <>
          <DimH x1={mx(bx, bw)} x2={mx(bx, bw) + bw} y={-55} label={`${fmt(bw)}`} />
          <DimV y1={fy(by + bh)} y2={fy(by)} x={-55} label={`${fmt(bh)}`} />
          {geo.grooved && (
            <DimH x1={mx(bx, bw)} x2={mx(bx, bw) + grab} y={H + 60}
              label={`frez ${fmt(grab)}`} above={false} c={WARNC} />
          )}
        </>
      )}
      <text x={W / 2} y={H + 120 + rBelow} textAnchor="middle" fontSize="22" fill={LINE}
        fontFamily="ui-monospace, monospace">{label}</text>
      <text x={W / 2} y={H + 150 + rBelow} textAnchor="middle" fontSize="20" fill={LINE}
        fontFamily="ui-monospace, monospace">widok od tyłu — lewy bok szafki po prawej</text>
    </svg>
  );
}

function TopView({ cab, geo, mat, showDims, showShelves }) {
  const { W, D } = cab;
  const pad = 160;
  // patrzymy z gory: X = szerokosc, Y (w dol na ekranie) = glebokosc, przod u dolu
  const frontExtra = cab.frontMode === "overlay" ? geo.tf : 0;
  const vb = `${-pad} ${-pad} ${W + 2 * pad + 120} ${D + 2 * pad + 100 + frontExtra}`;
  const bf = mat.board.color;
  const t = geo.t;
  const cd = geo.carcassDepth;

  return (
    <svg viewBox={vb} className="w-full h-auto" style={{ maxHeight: 540 }}>
      {/* obrys korpusu z gory */}
      <rect x="0" y="0" width={W} height={cd} fill="#fafaf9" stroke={LINE} strokeWidth="1.5" />
      {/* boki — skrocone przy narozniku z wycieciem/elementem */}
      <rect x="0" y={geo.cornerCut?.sideLeftDepth || 0} width={t}
        height={cd - (geo.cornerCut?.sideLeftDepth || 0)} fill={bf} stroke={INK} strokeWidth="2" />
      <rect x={W - t} y={geo.cornerCut?.sideRightDepth || 0} width={t}
        height={cd - (geo.cornerCut?.sideRightDepth || 0)} fill={bf} stroke={INK} strokeWidth="2" />
      {/* wieniec widoczny z gory jako plyta na calej glebokosci */}
      <rect x={geo.topX0} y="0" width={geo.topX1 - geo.topX0} height={cd}
        fill={bf} stroke={INK} strokeWidth="1" opacity="0.25" />

      {/* polki widziane z gory — obrys glebokosci polki w kolumnach, ktore je maja */}
      {showShelves &&
        (geo.levels[0]?.cols || []).map((c) => {
          if (c.kind === "drawers" || c.kind === "blenda") return null;
          const n = (c.shelves || []).length;
          if (!n) return null;
          return (
            <g key={"sh" + c.j}>
              <rect x={c.x0} y={geo.backIntrusion} width={c.w} height={geo.shelfDepth}
                fill={mat.shelf?.color || mat.board.color} fillOpacity="0.35"
                stroke={INK} strokeWidth="1.5" strokeDasharray="9 6" />
              <text x={(c.x0 + c.x1) / 2} y={geo.backIntrusion + geo.shelfDepth - 14}
                textAnchor="middle" fontSize="17" fill={INK} opacity="0.75"
                fontFamily="ui-monospace, monospace">
                {n} {n === 1 ? "półka" : "półki"} {fmt(c.w)}×{fmt(geo.shelfDepth)}
              </text>
            </g>
          );
        })}

      {/* przegrody pionowe */}
      {geo.dividers.map((d, i) => (
        <rect key={"dv" + i} x={d.x} y={geo.backIntrusion} width={t}
          height={geo.dividerDepth} fill={bf} stroke={INK} strokeWidth="2" />
      ))}

      {/* fronty widziane z gory jako cienki pas przy przedniej krawedzi */}
      {(() => {
        // bierzemy dolny poziom jako reprezentatywny (z gory widac tylko przednia plaszczyzne)
        const cols = geo.levels[0]?.cols || [];
        const ffc = cab.realColors && cab.frontSameAsBoard !== false ? mat.board.color : mat.front.color;
        const z0 = cab.frontMode === "overlay" ? cd : cd - geo.tf;
        return cols.map((c) => {
          if (!c.count) return null;
          const x0 = c.frontX0 ?? c.x0;
          const x1 = c.frontX1 ?? c.x1;
          const isDrawer = c.kind === "drawers";
          // skrzynka: bierzemy najglebsze NL sposrod szuflad w kolumnie (rzeczywisty zasieg)
          const nl = isDrawer && c.drawers?.length
            ? Math.max(...c.drawers.map((d) => d.nl || 0))
            : c.nl || 0;
          const boxFront = cd; // lico korpusu
          const boxBack = Math.max(geo.backIntrusion, cd - nl);
          return (
            <g key={"fr" + c.j}>
              <rect x={x0} y={z0} width={x1 - x0} height={geo.tf}
                fill={ffc} stroke={INK} strokeWidth="2" />
              {isDrawer && nl > 0 && (
                <>
                  <rect x={x0 + 4} y={boxBack} width={x1 - x0 - 8}
                    height={boxFront - boxBack}
                    fill="none" stroke={LINE} strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
                  <text x={(x0 + x1) / 2} y={(boxBack + boxFront) / 2 + 6} textAnchor="middle"
                    fontSize="16" fill={LINE} fontFamily="ui-monospace, monospace">
                    NL {fmt(nl)}
                  </text>
                  {/* wolna przestrzen za szuflada, od jej konca do tylu */}
                  {boxBack - geo.backIntrusion > 1 && showDims && (
                    <DimV y1={geo.backIntrusion} y2={boxBack} x={(x0 + x1) / 2}
                      label={`${fmt(boxBack - geo.backIntrusion)}`}
                      c={WARNC} />
                  )}
                </>
              )}
            </g>
          );
        });
      })()}

      {/* plecy */}
      {cab.back !== "none" && (() => {
        const bcol = geo.backIsBoard
          ? (cab.backPos === "outside" && cab.backBoardMat !== "shelf" ? mat.board.color : (mat.shelf?.color || mat.board.color))
          : mat.back.color;
        // z gory: y=0 to tyl. Plecy wewnatrz siedza tuz przy tyle, na zewnatrz za korpusem
        const outside = geo.backIsBoard && geo.backPos === "outside";
        const py = geo.grooved ? geo.grOff : outside ? -geo.tb : 0;
        const inside = geo.grooved || (geo.backIsBoard && geo.backPos === "inside");
        const base0 = inside ? geo.interior.x0 : 1;
        const base1 = inside ? geo.interior.x1 : W - 1;
        const px = Math.max(base0, geo.cornerCut?.backLeftX ?? base0);
        const px1 = Math.min(base1, geo.cornerCut?.backRightX ?? base1);
        const pw = Math.max(0, px1 - px);
        return (
          <rect x={px} y={py} width={pw} height={geo.tb}
            fill={bcol} stroke={INK} strokeWidth="2" />
        );
      })()}

      {/* wyciecie w narozniku */}
      {geo.geoCut && (() => {
        const gc = geo.geoCut;
        const smat = mat.shelf?.color || bf;
        // obszar wneki we wspolrzednych widoku z gory (y = glebokosc od tyłu)
        const rx = gc.bx0;
        const ry = gc.bz0;
        const rw = gc.bx1 - gc.bx0;
        const rh = gc.bz1 - gc.bz0;
        return (
          <>
            <rect x={rx} y={ry} width={rw} height={rh}
              fill={ERRC} opacity="0.15" stroke={ERRC} strokeWidth="1.5" strokeDasharray="6 4" />
            {cab.cutout?.mask !== false && (() => {
              const vVisible = gc.maskVisible === "vertical";
              // scianki NA ZEWNATRZ otworu; czolo dochodzi do lica boku
              const sideFace = gc.onLeft ? rx + t : rx + rw - t; // lico boku od wnetrza
              const vx = gc.onLeft ? rx + rw : rx - t;
              const hy = gc.onBack ? ry + rh : ry - t;
              const vy = vVisible ? (gc.onBack ? ry : ry - t) : ry;
              const vh = vVisible ? rh + t : rh;
              const hx0 = gc.onLeft
                ? sideFace
                : (vVisible ? rx : rx - t);
              const hx1 = gc.onLeft
                ? (vVisible ? rx + rw : rx + rw + t)
                : sideFace;
              const hx = Math.min(hx0, hx1);
              const hw = Math.abs(hx1 - hx0);
              return (
                <>
                  <rect x={vx} y={vy} width={t} height={vh}
                    fill={smat} stroke={INK} strokeWidth="2" />
                  <rect x={hx} y={hy} width={hw} height={t}
                    fill={smat} stroke={INK} strokeWidth="2" />
                </>
              );
            })()}
            {showDims && (
              <>
                {/* szerokosc na zewnatrz otworu: przy tylnej scianie gdy otwor z tyłu, inaczej przy licu */}
                <DimH x1={rx} x2={rx + rw}
                  y={gc.onBack ? ry - 22 : ry + rh + 22}
                  label={`${fmt(gc.cw)}`} above={gc.onBack} c={ERRC} />
                {/* glebokosc na zewnatrz otworu: po stronie boku szafki */}
                <DimV y1={ry} y2={ry + rh}
                  x={gc.onLeft ? rx - 22 : rx + rw + 22}
                  label={`${fmt(gc.cdp)}`} left={gc.onLeft} c={ERRC} />
                {/* wolna glebokosc od czola zabudowy do lica */}
                {(() => {
                  const mt = cab.cutout?.mask !== false ? t : 0;
                  const zEnd = gc.bz1 + mt;
                  const free = Math.round(cd - zEnd);
                  if (free < 20) return null;
                  return (
                    <DimV y1={zEnd} y2={cd} x={(gc.bx0 + gc.bx1) / 2}
                      label={`${fmt(free)}`} left={!gc.onLeft} c={LINE} />
                  );
                })()}

              </>
            )}
          </>
        );
      })()}

      {(geo.geoObs || []).map((o, obIx) => (() => {
        return (
          <g key={"ob" + obIx}>
            <rect x={o.ox0} y={o.oz0} width={o.ow} height={o.od}
              fill="#7c3aed" opacity="0.28" stroke="#6d28d9" strokeWidth="1.5" strokeDasharray="5 4" />
            {o.mask && o.maskChosen && (() => {
              const smat = mat.shelf?.color || mat.board.color;
              const rx = o.ox0, ry = o.oz0, rw = o.ow, rh = o.od;
              const gb = o;
              const needL = !gb.touchLeft, needR = !gb.touchRight;
              const needBack = !gb.touchBack, needFront = !gb.touchFront;
              const vVisible = gb.maskVisible === "vertical";
              const isU = gb.maskChosen === "U";
              const frontBetween = o.maskFront === "between";
              // czolo konczy sie na licu boku, gdy bryla dotyka boku
              const hx0 = gb.touchLeft ? (gb.boundL ?? t)
                : isU ? (frontBetween ? rx : rx - t)
                : (needL && !vVisible ? rx - t : rx);
              const hx1 = gb.touchRight ? (gb.boundR ?? W - t)
                : isU ? (frontBetween ? rx + rw : rx + rw + t)
                : (needR && !vVisible ? rx + rw + t : rx + rw);
              // przy czole miedzy bokami scianki wychodza przed nie o jego grubosc
              const eB = needBack && (isU ? frontBetween : vVisible) ? t : 0;
              const eF = needFront && (isU ? frontBetween : vVisible) ? t : 0;
              const walls = [];
              if (needL) walls.push({ x: rx - t, y: ry - eB, w: t, h: rh + eB + eF });
              if (needR) walls.push({ x: rx + rw, y: ry - eB, w: t, h: rh + eB + eF });
              if (needBack) walls.push({ x: hx0, y: ry - t, w: hx1 - hx0, h: t });
              if (needFront) walls.push({ x: hx0, y: ry + rh, w: hx1 - hx0, h: t });
              return walls.map((w, i) => (
                <rect key={"ow" + i} x={w.x} y={w.y} width={w.w} height={w.h}
                  fill={smat} stroke={INK} strokeWidth="2" />
              ));
            })()}
            <text x={o.ox0 + o.ow / 2} y={o.oz0 + o.od / 2 + 6} textAnchor="middle"
              fontSize="18" fill="#6d28d9" fontFamily="ui-monospace, monospace">
              {fmt(o.ow)}×{fmt(o.od)}
            </text>
            {showDims && (() => {
              // bryla w narozniku wchodzi w plyte boku — wtedy mierzymy od krawedzi szafki
              const cols = geo.levels[0]?.cols || [];
              const host = cols.find((c) => o.ox0 >= c.x0 - 1 && o.ox1 <= c.x1 + 1);
              const colX0 = host ? host.x0 : 0;
              const colX1 = host ? host.x1 : W;
              const dL = Math.round(o.ox0 - colX0);
              const dR = Math.round(colX1 - o.ox1);
              return (
                <>
                  {/* glebokosc od tylu do bryly */}
                  {o.oz0 > 0 && !o.mask && (
                    <DimV y1={0} y2={o.oz0} x={o.ox0 - 18}
                      label={`${fmt(o.oz0)}`} c="#6d28d9" />
                  )}
                  {/* glebokosc od przodu (lica) do bryly — tylko gdy nie ma zabudowy,
                      bo przy zabudowie mierzymy przestrzen od jej czola */}
                  {cd - o.oz1 > 0 && !o.mask && (
                    <DimV y1={o.oz1} y2={cd} x={o.ox1 + 18}
                      label={`${fmt(cd - o.oz1)}`} left={false} c="#6d28d9" />
                  )}
                  {/* odleglosci w obrebie kolumny, tuz pod bryla */}
                  {dL > 1 && !o.mask && (
                    <DimH x1={colX0} x2={o.ox0} y={o.oz1 + 46}
                      label={`${fmt(dL)}`} above={false} c="#6d28d9" />
                  )}
                  {dR > 1 && !o.mask && (
                    <DimH x1={o.ox1} x2={colX1} y={o.oz1 + 46}
                      label={`${fmt(dR)}`} above={false} c="#6d28d9" />
                  )}
                  {/* wolna przestrzen po zabudowie — tylko w kolumnach z polkami */}
                  {host && host.kind !== "drawers" && o.mask && (() => {
                    const gb = o;
                    const wallL = gb.touchLeft ? host.x0 : o.ox0 - geo.t;
                    const wallR = gb.touchRight ? host.x1 : o.ox1 + geo.t;
                    const myEnd = o.oz1 + (o.mask ? geo.t : 0);
                    const frontFree = Math.round(cd - myEnd);
                    return (
                      <>
                        {frontFree > 1 && (
                          <DimV y1={myEnd} y2={cd} x={(o.ox0 + o.ox1) / 2}
                            label={`${fmt(frontFree)}`}
                            left={(o.ox0 + o.ox1) / 2 > W / 2} c={LINE} />
                        )}
                      </>
                    );
                  })()}
                </>
              );
            })()}
          </g>
        );
      })())}

      {/* swiatla miedzy przeszkodami — liczone raz, na kazdym pasmie glebokosci */}
      {showDims && (() => {
        const cols = geo.levels[0]?.cols || [];
        const blockers = [];
        if (geo.geoCut) {
          const gc = geo.geoCut;
          const mt = cab.cutout?.mask !== false ? t : 0;
          blockers.push({
            l: gc.onLeft ? gc.bx0 : gc.bx0 - mt,
            r: gc.onLeft ? gc.bx1 + mt : gc.bx1,
            end: gc.bz1 + mt,
          });
        }
        (geo.geoObs || []).forEach((q) => {
          const mt = q.mask ? t : 0;
          blockers.push({
            l: q.ox0 - (q.touchLeft ? 0 : mt),
            r: q.ox1 + (q.touchRight ? 0 : mt),
            end: q.oz1 + mt,
          });
        });
        if (!blockers.length) return null;
        const edges = [0, ...new Set(blockers.map((b) => Math.round(b.end)))].sort((a, b) => a - b);
        const bands = edges.map((z, i) => [z, i + 1 < edges.length ? edges[i + 1] : cd]);
        const drawn = new Set();
        const out = [];
        bands.forEach(([za, zb]) => {
          if (zb - za < 12) return;
          const act = blockers.filter((b) => b.end > za + 1);
          cols.forEach((col) => {
            if (col.kind === "drawers") return;
            const inCol = act
              .filter((b) => b.r > col.x0 + 1 && b.l < col.x1 - 1)
              .sort((a, b) => a.l - b.l);
            if (!inCol.length) return;
            let cur = col.x0;
            const segs = [];
            inCol.forEach((b) => {
              if (b.l - cur > 1) segs.push([cur, b.l]);
              cur = Math.max(cur, b.r);
            });
            if (col.x1 - cur > 1) segs.push([cur, col.x1]);
            segs.forEach(([sa, sb]) => {
              const val = Math.round(sb - sa);
              if (val < 20) return;
              const key = `${col.j}|${Math.round(sa)}|${Math.round(sb)}`;
              if (drawn.has(key)) return;
              drawn.add(key);
              out.push(
                <DimH key={"lw" + key} x1={sa} x2={sb} y={za + 16}
                  label={`${fmt(val)}`} above={false} c={LINE} />
              );
            });
          });
        });
        return out;
      })()}

      {showDims && (
        <>
          <DimH x1={0} x2={W} y={-50} label={`${fmt(W)}`} />
          <DimV y1={0} y2={cd} x={-50} label={`${fmt(cd)}`} />
          {/* szerokosci swiatla kolumn dolnego poziomu */}
          {(geo.levels[0]?.cols || []).length > 1 &&
            geo.levels[0].cols.map((c) => (
              <DimH key={"cw" + c.j} x1={c.x0} x2={c.x1} y={cd + 90}
                label={`${fmt(c.w)}`} above={false}
                c={c.w < MIN_COL ? WARNC : DIMC} />
            ))}
          {/* glebokosc uzytkowa: swiatlo miedzy pleckami a licem */}
          <DimV y1={geo.backIntrusion} y2={cd} x={W + 55}
            label={`${fmt(cd - geo.backIntrusion)}`} left={false} c={DIMC} />
          {/* glebokosc polki, jesli krotsza niz swiatlo */}
          {geo.shelfDepth < cd - geo.backIntrusion && (
            <DimV y1={geo.backIntrusion} y2={geo.backIntrusion + geo.shelfDepth} x={W + 115}
              label={`półka ${fmt(geo.shelfDepth)}`} left={false} c={LINE} />
          )}
        </>
      )}
      <text x={W / 2} y={cd + 150} textAnchor="middle" fontSize="22" fill={LINE}
        fontFamily="ui-monospace, monospace">widok z góry — tył u góry, przód u dołu</text>
    </svg>
  );
}

function SideView({ cab, geo, mat, showDims, which }) {
  const sideRight = which === "right";
  const { H, D } = cab;
  const pad = 160;
  const rightExtra = cab.frontMode === "overlay" ? geo.tf : 0;
  const below = Math.max(
    cab.legs?.on ? cab.legs.height || 100 : 0,
    cab.plinth.on && !geo.plinthInBody ? geo.plinthH : 0
  );
  const vb = `${-pad} ${-pad - 70} ${D + 2 * pad + rightExtra} ${H + 2 * pad + 70 + below}`;
  const fy = (y) => H - y;
  const bf = mat.board.color;
  const cd = geo.carcassDepth;
  const xC = D - cd; // tyl po lewej
  const hasFront = geo.levels.some((lv) => lv.cols.some((c) => c.count > 0));
  // przod korpusu jest przy x=D; front nakladany wystaje o tf, wpuszczany jest w licu
  const frontFace = cab.frontMode === "overlay" ? D + geo.tf : D;

  const allShelves = [
    ...geo.sepShelves.map((s) => s.y),
    ...geo.levels.flatMap((lv) => lv.cols.flatMap((c) => c.shelves.map((s) => s.y))),
  ];

  return (
    <svg viewBox={vb} className="w-full h-auto" style={{ maxHeight: 540 }}>
      <rect x="0" y="0" width={D} height={H} fill="#fafaf9" stroke={LINE} strokeWidth="1.5" strokeDasharray="8 8" />
      {(() => {
        const cut = (sideRight ? geo.cornerCut?.sideRightDepth : geo.cornerCut?.sideLeftDepth) || 0;
        return (
          <rect x={xC + cut} y="0" width={cd - cut} height={H}
            fill={bf} stroke={INK} strokeWidth="2" opacity="0.35" />
        );
      })()}
      <rect x={xC} y="0" width={cd} height={geo.t} fill={bf} stroke={INK} strokeWidth="2" />
      <rect x={xC} y={fy(geo.bottomY + geo.t)} width={cd} height={geo.t} fill={bf} stroke={INK} strokeWidth="2" />

      {cab.plinth.on && geo.plinthInBody && (
        <rect x={D - geo.t - (cab.plinth.setback || 0)} y={fy(geo.plinthH)}
          width={geo.t} height={geo.plinthH} fill={bf} stroke={INK} strokeWidth="2" />
      )}
      {cab.plinth.on && !geo.plinthInBody && (
        <rect x={xC} y={H} width={cd} height={geo.plinthH}
          fill={bf} stroke={INK} strokeWidth="2" opacity="0.75" />
      )}
      {cab.legs?.on && (
        <>
          <rect x={xC + 40} y={H} width={40} height={cab.legs.height || 100}
            fill="#3f3f46" stroke={INK} strokeWidth="2" />
          <rect x={xC + cd - 80} y={H} width={40} height={cab.legs.height || 100}
            fill="#3f3f46" stroke={INK} strokeWidth="2" />
        </>
      )}

      {allShelves.map((y, i) => (
        <rect key={i} x={xC + geo.backIntrusion} y={fy(y + geo.t)}
          width={geo.shelfDepth} height={geo.t} fill={bf} stroke={INK} strokeWidth="2" />
      ))}

      {/* wsporniki pionowe przy elementach stalych */}
      {geo.levels.flatMap((lv) =>
        lv.cols
          .filter((c) => c.support)
          .map((c) => (
            <rect key={`sup${lv.i}-${c.j}`} x={D - c.support.d} y={fy(lv.y1)}
              width={c.support.d} height={lv.h} fill="none" stroke={INK}
              strokeWidth="1.5" strokeDasharray="8 6" />
          ))
      )}

      {cab.back !== "none" && (() => {
        const bcol = geo.backIsBoard
          ? (cab.backPos === "outside" && cab.backBoardMat !== "shelf" ? mat.board.color : (mat.shelf?.color || mat.board.color))
          : mat.back.color;
        // tyl po lewej (xC). Wewnatrz przy xC, na zewnatrz za korpusem (xC - tb)
        const px = geo.grooved
          ? xC + geo.grOff
          : geo.backIsBoard && geo.backPos === "outside"
          ? xC - geo.tb
          : xC;
        const py = geo.backIsBoard && geo.backPos === "inside" ? fy(geo.interior.y1) : 0;
        const ph = geo.backIsBoard && geo.backPos === "inside" ? geo.innerH : H;
        return (
          <rect x={px} y={py} width={geo.tb} height={ph}
            fill={bcol} stroke={INK} strokeWidth="2" />
        );
      })()}

      {geo.levels
        .filter((lv) => lv.cols.some((c) => c.count > 0))
        .map((lv) => (
          <rect key={lv.i} x={cab.frontMode === "overlay" ? D : D - geo.tf}
            y={fy(lv.frontHi)} width={geo.tf} height={Math.max(0, lv.frontHi - lv.frontLo)}
            fill={cab.realColors && cab.frontSameAsBoard !== false ? mat.board.color : mat.front.color} stroke={INK} strokeWidth="2" />
        ))}

      {showDims && (
        <>
          <DimH x1={0} x2={D} y={-50} label={`${fmt(D)}`} />
          {hasFront && (
            <DimH x1={0} x2={frontFace} y={-110} label={`z drzwiami ${fmt(frontFace)}`} c={LINE} />
          )}
          <DimH x1={xC} x2={xC + geo.shelfDepth} y={H + 70} label={`półka ${fmt(geo.shelfDepth)}`} above={false} />
          <DimV y1={0} y2={H} x={-50} label={`${fmt(H)}`} />
        </>
      )}
      {geo.geoCut && geo.geoCut.onBack && (geo.geoCut.onLeft !== sideRight) && (
        <>
          {/* obszar wyciecia od tylu (tyl po lewej, x=xC) */}
          <rect x={xC} y={fy(geo.geoCut.cy1)} width={geo.geoCut.cdp} height={geo.geoCut.cutH}
            fill={ERRC} opacity="0.14" stroke={ERRC} strokeWidth="1.5" strokeDasharray="6 4" />
          {/* maskownica pozioma zamyka wneke */}
          <rect x={xC + geo.geoCut.cdp - geo.t} y={fy(geo.geoCut.cy1)} width={geo.t} height={geo.geoCut.cutH}
            fill={mat.shelf?.color || bf} stroke={INK} strokeWidth="2" opacity="0.9" />
        </>
      )}
      {/* elementy kolizyjne — widoczne w przekroju boku */}
      {(geo.geoObs || []).map((o, oi) => {
        const near = sideRight ? o.touchRight : o.touchLeft; // przy pokazywanym boku
        return (
          <g key={"sob" + oi} opacity={near ? 1 : 0.45}>
            <rect x={xC + o.oz0} y={fy(o.oy1)} width={o.od} height={o.oy1 - o.oy0}
              fill="#7c3aed" opacity="0.3" stroke="#6d28d9" strokeWidth="1.5" strokeDasharray="5 4" />
            {o.mask && !o.touchFront && (
              <rect x={xC + o.oz1} y={fy(o.maskTop ?? o.oy1)} width={geo.t} height={(o.maskTop ?? o.oy1) - o.oy0}
                fill={mat.shelf?.color || bf} stroke={INK} strokeWidth="2" />
            )}
            {o.mask && !o.touchBack && (
              <rect x={xC + o.oz0 - geo.t} y={fy(o.maskTop ?? o.oy1)} width={geo.t} height={(o.maskTop ?? o.oy1) - o.oy0}
                fill={mat.shelf?.color || bf} stroke={INK} strokeWidth="2" />
            )}
          </g>
        );
      })}

      {geo.geoCut && !geo.geoCut.onBack && (
        <>
          <rect x={D - geo.geoCut.cdp} y={fy(geo.geoCut.cy1)} width={geo.geoCut.cdp} height={geo.geoCut.cutH}
            fill={ERRC} opacity="0.14" stroke={ERRC} strokeWidth="1.5" strokeDasharray="6 4" />
        </>
      )}
      <text x={D / 2} y={H + 125} textAnchor="middle" fontSize="22" fill={LINE}
        fontFamily="ui-monospace, monospace">{sideRight ? "prawy bok" : "lewy bok"} — tył po lewej, przód po prawej</text>
    </svg>
  );
}

/* ---------- widok 3D ---------- */

const VERTS = (x0, y0, z0, x1, y1, z1) => [
  { x: x0, y: y0, z: z0 }, { x: x1, y: y0, z: z0 },
  { x: x1, y: y1, z: z0 }, { x: x0, y: y1, z: z0 },
  { x: x0, y: y0, z: z1 }, { x: x1, y: y0, z: z1 },
  { x: x1, y: y1, z: z1 }, { x: x0, y: y1, z: z1 },
];
const QUADS = [
  [0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7],
  [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0],
];

const rotAboutY = (p, ang, ox, oz) => {
  const c = Math.cos(ang), s2 = Math.sin(ang);
  const dx = p.x - ox, dz = p.z - oz;
  return { x: ox + dx * c - dz * s2, y: p.y, z: oz + dx * s2 + dz * c };
};

function Scene3D({ cab, geo, mat, open, yaw, pitch, angle }) {
  const t = geo.t;
  const cd = geo.carcassDepth;
  const { W, H } = cab;
  const bf = mat.board.color;
  const ff = cab.realColors && cab.frontSameAsBoard !== false ? mat.board.color : mat.front.color;

  /* --- lista bryl --- */
  const solids = [];
  const box = (x0, y0, z0, x1, y1, z1, color, transform, alpha, bold) => {
    let v = VERTS(x0, y0, z0, x1, y1, z1);
    if (transform) v = v.map(transform);
    solids.push({ v, color, alpha: alpha ?? 1, bold: !!bold });
  };

  // boki skrocone przy narozniku (w 3D z=cd to tyl, wiec ucinamy od strony cd)
  const cutSL = geo.cornerCut?.sideLeftDepth || 0;
  const cutSR = geo.cornerCut?.sideRightDepth || 0;
  box(0, geo.leftY0, 0, t, geo.leftY0 + geo.leftLen, cd - cutSL, bf);
  box(W - t, geo.rightY0, 0, W, geo.rightY0 + geo.rightLen, cd - cutSR, bf);
  box(geo.botX0, geo.bottomY, 0, geo.botX1, geo.bottomY + t, cd, bf);
  box(geo.topX0, H - t, 0, geo.topX1, H, cd, bf);

  if (cab.back !== "none") {
    const bz = geo.grooved ? cd - geo.grOff - geo.tb : cd;
    const grab = geo.grooved ? geo.grDep - geo.grPlay : 0;
    const bx0 = geo.grooved ? geo.interior.x0 - grab : 1;
    const bx1 = geo.grooved ? geo.interior.x1 + grab : W - 1;
    const by0 = geo.grooved ? geo.interior.y0 - grab : 1;
    const by1 = geo.grooved ? geo.interior.y1 + grab : H - 1;
    const px0 = Math.max(bx0, geo.cornerCut?.backLeftX ?? bx0);
    const px1 = Math.min(bx1, geo.cornerCut?.backRightX ?? bx1);
    box(px0, by0, bz, px1, by1, bz + geo.tb, mat.back.color);
  }

  geo.sepShelves.forEach((sh) =>
    box(geo.interior.x0, sh.y, geo.backIntrusion, geo.interior.x1, sh.y + t,
      geo.backIntrusion + geo.shelfDepth, bf)
  );
  geo.dividers.forEach((d) =>
    box(d.x, d.y0, geo.backIntrusion, d.x + t, d.y1, geo.backIntrusion + geo.dividerDepth, bf)
  );
  geo.levels.forEach((lv) =>
    lv.cols.forEach((c) => {
      c.shelves.forEach((sh) =>
        box(c.x0, sh.y, geo.backIntrusion, c.x1, sh.y + t,
          geo.backIntrusion + geo.shelfDepth, bf)
      );
      if (c.support && c.fix) {
        const sx = c.fix.side === "left" ? c.fix.x + c.fix.w - t : c.fix.x;
        box(sx, lv.y0, 0, sx + t, lv.y1, c.support.d, bf);
      }
    })
  );

  if (cab.plinth.on) {
    const sb = cab.plinth.setback || 0;
    // z=0 to przod korpusu; cokol siedzi z przodu, cofniety o setback w glab
    if (geo.plinthInBody)
      box(geo.interior.x0, 0, sb, geo.interior.x1, geo.plinthH, sb + t, bf);
    else box(0, -geo.plinthH, sb, W, 0, sb + t, bf);
  }
  if (cab.rail.on) {
    const ry = cab.rail.pos === "top" ? geo.interior.y1 - cab.rail.height : geo.interior.y0;
    box(geo.interior.x0, ry, 0, geo.interior.x1, ry + cab.rail.height, t, bf);
  }
  if (cab.legs && cab.legs.on) {
    const lh = cab.legs.height || 100;
    const ins = 40;
    [[ins, ins], [W - ins - 40, ins], [ins, cd - ins - 40], [W - ins - 40, cd - ins - 40]]
      .forEach(([lx, lz]) => box(lx, -lh, lz, lx + 40, 0, lz + 40, "#3f3f46"));
  }

  (geo.geoObs || []).forEach((o) => {
    // w 3D z=cd to tyl, a geometria bryly ma tyl przy oz=0 — odwracamy
    box(o.ox0, o.oy0, cd - o.oz1, o.ox1, o.oy1, cd - o.oz0, "#7c3aed", null, 0.45);
  });
  if (geo.geoCut && cab.cutout?.mask !== false) {
    const gc = geo.geoCut;
    const smat = mat.shelf?.color || bf;
    // w 3D z=cd to TYL, geometria wneki ma tyl przy z=0 -> odwracamy: z3d = cd - z
    const zf = (z) => cd - z;
    const rx = gc.bx0, rw = gc.bx1 - gc.bx0;
    const ry = gc.bz0, rh = gc.bz1 - gc.bz0;
    const vVisible = gc.maskVisible === "vertical";
    const sideFace = gc.onLeft ? rx + t : rx + rw - t; // lico boku od wnetrza
    const vx0 = gc.onLeft ? rx + rw : rx - t;
    const vz0 = vVisible ? (gc.onBack ? ry : ry - t) : ry;
    const vz1 = vz0 + (vVisible ? rh + t : rh);
    box(vx0, gc.cy0, zf(vz1), vx0 + t, gc.cy1, zf(vz0), smat);
    // czolo — dochodzi do lica boku
    const hz0 = gc.onBack ? ry + rh : ry - t;
    const a0 = gc.onLeft ? sideFace : (vVisible ? rx : rx - t);
    const a1 = gc.onLeft ? (vVisible ? rx + rw : rx + rw + t) : sideFace;
    box(Math.min(a0, a1), gc.cy0, zf(hz0 + t), Math.max(a0, a1), gc.cy1, zf(hz0), smat);
  }
  (geo.geoObs || []).filter((o) => o.mask && o.maskChosen).forEach((o) => {
    const smat = mat.shelf?.color || bf;
    const zf = (z) => cd - z;
    const needL = !o.touchLeft, needR = !o.touchRight;
    const needBack = !o.touchBack, needFront = !o.touchFront;
    const eB = needBack ? t : 0, eF = needFront ? t : 0;
    const mTop = o.maskTop ?? o.oy1;
    if (needL) box(o.ox0 - t, o.oy0, zf(o.oz1 + eF), o.ox0, mTop, zf(o.oz0 - eB), smat);
    if (needR) box(o.ox1, o.oy0, zf(o.oz1 + eF), o.ox1 + t, mTop, zf(o.oz0 - eB), smat);
    if (needBack) box(o.ox0, o.oy0, zf(o.oz0), o.ox1, mTop, zf(o.oz0 - t), smat);
    if (needFront) box(o.ox0, o.oy0, zf(o.oz1 + t), o.ox1, mTop, zf(o.oz1), smat);
  });

  const tf = geo.tf;
  const handleBar = (d, z0trans, transform) => {
    if (!d.handle) return;
    const depth = 22; // ile uchwyt wystaje przed front
    const zA = z0trans - depth;
    const zB = z0trans;
    let hx0, hy0, hx1, hy1;
    if (d.type === "drawer") {
      const cy = d.y + d.h - Math.min(50, d.h / 2);
      hx0 = d.x + d.w / 2 - Math.min(120, d.w * 0.3);
      hx1 = d.x + d.w / 2 + Math.min(120, d.w * 0.3);
      hy0 = cy - 6;
      hy1 = cy + 6;
    } else {
      const cx = d.hingeSide === "left" ? d.x + d.w - 38 : d.x + 26;
      hx0 = cx - 6;
      hx1 = cx + 6;
      hy0 = d.y + d.h / 2 - Math.min(90, d.h * 0.25);
      hy1 = d.y + d.h / 2 + Math.min(90, d.h * 0.25);
    }
    box(hx0, hy0, zA, hx1, hy1, zB, "#3f3f46", transform, 1, false);
  };

  geo.doors.forEach((d) => {
    const z0 = cab.frontMode === "overlay" ? -tf : 0;
    const z1 = z0 + tf;
    if (d.type === "drawer") {
      const pull = open ? Math.min(220, (d.nl || 400) * 0.6) : 0;
      box(d.x, d.y, z0 - pull, d.x + d.w, d.y + d.h, z1 - pull, ff, null, 1, true);
      handleBar(d, z0 - pull, null);
      return;
    }
    const col = d.mirror ? mat.mirror.color : ff;
    if (d.type === "fix" || d.type === "blenda" || !open) {
      box(d.x, d.y, z0, d.x + d.w, d.y + d.h, z1, col, null, 1, true);
      if (d.type !== "fix" && d.type !== "blenda") handleBar(d, z0, null);
      return;
    }
    // os obrotu na wlasnej zewnetrznej krawedzi plyty, zeby nie wychodzila poza obrys
    const ang = (angle * Math.PI) / 180;
    const left = d.hingeSide === "left";
    const ox = left ? d.x : d.x + d.w;
    const sign = left ? -1 : 1;
    const rot = (p) => rotAboutY(p, sign * ang, ox, z0);
    box(d.x, d.y, z0, d.x + d.w, d.y + d.h, z1, col, rot, 0.85, true);
    handleBar(d, z0, rot);
  });

  /* --- rzut --- */
  const cyw = Math.cos(yaw), syw = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cx = W / 2, cyc = H / 2, cz = cd / 2;
  const proj = (p) => {
    const x = p.x - cx, y = p.y - cyc, z = p.z - cz;
    const x1 = x * cyw + z * syw;
    const z1 = -x * syw + z * cyw;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    return { X: x1, Y: -y2, D: z2 };
  };

  const faces = [];
  solids.forEach((sol) => {
    const pv = sol.v.map(proj);
    QUADS.forEach((q) => {
      const pts = q.map((i) => pv[i]);
      const depth = pts.reduce((a, b) => a + b.D, 0) / 4;
      const a = pts[0], b = pts[1], c2 = pts[2];
      const ux = b.X - a.X, uy = b.Y - a.Y;
      const vx = c2.X - a.X, vy = c2.Y - a.Y;
      const area = ux * vy - uy * vx;
      const shade = 0.62 + 0.38 * Math.min(1, Math.abs(area) / 40000);
      faces.push({ pts, depth, color: sol.color, shade, alpha: sol.alpha, bold: sol.bold });
    });
  });
  faces.sort((a, b) => b.depth - a.depth);

  const xs = faces.flatMap((f) => f.pts.map((p) => p.X));
  const ys = faces.flatMap((f) => f.pts.map((p) => p.Y));
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 60;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;

  const tint = (hex, f) => {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g2 = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b2 = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${g2},${b2})`;
  };

  return (
    <svg viewBox={vb} className="w-full h-auto select-none" style={{ maxHeight: 540 }}>
      {faces.map((f, i) => (
        <polygon key={i} points={f.pts.map((p) => `${p.X},${p.Y}`).join(" ")}
          fill={tint(f.color, f.shade)} stroke={INK} strokeWidth={f.bold ? 3 : 1.2}
          strokeLinejoin="round" opacity={f.alpha} />
      ))}
    </svg>
  );
}

/* ---------- kontrolki ---------- */

const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs uppercase tracking-wider text-stone-500 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-xs text-stone-400 mt-1">{hint}</span>}
  </label>
);

const Num = ({ value, onChange, min, max, suffix = "mm" }) => (
  <div className="flex items-center gap-2">
    <input type="number" value={value} min={min} max={max} step={1}
      onChange={(e) => onChange(e.target.value === "" ? "" : Math.round(Number(e.target.value)))}
      className="w-full rounded border border-stone-300 bg-white px-2 py-1.5 font-mono text-sm text-stone-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600" />
    <span className="text-xs text-stone-400 shrink-0">{suffix}</span>
  </div>
);

const AutoNum = ({ value, placeholder, onChange, fixed, warn }) => (
  <input type="number" step={1} value={value ?? ""} placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className={
      "w-full rounded border px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 " +
      (fixed
        ? "border-teal-600 bg-teal-50 text-stone-900"
        : warn
        ? "border-amber-400 bg-white text-stone-900 placeholder:text-amber-600"
        : "border-stone-300 bg-white text-stone-900 placeholder:text-stone-400")
    } />
);

const Seg = ({ value, onChange, options }) => (
  <div className="flex rounded border border-stone-300 overflow-hidden">
    {options.map((o) => (
      <button key={o.v} onClick={() => onChange(o.v)}
        className={"flex-1 px-2 py-1.5 text-xs transition-colors " +
          (value === o.v ? "bg-teal-700 text-white" : "bg-white text-stone-600 hover:bg-stone-100")}>
        {o.l}
      </button>
    ))}
  </div>
);

const Check = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 accent-teal-700" />
    <span className="text-sm text-stone-700">{label}</span>
  </label>
);

const Card = ({ title, children, right }) => (
  <section className="rounded-lg border border-stone-200 bg-white">
    <header className="flex items-center justify-between border-b border-stone-200 px-4 py-2.5">
      <h2 className="text-sm font-semibold tracking-tight text-stone-800">{title}</h2>
      {right}
    </header>
    <div className="p-4 space-y-4">{children}</div>
  </section>
);

const NoteLine = ({ text, color, icon, editLevels, cab }) => {
  const [txt, action] = text.split("|");
  let btn = null;
  if (action?.startsWith("fixgap:")) {
    const [, li, j, val] = action.split(":");
    btn = { label: `Zwiększ luz do ${val} mm`, run: () => editLevels((L) => (L[+li].cols[+j].gapBetween = +val)) };
  } else if (action?.startsWith("fixnl:")) {
    const [, li, j, k, val] = action.split(":");
    btn = { label: `Zmień głębokość prowadnic do NL ${val}`, run: () => editLevels((L) => (L[+li].cols[+j].drawers[+k].nl = +val)) };
  }
  return (
    <li className="flex items-start gap-2 text-sm" style={{ color }}>
      <span className="font-mono">{icon}</span>
      <span>
        {txt}
        {btn && (
          <button onClick={btn.run}
            className="ml-2 rounded bg-teal-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-teal-700">
            {btn.label}
          </button>
        )}
      </span>
    </li>
  );
};

const MiniBtn = ({ onClick, children, tone = "plain", title }) => (
  <button onClick={onClick} title={title}
    className={"rounded border px-1.5 py-0.5 text-[11px] transition-colors " +
      (tone === "on"
        ? "border-teal-700 bg-teal-700 text-white"
        : "border-stone-200 bg-white text-stone-500 hover:border-stone-400 hover:text-stone-800")}>
    {children}
  </button>
);

/* ---------- aplikacja ---------- */

export default function App() {
  const [mat, setMat] = useState(defaultMaterials);
  const [cab, setCabRaw] = useState(defaultCab);
  const histRef = useRef({ past: [], future: [] });
  const [histLen, setHistLen] = useState({ undo: 0, redo: 0 });

  // kazda zmiana cab przechodzi tu — zapisuje poprzedni stan do historii
  const setCab = useCallback((next) => {
    setCabRaw((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (resolved === prev) return prev;
      const h = histRef.current;
      h.past.push(prev);
      if (h.past.length > 60) h.past.shift();
      h.future = [];
      setHistLen({ undo: h.past.length, redo: 0 });
      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    const h = histRef.current;
    if (!h.past.length) return;
    setCabRaw((cur) => {
      h.future.unshift(cur);
      const prev = h.past.pop();
      setHistLen({ undo: h.past.length, redo: h.future.length });
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    const h = histRef.current;
    if (!h.future.length) return;
    setCabRaw((cur) => {
      h.past.push(cur);
      const nxt = h.future.shift();
      setHistLen({ undo: h.past.length, redo: h.future.length });
      return nxt;
    });
  }, []);

  // skroty klawiszowe Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const [transfer, setTransfer] = useState(null); // { mode:'export'|'import', text }

  const exportProject = async () => {
    const json = JSON.stringify({ cab, mat }, null, 2);
    let copied = false;
    try {
      await navigator.clipboard.writeText(json);
      copied = true;
    } catch (e) {
      copied = false;
    }
    setTransfer({ mode: "export", text: json });
    setSaved(copied ? "skopiowano projekt do schowka" : "skopiuj tekst projektu");
  };

  const applyImportText = (raw) => {
    try {
      const d = JSON.parse(raw);
      if (!d.cab) throw new Error("zły format");
      const merged = { ...defaultCab, ...d.cab, version: defaultCab.version };
      ["cutout", "obstacle", "backGroove", "plinth", "legs", "rail", "gaps", "joints"].forEach((k) => {
        if (defaultCab[k] && typeof defaultCab[k] === "object")
          merged[k] = { ...defaultCab[k], ...(d.cab[k] || {}) };
      });
      setCab(merged);
      const mm = { ...defaultMaterials };
      if (d.mat) Object.keys(mm).forEach((k) => { mm[k] = { ...mm[k], ...(d.mat[k] || {}) }; });
      mm.mirror = { ...mm.mirror, color: defaultMaterials.mirror.color }; // kolor lustra staly
      setMat(mm);
      setSaved("wczytano projekt");
      setTransfer(null);
    } catch (err) {
      setSaved("nieprawidłowy tekst projektu");
    }
  };

  const importProject = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyImportText(String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  };
  const [view, setView] = useState("closed");
  const [showDims, setShowDims] = useState(true);
  const [showGaps, setShowGaps] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showShelves, setShowShelves] = useState(false);
  const [sideWhich, setSideWhich] = useState("left");
  const [yaw, setYaw] = useState(-0.55);
  const [pitch, setPitch] = useState(0.28);
  const [open3d, setOpen3d] = useState(false);
  const [angle3d, setAngle3d] = useState(90);
  const drag = useRef(null);
  const [saved, setSaved] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("szafki:projekt");
        if (r) {
          const d = JSON.parse(r.value);
          const migratable = d.cab && d.cab.levels && Array.isArray(d.cab.levels);
          if (migratable) {
            // migracja: dokladamy nowe pola z domyslnych, zachowujac cala strukture wnetrza
            const merged = { ...defaultCab, ...d.cab, version: defaultCab.version };
            ["cutout", "obstacle", "backGroove", "plinth", "legs", "rail", "gaps", "joints"].forEach((k) => {
              if (defaultCab[k] && typeof defaultCab[k] === "object")
                merged[k] = { ...defaultCab[k], ...(d.cab[k] || {}) };
            });
            setCabRaw(merged);
            const mm = { ...defaultMaterials };
            if (d.mat) Object.keys(mm).forEach((k) => { mm[k] = { ...mm[k], ...(d.mat[k] || {}) }; });
            mm.mirror = { ...mm.mirror, color: defaultMaterials.mirror.color }; // kolor lustra staly
            setMat(mm);
            setSaved(
              d.cab.version === defaultCab.version
                ? "wczytano zapisany projekt"
                : "wczytano i zaktualizowano starszy projekt"
            );
          }
        }
      } catch (e) {
        /* brak zapisu */
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(async () => {
      try {
        await window.storage.set("szafki:projekt", JSON.stringify({ cab, mat }));
        setSaved("zapisano " + new Date().toLocaleTimeString("pl-PL"));
      } catch (e) {
        setSaved("nie udało się zapisać");
      }
    }, 800);
    return () => clearTimeout(id);
  }, [cab, mat, loaded]);

  const geo = useMemo(() => computeGeo(cab, mat), [cab, mat]);
  const set = useCallback((patch) => setCab((c) => ({ ...c, ...patch })), [setCab]);
  const setGap = (k, v) => setCab((c) => ({ ...c, gaps: { ...c.gaps, [k]: v } }));

  /* --- edycja struktury --- */
  const editLevels = (fn) =>
    setCab((c) => {
      const levels = JSON.parse(JSON.stringify(c.levels));
      fn(levels);
      return { ...c, levels };
    });

  const addLevel = () => editLevels((L) => L.push(newLevel(L[0]?.cols[0]?.doors ?? 1, 0)));
  const removeLevel = (i) => editLevels((L) => L.length > 1 && L.splice(i, 1));
  const setLevelH = (i, v) => editLevels((L) => (L[i].h = v === "" ? null : Math.round(Number(v))));

  const addCol = (i) => editLevels((L) => L[i].cols.push(newColumn(1, 0)));
  const removeCol = (i, j) => editLevels((L) => L[i].cols.length > 1 && L[i].cols.splice(j, 1));
  const setColW = (i, j, v) => editLevels((L) => (L[i].cols[j].w = v === "" ? null : Math.round(Number(v))));
  const setColDoors = (i, j, v) =>
    editLevels((L) => (L[i].cols[j].doors = Math.max(0, Math.round(Number(v) || 0))));
  const setColShelfCount = (i, j, v) =>
    editLevels((L) => {
      const n = Math.max(0, Math.round(Number(v) || 0));
      L[i].cols[j].shelfTargets = Array(n + 1).fill(null);
    });
  const setColOpening = (i, j, k, v) =>
    editLevels((L) => (L[i].cols[j].shelfTargets[k] = v === "" ? null : Math.round(Number(v))));
  const setColKind = (i, j, v) =>
    editLevels((L) => {
      L[i].cols[j].kind = v;
      if (v === "drawers" && !(L[i].cols[j].drawers || []).length)
        L[i].cols[j].drawers = [newDrawer(), newDrawer(), newDrawer()];
    });
  const setFixSide = (i, j, v) =>
    editLevels((L) => {
      L[i].cols[j].fix = { ...(L[i].cols[j].fix || { w: 60 }), side: v };
    });
  const setFixW = (i, j, v) =>
    editLevels((L) => {
      L[i].cols[j].fix = {
        ...(L[i].cols[j].fix || { side: "none" }),
        w: Math.max(0, Math.round(Number(v) || 0)),
      };
    });
  const setFixMode = (i, j, v) =>
    editLevels((L) => {
      L[i].cols[j].fix = { ...(L[i].cols[j].fix || {}), mode: v };
    });
  const setDoorWidth = (i, j, k, v) =>
    editLevels((L) => {
      const a = L[i].cols[j].doorWidths || [];
      while (a.length <= k) a.push(null);
      a[k] = v === "" ? null : Math.round(Number(v));
      L[i].cols[j].doorWidths = a;
    });
  const clearDoorWidths = (i, j) => editLevels((L) => (L[i].cols[j].doorWidths = []));
  const setDoorFlag = (i, j, k, key, v) =>
    editLevels((L) => {
      const a = L[i].cols[j][key] || [];
      while (a.length <= k) a.push(key === "handles" ? true : key === "hinges" ? null : false);
      a[k] = v;
      L[i].cols[j][key] = a;
    });
  const setDrawerHandle = (i, j, k, v) =>
    editLevels((L) => (L[i].cols[j].drawers[k].handle = v));
  const setColBack = (i, j, v) => editLevels((L) => (L[i].cols[j].backMode = v));
  const setBlendaMode = (i, j, v) =>
    editLevels((L) => (L[i].cols[j].blendaMode = v));
  const setHinge = (i, j, v) => editLevels((L) => (L[i].cols[j].hinge = v));
  const setFixSupport = (i, j, v) =>
    editLevels((L) => {
      L[i].cols[j].fix = { ...(L[i].cols[j].fix || {}), support: v };
    });
  const setFixSupportDepth = (i, j, v) =>
    editLevels((L) => {
      L[i].cols[j].fix = {
        ...(L[i].cols[j].fix || {}),
        supportDepth: Math.max(0, Math.round(Number(v) || 0)),
      };
    });

  const setColNL = (i, j, v) =>
    editLevels((L) => (L[i].cols[j].nl = v === "" ? null : Number(v)));
  const addDrawer = (i, j) => editLevels((L) => L[i].cols[j].drawers.push(newDrawer()));
  const removeDrawer = (i, j, k) => editLevels((L) => L[i].cols[j].drawers.splice(k, 1));
  const setDrawerH = (i, j, k, v) =>
    editLevels((L) => (L[i].cols[j].drawers[k].h = v === "auto" ? "auto" : Number(v)));
  const setDrawerFront = (i, j, k, v) =>
    editLevels((L) => (L[i].cols[j].drawers[k].front = v === "" ? null : Math.round(Number(v))));
  // lista elementow kolizyjnych (migracja ze starego pojedynczego pola)
  const obsList = Array.isArray(cab.obstacles) && cab.obstacles.length
    ? cab.obstacles
    : cab.obstacle?.on ? [cab.obstacle] : [];
  const writeObs = (arr) => set({ obstacles: arr, obstacle: { ...(cab.obstacle || {}), on: false } });
  const addObstacle = () =>
    writeObs([...obsList, { on: true, w: 80, d: 80, h: 0, side: "right", fromSide: 0,
      fromBack: 0, fromBottom: 0, fullHeight: true, mask: true, maskType: "auto", maskFront: "over" }]);
  const removeObstacle = (i) => writeObs(obsList.filter((_, k) => k !== i));
  const setObstacle = (i, patch) =>
    writeObs(obsList.map((o, k) => (k === i ? { ...o, ...patch } : o)));

  const setDrawerNL = (i, j, k, v) =>
    editLevels((L) => (L[i].cols[j].drawers[k].nl = v === "" ? null : Number(v)));

  // rozdziela pasmo proporcjonalnie do wysokosci bokow, startujac od minimow
  const fitFronts = (i, j) => {
    const lv = geo.levels[i];
    if (!lv) return;
    const ds = cab.levels[i].cols[j].drawers || [];
    const n = ds.length;
    if (!n) return;
    const band = Math.round(lv.frontHi - lv.frontLo);
    const avail = band - (n - 1) * cab.gaps.between;
    const mins = ds.map((d) => VBOX.minFront[cab.frontMode][Number(d.h)] ?? 0);
    const base = mins.reduce((a, b) => a + b, 0);
    let sizes;
    if (avail <= base) {
      sizes = mins.slice();
    } else {
      const wsum = ds.reduce((a, d) => a + Number(d.h), 0);
      const left = avail - base;
      sizes = ds.map((d, k) => mins[k] + Math.floor((left * Number(d.h)) / wsum));
      let rem = avail - sizes.reduce((a, b) => a + b, 0);
      for (let k = 0; rem > 0; k = (k + 1) % n) {
        sizes[k] += 1;
        rem -= 1;
      }
    }
    editLevels((L) => L[i].cols[j].drawers.forEach((d, k) => (d.front = sizes[k])));
  };

  const clearColOpenings = (i, j) =>
    editLevels((L) => (L[i].cols[j].shelfTargets = L[i].cols[j].shelfTargets.map(() => null)));
  // liczba polek = liczba swiatel minus 1, wiec dodanie polki to dodanie swiatla
  const addShelf = (i, j) =>
    editLevels((L) => L[i].cols[j].shelfTargets.push(null));
  // usuwa polke przy wskazanym swietle — dwa swiatla lacza sie w jedno
  const removeShelfAt = (i, j, k) =>
    editLevels((L) => {
      const st = L[i].cols[j].shelfTargets;
      if (st.length > 1) st.splice(k, 1);
    });

  const toggleEdge = (name, key, cur) =>
    set({
      edgeOverrides: {
        ...(cab.edgeOverrides || {}),
        [name]: { ...((cab.edgeOverrides || {})[name] || {}), [key]: !cur },
      },
    });

  const cutList = useMemo(() => {
    const map = new Map();
    geo.panels.forEach((p) => {
      const e = p.edges;
      const key = [p.matKey, p.a, p.b, e.a1, e.a2, e.b1, e.b2, p.name].join("|");
      if (map.has(key)) map.get(key).qty += p.qty;
      else map.set(key, { ...p });
    });
    return [...map.values()];
  }, [geo.panels]);

  const edgeMeters = useMemo(() => {
    let mm = 0;
    cutList.forEach((p) => {
      const e = p.edges;
      mm += p.qty * ((e.a1 ? p.a : 0) + (e.a2 ? p.a : 0) + (e.b1 ? p.b : 0) + (e.b2 ? p.b : 0));
    });
    return mm / 1000;
  }, [cutList]);

  const boardArea = useMemo(() => {
    const by = {};
    cutList.forEach((p) => (by[p.matKey] = (by[p.matKey] || 0) + (p.qty * p.a * p.b) / 1e6));
    return by;
  }, [cutList]);

  const errors = geo.msgs.filter((m) => m.level === "error");
  const warns = geo.msgs.filter((m) => m.level === "warn");
  const infos = geo.msgs.filter((m) => m.level === "info");
  const notesRef = useRef(null);
  const scrollToNotes = () =>
    notesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const EdgeChips = ({ p }) => (
    <div className="flex flex-wrap gap-1">
      {[["a1", "przód", p.a], ["a2", "tył", p.a], ["b1", "bok", p.b], ["b2", "bok", p.b]].map(
        ([k, lab, val]) => (
          <MiniBtn key={k} tone={p.edges[k] ? "on" : "plain"}
            onClick={() => toggleEdge(p.name, k, p.edges[k])}
            title={p.edges[k] ? "Oklejona — kliknij, aby wyłączyć" : "Bez obrzeża — kliknij, aby okleić"}>
            <span className="font-mono">{lab} {fmt(val)}</span>
          </MiniBtn>
        )
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-300 bg-stone-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <input value={cab.name} onChange={(e) => set({ name: e.target.value })}
            className="min-w-0 flex-1 border-b border-transparent bg-transparent text-lg font-semibold tracking-tight focus:border-teal-700 focus:outline-none" />
          <span className="font-mono text-xs text-stone-400">{saved}</span>
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!histLen.undo}
              title="Cofnij (Ctrl+Z)"
              className="rounded px-2 py-1 text-xs font-medium disabled:opacity-30 enabled:hover:bg-stone-200">
              ↶ Cofnij
            </button>
            <button onClick={redo} disabled={!histLen.redo}
              title="Ponów (Ctrl+Shift+Z)"
              className="rounded px-2 py-1 text-xs font-medium disabled:opacity-30 enabled:hover:bg-stone-200">
              Ponów ↷
            </button>
          </div>
          <button onClick={exportProject}
            className="text-xs text-teal-700 hover:underline">Kopiuj projekt</button>
          <button onClick={() => setTransfer({ mode: "import", text: "" })}
            className="text-xs text-teal-700 hover:underline">Wklej projekt</button>
          <label className="cursor-pointer text-xs text-teal-700 hover:underline">
            Wczytaj plik
            <input type="file" accept="application/json,.json,.txt" className="hidden"
              onChange={importProject} />
          </label>
          <button onClick={() => {
              if (window.confirm("Zacząć nowy projekt? Bieżący zostanie wyczyszczony — można go cofnąć przyciskiem Cofnij.")) {
                setCab(defaultCab); setMat(defaultMaterials); setSaved("nowy projekt");
              }
            }}
            className="text-xs text-stone-500 hover:text-stone-800 hover:underline">Nowy projekt</button>
          {errors.length > 0 && (
            <button onClick={scrollToNotes} title="Przejdź do uwag"
              className="rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-95"
              style={{ background: "#fee2e2", color: ERRC }}>
              {errors.length} błąd{errors.length > 1 ? "y" : ""}
            </button>
          )}
          {warns.length > 0 && (
            <button onClick={scrollToNotes} title="Przejdź do uwag"
              className="rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-95"
              style={{ background: "#fef3c7", color: WARNC }}>
              {warns.length} ostrzeżeń
            </button>
          )}
          {infos.length > 0 && (
            <button onClick={scrollToNotes} title="Przejdź do podpowiedzi"
              className="rounded-full px-2.5 py-1 text-xs font-medium text-stone-600 transition hover:brightness-95"
              style={{ background: "#e7e5e4" }}>
              {infos.length} {infos.length === 1 ? "podpowiedź" : "podpowiedzi"}
            </button>
          )}
          {errors.length === 0 && warns.length === 0 && infos.length === 0 && (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">bez uwag</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl gap-4 px-4 py-4 lg:grid lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card title="Korpus">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Szerokość"><Num value={cab.W} onChange={(v) => set({ W: v })} /></Field>
              <Field label="Wysokość"><Num value={cab.H} onChange={(v) => set({ H: v })} /></Field>
              <Field label="Głębokość"><Num value={cab.D} onChange={(v) => set({ D: v })} /></Field>
            </div>
            <Field label="Złącza korpusu"
              hint={`Bok lewy ${fmt(geo.leftLen)} mm, bok prawy ${fmt(geo.rightLen)} mm. „Między" = płyta wchodzi między boki, „na boku" = płyta idzie po wierzchu boku.`}>
              <div className="space-y-2">
                {[["Wieniec", "topL", "topR", geo.topL, geo.topR],
                  ["Dno", "botL", "botR", geo.botL, geo.botR]].map(([lab, kl, kr, vl, vr]) => (
                  <div key={lab} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs text-stone-500">{lab}</span>
                    {[[kl, vl, "L"], [kr, vr, "P"]].map(([key, val, mark]) => (
                      <div key={key} className="flex flex-1 items-center gap-1">
                        <span className="text-[11px] text-stone-400">{mark}</span>
                        <div className="flex-1">
                          <Seg value={val}
                            onChange={(v) => set({ joints: { ...(cab.joints || {}), topL: geo.topL, topR: geo.topR, botL: geo.botL, botR: geo.botR, [key]: v } })}
                            options={[{ v: "between", l: "między" }, { v: "over", l: "na boku" }]} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Field>
            <Field label="Drzwi" hint={cab.frontMode === "overlay"
              ? "Zawiasy zwykłe — drzwi zamykają się na korpus."
              : "Drzwi chowają się w świetle korpusu."}>
              <Seg value={cab.frontMode} onChange={(v) => set({ frontMode: v })}
                options={[{ v: "overlay", l: "Na korpusie" }, { v: "inset", l: "Wewnątrz" }]} />
            </Field>
            <Field label="Plecy">
              <Seg value={cab.back} onChange={(v) => set({ back: v })}
                options={[{ v: "hdf", l: "HDF" }, { v: "board", l: "Płyta" }, { v: "none", l: "Brak" }]} />
            </Field>
            {cab.back === "hdf" && (
              <Field label="Montaż pleców" hint={geo.grooved
                ? "Plecy chowają się we frezie, tył korpusu dolega do ściany."
                : "Plecy przybijane od tyłu, luz 1 mm z każdej strony."}>
                <Seg value={geo.grooved ? "groove" : "nail"}
                  onChange={(v) => set({ backGroove: { ...(cab.backGroove || {}), on: v === "groove" } })}
                  options={[{ v: "nail", l: "Przybijane" }, { v: "groove", l: "We frezie" }]} />
              </Field>
            )}
            {geo.grooved && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Odsunięcie" hint="od tyłu">
                  <Num value={geo.grOff}
                    onChange={(v) => set({ backGroove: { ...(cab.backGroove || {}), offset: v } })} suffix="" />
                </Field>
                <Field label="Głębokość" hint="frezu">
                  <Num value={geo.grDep}
                    onChange={(v) => set({ backGroove: { ...(cab.backGroove || {}), depth: v } })} suffix="" />
                </Field>
                <Field label="Luz" hint="we frezie">
                  <Num value={geo.grPlay}
                    onChange={(v) => set({ backGroove: { ...(cab.backGroove || {}), play: v } })} suffix="" />
                </Field>
              </div>
            )}
            {cab.back === "board" && (
              <>
                <Field label="Pozycja pleców" hint={cab.backPos === "outside"
                  ? "Płyta na całej tylnej płaszczyźnie, przykrywa boki."
                  : "Płyta wsunięta między boki, wieniec i dno."}>
                  <Seg value={cab.backPos === "outside" ? "outside" : "inside"}
                    onChange={(v) => set({ backPos: v })}
                    options={[{ v: "inside", l: "Wewnątrz" }, { v: "outside", l: "Na zewnątrz" }]} />
                </Field>
                {cab.backPos === "outside" && (
                  <Field label="Materiał pleców" hint="wewnątrz zawsze z płyty półek">
                    <Seg value={cab.backBoardMat === "shelf" ? "shelf" : "board"}
                      onChange={(v) => set({ backBoardMat: v })}
                      options={[{ v: "board", l: "Jak korpus" }, { v: "shelf", l: "Jak półki" }]} />
                  </Field>
                )}
              </>
            )}
            {cab.back !== "none" && !geo.grooved && (
              <Check checked={cab.depthIncludesBack} onChange={(v) => set({ depthIncludesBack: v })}
                label="Podana głębokość zawiera plecy" />
            )}
            {cab.frontMode === "overlay" && (
              <Check checked={!!cab.depthIncludesFront} onChange={(v) => set({ depthIncludesFront: v })}
                label="Podana głębokość zawiera drzwi (front nakładany wystaje przed korpus)" />
            )}
          </Card>

          <Card title="Struktura wnętrza"
            right={<MiniBtn onClick={addLevel}>+ poziom</MiniBtn>}>
            <p className="text-xs text-stone-500">
              Poziomy rozdziela półka na całą szerokość. W poziomie możesz postawić przegrodę
              i podzielić go na kolumny. Puste pole wymiaru znaczy „podziel resztę równo".
            </p>

            {[...geo.levels].reverse().map((lv) => (
              <div key={lv.i} className="rounded border border-stone-200 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-medium text-stone-700">
                    Poziom {lv.i + 1}
                  </span>
                  <AutoNum value={cab.levels[lv.i].h} placeholder={fmt(lv.h)} fixed={lv.fixed}
                    onChange={(v) => setLevelH(lv.i, v)} />
                  <span className="w-12 shrink-0 text-right font-mono text-xs"
                    style={{ color: lv.h < 60 ? WARNC : "#78716c" }}>{fmt(lv.h)}</span>
                  {lv.fixed && (
                    <MiniBtn onClick={() => setLevelH(lv.i, "")} title="Wróć do równego podziału">×</MiniBtn>
                  )}
                  {geo.levels.length > 1 && (
                    <MiniBtn onClick={() => removeLevel(lv.i)} title="Usuń poziom">usuń</MiniBtn>
                  )}
                </div>

                <div className="space-y-2 pl-2 border-l-2 border-stone-100">
                  {lv.cols.map((c) => {
                    const rawCol = cab.levels[lv.i].cols[c.j];
                    const nS = (rawCol.shelfTargets || [null]).length - 1;
                    return (
                      <div key={c.j} className="rounded bg-stone-50 p-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-20 shrink-0 text-xs text-stone-500">
                            Kolumna {c.j + 1}
                          </span>
                          <AutoNum value={rawCol.w} placeholder={fmt(c.w)} fixed={c.fixed}
                            warn={c.w < MIN_COL} onChange={(v) => setColW(lv.i, c.j, v)} />
                          <span className="w-12 shrink-0 text-right font-mono text-xs"
                            style={{ color: c.w < MIN_COL ? WARNC : "#78716c" }}>{fmt(c.w)}</span>
                          {lv.cols.length > 1 && (
                            <MiniBtn onClick={() => removeCol(lv.i, c.j)} title="Usuń kolumnę">×</MiniBtn>
                          )}
                        </div>

                        <Seg value={c.kind}
                          onChange={(v) => setColKind(lv.i, c.j, v)}
                          options={[
                            { v: "doors", l: "Półki i drzwi" },
                            { v: "drawers", l: "Szuflady" },
                            { v: "blenda", l: "Blenda" },
                          ]} />

                        {c.kind === "blenda" && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-16 shrink-0 text-stone-500">montaż</span>
                            <div className="flex-1">
                              <Seg value={rawCol.blendaMode === "inset" ? "inset" : "overlay"}
                                onChange={(v) => setBlendaMode(lv.i, c.j, v)}
                                options={[
                                  { v: "overlay", l: "Na korpusie" },
                                  { v: "inset", l: "W obrysie" },
                                ]} />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 rounded border border-stone-200 bg-white p-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-16 shrink-0 text-stone-500">fix</span>
                            <div className="flex-1">
                              <Seg value={(rawCol.fix || {}).side || "none"}
                                onChange={(v) => setFixSide(lv.i, c.j, v)}
                                options={[
                                  { v: "none", l: "brak" },
                                  { v: "left", l: "lewa" },
                                  { v: "right", l: "prawa" },
                                ]} />
                            </div>
                          </div>
                          {((rawCol.fix || {}).side || "none") !== "none" && (
                            <>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-16 shrink-0 text-stone-500">montaż</span>
                                <div className="flex-1">
                                  <Seg value={(rawCol.fix || {}).mode === "inset" ? "inset" : "overlay"}
                                    onChange={(v) => setFixMode(lv.i, c.j, v)}
                                    options={[
                                      { v: "overlay", l: "Na korpusie" },
                                      { v: "inset", l: "W obrysie" },
                                    ]} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-16 shrink-0 text-stone-500">szerokość</span>
                                <input type="number" min={0} step={1} value={(rawCol.fix || {}).w ?? 60}
                                  onChange={(e) => setFixW(lv.i, c.j, e.target.value)}
                                  className="w-20 rounded border border-stone-300 bg-white px-1.5 py-1 font-mono text-xs focus:border-teal-600 focus:outline-none" />
                                <span className="text-stone-400">mm</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={!!(rawCol.fix || {}).support}
                                    onChange={(e) => setFixSupport(lv.i, c.j, e.target.checked)}
                                    className="h-3.5 w-3.5 accent-teal-700" />
                                  <span className="text-stone-600">wspornik pionowy</span>
                                </label>
                                {(rawCol.fix || {}).support && (
                                  <>
                                    <input type="number" min={0} step={1}
                                      value={(rawCol.fix || {}).supportDepth ?? 100}
                                      onChange={(e) => setFixSupportDepth(lv.i, c.j, e.target.value)}
                                      className="w-20 rounded border border-stone-300 bg-white px-1.5 py-1 font-mono text-xs focus:border-teal-600 focus:outline-none" />
                                    <span className="text-stone-400">mm głęb.</span>
                                  </>
                                )}
                              </div>
                              {c.kind === "doors" && rawCol.doors === 1 && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-16 shrink-0 text-stone-500">zawiasy</span>
                                  <div className="flex-1">
                                    <Seg value={rawCol.hinge === "left" || rawCol.hinge === "right" ? rawCol.hinge : "auto"}
                                      onChange={(v) => setHinge(lv.i, c.j, v)}
                                      options={[
                                        { v: "auto", l: "auto" },
                                        { v: "left", l: "lewe" },
                                        { v: "right", l: "prawe" },
                                      ]} />
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {c.kind === "blenda" && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-stone-500">półki</span>
                            <input type="number" min={0} step={1} value={nS}
                              onChange={(e) => setColShelfCount(lv.i, c.j, e.target.value)}
                              className="w-14 rounded border border-stone-300 bg-white px-1.5 py-1 font-mono text-xs focus:border-teal-600 focus:outline-none" />
                          </div>
                        )}

                        {c.kind === "doors" && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-stone-500">drzwi</span>
                            <input type="number" min={0} step={1} value={rawCol.doors}
                              onChange={(e) => setColDoors(lv.i, c.j, e.target.value)}
                              className="w-14 rounded border border-stone-300 bg-white px-1.5 py-1 font-mono text-xs focus:border-teal-600 focus:outline-none" />
                            <span className="text-stone-500">półki</span>
                            <input type="number" min={0} step={1} value={nS}
                              onChange={(e) => setColShelfCount(lv.i, c.j, e.target.value)}
                              className="w-14 rounded border border-stone-300 bg-white px-1.5 py-1 font-mono text-xs focus:border-teal-600 focus:outline-none" />
                            {c.count > 0 && (
                              <span className="ml-auto font-mono text-stone-500">
                                {fmt(c.doorH)} wys.
                              </span>
                            )}
                          </div>
                        )}

                        {c.kind === "doors" && rawCol.doors > 0 && (
                          <div className="space-y-1">
                            {(c.doorWs || []).map((w, k) => (
                              <div key={k} className="flex items-center gap-2">
                                <span className="w-20 shrink-0 text-[11px] text-stone-400">
                                  drzwi {k + 1}
                                </span>
                                <AutoNum value={(rawCol.doorWidths || [])[k]} placeholder={fmt(w)}
                                  fixed={num((rawCol.doorWidths || [])[k]) !== null}
                                  onChange={(v) => setDoorWidth(lv.i, c.j, k, v)} />
                                <label className="flex shrink-0 items-center gap-1 cursor-pointer"
                                  title="Lustro na tych drzwiach">
                                  <input type="checkbox"
                                    checked={!!(rawCol.mirrors || [])[k]}
                                    onChange={(e) => setDoorFlag(lv.i, c.j, k, "mirrors", e.target.checked)}
                                    className="h-3.5 w-3.5 accent-teal-700" />
                                  <span className="text-[11px] text-stone-500">lustro</span>
                                </label>
                                <label className="flex shrink-0 items-center gap-1 cursor-pointer"
                                  title="Uchwyt na tych drzwiach">
                                  <input type="checkbox"
                                    checked={(rawCol.handles || [])[k] !== false}
                                    onChange={(e) => setDoorFlag(lv.i, c.j, k, "handles", e.target.checked)}
                                    className="h-3.5 w-3.5 accent-teal-700" />
                                  <span className="text-[11px] text-stone-500">uchwyt</span>
                                </label>
                                <input type="number" min={0} step={1}
                                  title="Liczba zawiasów — puste liczy automatycznie"
                                  value={(rawCol.hinges || [])[k] ?? ""}
                                  placeholder={String((c.doors[k] || {}).hinges ?? 2)}
                                  onChange={(e) => setDoorFlag(lv.i, c.j, k, "hinges",
                                    e.target.value === "" ? null : Math.round(Number(e.target.value)))}
                                  className="w-12 shrink-0 rounded border border-stone-300 bg-white px-1 py-1 font-mono text-[11px] focus:border-teal-600 focus:outline-none" />
                                <span className="shrink-0 text-[11px] text-stone-400">zaw.</span>
                              </div>
                            ))}
                            {rawCol.doors > 1 && (
                              <button onClick={() => clearDoorWidths(lv.i, c.j)}
                                className="text-[11px] text-teal-700 hover:underline">
                                równe szerokości
                              </button>
                            )}
                            {rawCol.doors > 1 && (
                              <div className="flex items-center gap-2 pt-1">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox"
                                    checked={num(rawCol.gapBetween) !== null}
                                    onChange={(e) => editLevels((L) =>
                                      (L[lv.i].cols[c.j].gapBetween = e.target.checked ? (c.gapBetween ?? cab.gaps.between) : null))}
                                    className="h-3.5 w-3.5 accent-teal-700" />
                                  <span className="text-[11px] text-stone-600">własny luz między drzwiami</span>
                                </label>
                                {num(rawCol.gapBetween) !== null && (
                                  <>
                                    <input type="number" min={0} step={1}
                                      value={rawCol.gapBetween}
                                      onChange={(e) => editLevels((L) =>
                                        (L[lv.i].cols[c.j].gapBetween = e.target.value === "" ? 0 : Math.round(Number(e.target.value))))}
                                      className="w-14 rounded border border-stone-300 bg-white px-1.5 py-1 font-mono text-[11px] focus:border-teal-600 focus:outline-none" />
                                    <span className="text-[11px] text-stone-400">mm</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-16 shrink-0 text-stone-500">plecy</span>
                          <div className="flex-1">
                            <Seg value={rawCol.backMode || "inherit"}
                              onChange={(v) => setColBack(lv.i, c.j, v)}
                              options={[
                                { v: "inherit", l: "jak szafka" },
                                { v: "hdf", l: "HDF" },
                                { v: "board", l: "płyta" },
                                { v: "none", l: "brak" },
                              ]} />
                          </div>
                        </div>

                        {c.kind === "drawers" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-stone-500">głębokość NL</span>
                              <select value={rawCol.nl ?? ""}
                                onChange={(e) => setColNL(lv.i, c.j, e.target.value)}
                                className="rounded border border-stone-300 bg-white px-1.5 py-1 font-mono text-xs focus:border-teal-600 focus:outline-none">
                                <option value="">auto {geo.maxNL ? `(${geo.maxNL})` : ""}</option>
                                {VBOX.nl.map((v) => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                              <MiniBtn onClick={() => addDrawer(lv.i, c.j)}>+ szuflada</MiniBtn>
                              <MiniBtn onClick={() => fitFronts(lv.i, c.j)}
                                title="Rozdziel pasmo proporcjonalnie do wysokości boków">
                                dopasuj fronty
                              </MiniBtn>
                            </div>
                            {[...(c.drawers || [])].reverse().map((dr) => (
                              <div key={dr.i} className="flex items-center gap-2">
                                <select value={rawCol.drawers[dr.i]?.h ?? "auto"}
                                  title="Wysokość boku V-BOX — auto dobiera najwyższy mieszczący się w froncie"
                                  onChange={(e) => setDrawerH(lv.i, c.j, dr.i, e.target.value)}
                                  className="rounded border border-stone-300 bg-white px-1.5 py-1 font-mono text-[11px] focus:border-teal-600 focus:outline-none">
                                  <option value="auto">auto {dr.hClass}</option>
                                  {VBOX.heights.map((v) => (
                                    <option key={v} value={v}>{v} mm</option>
                                  ))}
                                </select>
                                <AutoNum value={rawCol.drawers[dr.i]?.front} placeholder={fmt(dr.h)}
                                  fixed={dr.fixed} warn={dr.h < VBOX.minFront[cab.frontMode][dr.hClass]}
                                  onChange={(v) => setDrawerFront(lv.i, c.j, dr.i, v)} />
                                <span className="w-12 shrink-0 text-right font-mono text-[11px]"
                                  style={{ color: dr.h < VBOX.minFront[cab.frontMode][dr.hClass] ? ERRC : "#a8a29e" }}>
                                  {fmt(dr.h)}
                                </span>
                                <label className="flex shrink-0 items-center gap-1 cursor-pointer"
                                  title="Uchwyt na tym froncie">
                                  <input type="checkbox"
                                    checked={rawCol.drawers[dr.i]?.handle !== false}
                                    onChange={(e) => setDrawerHandle(lv.i, c.j, dr.i, e.target.checked)}
                                    className="h-3.5 w-3.5 accent-teal-700" />
                                  <span className="text-[11px] text-stone-500">uchwyt</span>
                                </label>
                                <select value={rawCol.drawers[dr.i]?.nl ?? ""}
                                  title="Głębokość NL tej szuflady — puste bierze głębokość kolumny"
                                  onChange={(e) => setDrawerNL(lv.i, c.j, dr.i, e.target.value)}
                                  className="shrink-0 rounded border border-stone-300 bg-white px-1 py-1 font-mono text-[11px] focus:border-teal-600 focus:outline-none">
                                  <option value="">NL {c.nl ?? "auto"}</option>
                                  {VBOX.nl.map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                  ))}
                                </select>
                                {(c.drawers || []).length > 1 && (
                                  <MiniBtn onClick={() => removeDrawer(lv.i, c.j, dr.i)} title="Usuń szufladę">×</MiniBtn>
                                )}
                              </div>
                            ))}
                            <p className="text-[11px] text-stone-400">
                              Lewe pole to wysokość boku V-BOX, prawe to wysokość frontu.
                              Puste = podziel pasmo równo.
                            </p>
                          </div>
                        )}

                        {c.kind !== "drawers" && nS > 0 && (
                          <div className="space-y-1">
                            {[...c.openings].reverse().map((o) => (
                              <div key={o.k} className="flex items-center gap-2">
                                <span className="w-20 shrink-0 text-[11px] text-stone-400">
                                  światło {o.k + 1}
                                </span>
                                <AutoNum value={rawCol.shelfTargets[o.k]} placeholder={fmt(o.h)}
                                  fixed={o.fixed} warn={o.h > 0 && o.h < 50}
                                  onChange={(v) => setColOpening(lv.i, c.j, o.k, v)} />
                                <span className="w-12 shrink-0 text-right font-mono text-[11px]"
                                  style={{ color: o.h > 0 && o.h < 50 ? WARNC : "#a8a29e" }}>{fmt(o.h)}</span>
                                {c.openings.length > 1 && (
                                  <MiniBtn onClick={() => removeShelfAt(lv.i, c.j, o.k)}
                                    title="Usuń półkę przy tym świetle">×</MiniBtn>
                                )}
                              </div>
                            ))}
                            <div className="flex items-center gap-2 pt-1">
                              <MiniBtn onClick={() => addShelf(lv.i, c.j)} tone="accent">+ półka</MiniBtn>
                              <button onClick={() => clearColOpenings(lv.i, c.j)}
                                className="text-[11px] text-teal-700 hover:underline">wszystkie równo</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <MiniBtn onClick={() => addCol(lv.i)}>+ przegroda i kolumna</MiniBtn>
                </div>
              </div>
            ))}
          </Card>

          <Card title="Luzy drzwi">
            <div className="grid grid-cols-2 gap-3">
              {cab.frontMode === "overlay" ? (
                <>
                  <Field label="Od krawędzi korpusu"><Num value={cab.gaps.edge} onChange={(v) => setGap("edge", v)} /></Field>
                  <Field label="Między drzwiami"><Num value={cab.gaps.between} onChange={(v) => setGap("between", v)} /></Field>
                  <Field label="U góry"><Num value={cab.gaps.top} onChange={(v) => setGap("top", v)} /></Field>
                  <Field label="U dołu"><Num value={cab.gaps.bottom} onChange={(v) => setGap("bottom", v)} /></Field>
                </>
              ) : (
                <>
                  <Field label="Dookoła drzwi"><Num value={cab.gaps.inset} onChange={(v) => setGap("inset", v)} /></Field>
                  <Field label="Między drzwiami"><Num value={cab.gaps.between} onChange={(v) => setGap("between", v)} /></Field>
                </>
              )}
              {cab.frontMode === "overlay" && (
                <Field label="Nałożenie na przegrodę"
                  hint={`Szczelina nad przegrodą: ${fmt(mat.board.thickness - 2 * (cab.gaps.divOverlay ?? 8))} mm`}>
                  <Num value={cab.gaps.divOverlay ?? 8} onChange={(v) => setGap("divOverlay", v)} />
                </Field>
              )}
              <Field label="Ostrzegaj powyżej"><Num value={cab.maxGap} onChange={(v) => set({ maxGap: v })} /></Field>
              <Field label="Kąt otwarcia" hint="do widoku 3D">
                <Num value={cab.openAngle ?? 90} onChange={(v) => set({ openAngle: v })} suffix="°" />
              </Field>
              <Field label="Dodatkowe cofnięcie półki"
                hint={cab.frontMode === "inset"
                  ? `Drzwi wewnątrz — półka jest już krótsza o ${fmt(mat.front.thickness + 5)} mm.`
                  : "Drzwi na korpusie — półka na pełną głębokość."}>
                <Num value={cab.shelfExtraSetback || 0} onChange={(v) => set({ shelfExtraSetback: v })} />
              </Field>
            </div>
          </Card>

          <Card title="Wycięcie w narożniku">
            <Check checked={!!cab.cutout?.on}
              onChange={(v) => set({ cutout: { ...(cab.cutout || {}), on: v } })}
              label="Wytnij narożnik (np. na rurę)" />
            {cab.cutout?.on && (
              <>
                <Field label="Narożnik">
                  <Seg value={cab.cutout.corner || "backRight"}
                    onChange={(v) => set({ cutout: { ...cab.cutout, corner: v } })}
                    options={[
                      { v: "backLeft", l: "Tylny lewy" },
                      { v: "backRight", l: "Tylny prawy" },
                    ]} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Szerokość od boku">
                    <Num value={cab.cutout.w ?? 100}
                      onChange={(v) => set({ cutout: { ...cab.cutout, w: v } })} />
                  </Field>
                  <Field label="Głębokość od tyłu">
                    <Num value={cab.cutout.d ?? 100}
                      onChange={(v) => set({ cutout: { ...cab.cutout, d: v } })} />
                  </Field>
                </div>
                {geo.levels.length > 1 && (
                  <>
                    <Check checked={cab.cutout.fullHeight !== false}
                      onChange={(v) => set({ cutout: { ...cab.cutout, fullHeight: v } })}
                      label="Wycięcie przez całą wysokość szafki" />
                    {cab.cutout.fullHeight === false && (
                      <Field label="Poziom z wycięciem">
                        <Seg value={String(cab.cutout.levelIndex || 0)}
                          onChange={(v) => set({ cutout: { ...cab.cutout, levelIndex: Number(v) } })}
                          options={geo.levels.map((lv) => ({ v: String(lv.i), l: `Poziom ${lv.i + 1}` }))} />
                      </Field>
                    )}
                  </>
                )}
                <Check checked={cab.cutout.mask !== false}
                  onChange={(v) => set({ cutout: { ...cab.cutout, mask: v } })}
                  label="Zabuduj otwór maskownicą" />
                {cab.cutout.mask !== false && (
                  <>
                    <Field label="Który bok widoczny" hint="wycięcie narożnika zawsze zabudowuje się w L — jeden bok musi zachodzić na drugi">
                      <Seg value={cab.cutout.maskCorner === "horizontal" ? "horizontal" : "vertical"}
                        onChange={(v) => set({ cutout: { ...cab.cutout, maskCorner: v } })}
                        options={[
                          { v: "auto", l: "Auto" },
                          { v: "vertical", l: "Boczna" },
                          { v: "horizontal", l: "Czołowa" },
                        ]} />
                    </Field>
                    {geo.geoCut?.maskVisible && (
                      <p className="text-xs text-stone-500">
                        Widoczna ścianka: {geo.geoCut.maskVisible === "vertical" ? "boczna" : "czołowa"}.
                      </p>
                    )}
                  </>
                )}
                <p className="text-xs text-stone-500">
                  Formatki korpusu do zamówienia zostają pełnymi prostokątami — wycięcie
                  robisz sam. Zabudowa jest liczona z płyty półek.
                </p>
              </>
            )}
          </Card>

          <Card title="Elementy kolizyjne"
            right={<MiniBtn onClick={addObstacle} tone="accent">+ element</MiniBtn>}>
            {obsList.length === 0 && (
              <p className="text-sm text-stone-400">
                Brak przeszkód. Dodaj element, jeśli w szafce przebiega rura albo kanał wentylacyjny.
              </p>
            )}
            {obsList.map((ob, oi) => {
              const g = (geo.geoObs || [])[oi];
              return (
                <div key={oi} className="space-y-3 rounded border border-stone-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600">
                      {obsList.length > 1 ? `Element ${oi + 1}` : "Element kolizyjny"}
                    </span>
                    <MiniBtn onClick={() => removeObstacle(oi)} title="Usuń element">×</MiniBtn>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Szerokość">
                      <Num value={ob.w ?? 80} onChange={(v) => setObstacle(oi, { w: v })} />
                    </Field>
                    <Field label="Głębokość">
                      <Num value={ob.d ?? 80} onChange={(v) => setObstacle(oi, { d: v })} />
                    </Field>
                  </div>
                  <Field label="Liczone od boku">
                    <Seg value={ob.side === "left" ? "left" : "right"}
                      onChange={(v) => setObstacle(oi, { side: v })}
                      options={[{ v: "left", l: "Od lewej" }, { v: "right", l: "Od prawej" }]} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={ob.side === "left" ? "Od lewego boku" : "Od prawego boku"}
                      hint="od zewnętrznej krawędzi szafki">
                      <Num value={ob.fromSide ?? 0} onChange={(v) => setObstacle(oi, { fromSide: v })} />
                    </Field>
                    <Field label="Od tyłu" hint="od tylnej płaszczyzny">
                      <Num value={ob.fromBack ?? 0} onChange={(v) => setObstacle(oi, { fromBack: v })} />
                    </Field>
                  </div>
                  {g && (
                    <div className="rounded bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600">
                      od lewej: {fmt(g.distLeft)} mm &nbsp;·&nbsp; od prawej: {fmt(g.distRight)} mm
                    </div>
                  )}
                  <Check checked={ob.fullHeight !== false}
                    onChange={(v) => setObstacle(oi, { fullHeight: v })}
                    label="Na całą wysokość szafki" />
                  {ob.fullHeight === false && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Od dna">
                        <Num value={ob.fromBottom ?? 0} onChange={(v) => setObstacle(oi, { fromBottom: v })} />
                      </Field>
                      <Field label="Wysokość bryły">
                        <Num value={ob.h ?? 0} onChange={(v) => setObstacle(oi, { h: v })} />
                      </Field>
                    </div>
                  )}
                  <Check checked={!!ob.mask} onChange={(v) => setObstacle(oi, { mask: v })}
                    label="Zabuduj element (odgrodź od wnętrza)" />
                  {ob.mask && (
                    <>
                      <Field label="Typ zabudowy" hint={g?.maskChosen
                        ? `Program wybrał: ${g.maskChosen === "U" ? "U (trzy ścianki)" : "L (dwie ścianki)"}`
                        : "Auto dobiera L w narożniku, U przy ścianie lub w środku."}>
                        <Seg value={ob.maskType || "auto"}
                          onChange={(v) => setObstacle(oi, { maskType: v })}
                          options={[{ v: "auto", l: "Auto" }, { v: "L", l: "L" }, { v: "U", l: "U" }]} />
                      </Field>
                      {g?.shelfAbove != null && (
                        <>
                          <Check checked={!!ob.maskToShelf}
                            onChange={(v) => setObstacle(oi, { maskToShelf: v })}
                            label={`Zabudowa tylko do półki (${fmt(g.shelfAbove)} mm)`} />
                          {ob.maskToShelf && (
                            <Field label="Wysokość zabudowy"
                              hint="puste = do półki; wpisz, jeśli ma być inna">
                              <Num value={ob.maskH ?? ""} placeholder={String(Math.round(g.shelfAbove - (g.oy0 ?? 0)))}
                                onChange={(v) => setObstacle(oi, { maskH: v })} />
                            </Field>
                          )}
                        </>
                      )}
                      {g?.maskChosen === "U" && (
                        <Field label="Montaż czoła">
                          <Seg value={ob.maskFront === "between" ? "between" : "over"}
                            onChange={(v) => setObstacle(oi, { maskFront: v })}
                            options={[{ v: "over", l: "Przed bokami" }, { v: "between", l: "Między bokami" }]} />
                        </Field>
                      )}
                      {g?.maskChosen === "L" && (
                        <Field label="Który bok widoczny" hint="jeden bok musi zachodzić na drugi">
                          <Seg value={ob.maskCorner === "horizontal" ? "horizontal" : "vertical"}
                            onChange={(v) => setObstacle(oi, { maskCorner: v })}
                            options={[{ v: "vertical", l: "Boczna" }, { v: "horizontal", l: "Czołowa" }]} />
                        </Field>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-stone-500">
              Odległości liczone od zewnętrznych krawędzi szafki, tak samo jak przy wycięciu
              narożnika. Przy 0 i 0 bryła siada w narożniku i skraca bok oraz plecy dokładnie
              tak jak wycięcie.
            </p>
          </Card>

          <Card title="Cokół i wzmocnienie">
            <Check checked={cab.plinth.on} onChange={(v) => set({ plinth: { ...cab.plinth, on: v } })} label="Cokół" />
            {cab.plinth.on && (
              <div className="space-y-3">
                <Field label="Montaż" hint={!(geo.botL === "between" && geo.botR === "between")
                  ? "Cokół pod dnem wymaga dna między bokami."
                  : geo.plinthInBody
                  ? "Boki schodzą do podłogi, dno siedzi na cokole. Oklejana krawędź dolna."
                  : "Cały korpus stoi na cokole."}>
                  <Seg value={geo.pMode} onChange={(v) => set({ plinth: { ...cab.plinth, mode: v } })}
                    options={[{ v: "inbody", l: "Pod dnem, w obrysie" }, { v: "under", l: "Pod korpusem" }]} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Wysokość">
                    <Num value={cab.plinth.height} onChange={(v) => set({ plinth: { ...cab.plinth, height: v } })} />
                  </Field>
                  <Field label="Cofnięcie w głąb" hint="0 = równo z przodem">
                    <Num value={cab.plinth.setback || 0} onChange={(v) => set({ plinth: { ...cab.plinth, setback: v } })} />
                  </Field>
                </div>
              </div>
            )}
            <div className="border-t border-stone-100 pt-3">
              <Check checked={!!cab.legs?.on}
                onChange={(v) => set({ legs: { ...(cab.legs || { height: 100 }), on: v } })}
                label="Nóżki pod szafką" />
            </div>
            {cab.legs?.on && (
              <Field label="Wysokość nóżki"
                hint={`Całkowita wysokość z podstawą: ${fmt(cab.H + Math.max(cab.legs.height || 100, cab.plinth.on && !geo.plinthInBody ? geo.plinthH : 0))} mm`}>
                <Num value={cab.legs.height ?? 100}
                  onChange={(v) => set({ legs: { ...cab.legs, height: v } })} />
              </Field>
            )}
            <div className="border-t border-stone-100 pt-3">
              <Check checked={cab.rail.on} onChange={(v) => set({ rail: { ...cab.rail, on: v } })}
                label="Element wzmacniający" />
            </div>
            {cab.rail.on && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Szerokość elementu">
                  <Num value={cab.rail.height} onChange={(v) => set({ rail: { ...cab.rail, height: v } })} />
                </Field>
                <Field label="Położenie">
                  <Seg value={cab.rail.pos} onChange={(v) => set({ rail: { ...cab.rail, pos: v } })}
                    options={[{ v: "top", l: "Góra" }, { v: "bottom", l: "Dół" }]} />
                </Field>
                <div className="col-span-2">
                  <Check checked={cab.rail.upright} onChange={(v) => set({ rail: { ...cab.rail, upright: v } })}
                    label="Obrócony do pionu (na sztorc)" />
                </div>
              </div>
            )}
          </Card>

          <Card title="Płyty">
            <Check checked={cab.frontSameAsBoard !== false}
              onChange={(v) => set({ frontSameAsBoard: v })}
              label="Fronty z tej samej płyty co korpus" />
            <Check checked={cab.shelfSameAsBoard !== false}
              onChange={(v) => set({ shelfSameAsBoard: v })}
              label="Półki z tej samej płyty co korpus" />
            {[
              "board",
              ...(cab.frontSameAsBoard !== false ? [] : ["front"]),
              ...(cab.shelfSameAsBoard !== false ? [] : ["shelf"]),
              "back",
              "mirror",
            ].map((k) => (
              <div key={k} className="space-y-2 border-t border-stone-100 pt-3 first:border-0 first:pt-0">
                <div className="flex items-end gap-2">
                <div className="flex-1">
                <Field label={
                  k === "board"
                    ? "Korpus" +
                      (cab.shelfSameAsBoard !== false ? ", półki" : "") +
                      (cab.frontSameAsBoard !== false ? " i fronty" : "")
                    : k === "front" ? "Drzwi"
                    : k === "shelf" ? "Półki"
                    : k === "back" ? "Plecy" : "Lustro"
                }>
                  <input value={mat[k].name}
                    onChange={(e) => setMat({ ...mat, [k]: { ...mat[k], name: e.target.value } })}
                    className="w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none" />
                </Field>
                </div>
                <div className="w-20">
                <Field label="Grubość">
                  <Num value={mat[k].thickness}
                    onChange={(v) => setMat({ ...mat, [k]: { ...mat[k], thickness: v } })} suffix="" />
                </Field>
                </div>
                {k === "mirror" ? (
                  <div className="h-9 w-11 rounded border border-stone-300"
                    style={{ background: mat[k].color }}
                    title="Kolor lustra jest stały" />
                ) : (
                  <input type="color" value={mat[k].color}
                    onChange={(e) => setMat({ ...mat, [k]: { ...mat[k], color: e.target.value } })}
                    className="h-9 w-11 cursor-pointer rounded border border-stone-300 bg-white" />
                )}
                </div>
                {k !== "mirror" && (
                  <div className="flex flex-wrap gap-1">
                    {PALETA.map(([nazwa, hex]) => (
                      <button key={hex} title={nazwa}
                        onClick={() => setMat({ ...mat, [k]: { ...mat[k], color: hex } })}
                        className={"h-6 w-6 rounded border transition-transform hover:scale-110 " +
                          (mat[k].color.toLowerCase() === hex.toLowerCase()
                            ? "border-teal-700 ring-1 ring-teal-700"
                            : "border-stone-300")}
                        style={{ background: hex }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Check checked={cab.grainMatters} onChange={(v) => set({ grainMatters: v })}
              label="Kierunek usłojenia ma znaczenie" />
          </Card>
        </div>

        <div className="mt-4 space-y-4 lg:mt-0">
          <Card title="Rysunek"
            right={
              <div className="flex items-center gap-3">
                <button onClick={() => setShowDims((s) => !s)} className="text-xs text-teal-700 hover:underline">
                  {showDims ? "Ukryj wymiary" : "Pokaż wymiary"}
                </button>
                {view === "closed" && (
                  <button onClick={() => setShowGaps((s) => !s)}
                    className="text-xs text-teal-700 hover:underline">
                    {showGaps ? "Ukryj szczeliny" : "Pokaż szczeliny"}
                  </button>
                )}
                <button onClick={() => set({ realColors: !cab.realColors })}
                  className="text-xs text-teal-700 hover:underline">
                  {cab.realColors ? "Rozróżnij fronty" : "Realne kolory"}
                </button>
                {view === "side" && (
                  <button onClick={() => setSideWhich((s) => (s === "left" ? "right" : "left"))}
                    className="text-xs text-teal-700 hover:underline">
                    {sideWhich === "left" ? "Pokaż prawy bok" : "Pokaż lewy bok"}
                  </button>
                )}
                {view === "top" && (
                  <button onClick={() => setShowShelves((s) => !s)}
                    className="text-xs text-teal-700 hover:underline">
                    {showShelves ? "Ukryj półki" : "Rysuj półki"}
                  </button>
                )}
                {(view === "closed" || view === "open") && (
                  <button onClick={() => setShowLabels((s) => !s)}
                    className="text-xs text-teal-700 hover:underline">
                    {showLabels ? "Ukryj oznaczenia" : "Oznacz pola"}
                  </button>
                )}
                <div className="w-80">
                  <Seg value={view} onChange={setView}
                    options={[
                      { v: "closed", l: "Zamk." },
                      { v: "open", l: "Otw." },
                      { v: "side", l: "Z boku" },
                      { v: "top", l: "Z góry" },
                      { v: "rear", l: "Z tyłu" },
                      { v: "3d", l: "3D" },
                    ]} />
                </div>
              </div>
            }>
            <div className="rounded border border-stone-100 bg-stone-50 p-3">
              {view === "3d" ? (
                <div className="space-y-3">
                  <div
                    className="cursor-grab active:cursor-grabbing touch-none"
                    onPointerDown={(e) => {
                      drag.current = { x: e.clientX, y: e.clientY, yaw, pitch };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!drag.current) return;
                      const dx = e.clientX - drag.current.x;
                      const dy = e.clientY - drag.current.y;
                      setYaw(drag.current.yaw + dx * 0.008);
                      setPitch(
                        Math.max(-1.2, Math.min(1.2, drag.current.pitch + dy * 0.006))
                      );
                    }}
                    onPointerUp={() => (drag.current = null)}
                    onPointerCancel={() => (drag.current = null)}
                  >
                    <Scene3D cab={cab} geo={geo} mat={mat} open={open3d} yaw={yaw} pitch={pitch} angle={angle3d} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <MiniBtn onClick={() => setYaw((v) => v - Math.PI / 4)}>◀ 45°</MiniBtn>
                    <MiniBtn onClick={() => { setYaw(-0.55); setPitch(0.28); }}>reset</MiniBtn>
                    <MiniBtn onClick={() => setYaw((v) => v + Math.PI / 4)}>45° ▶</MiniBtn>
                    <MiniBtn tone={open3d ? "on" : "plain"} onClick={() => setOpen3d((v) => !v)}>
                      {open3d ? "otwarte" : "zamknięte"}
                    </MiniBtn>
                    {open3d && (
                      <label className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">kąt</span>
                        <input type="range" min={0} max={110} step={1} value={angle3d}
                          onChange={(e) => setAngle3d(Number(e.target.value))}
                          className="w-32 accent-teal-700" />
                        <span className="w-10 font-mono text-xs text-stone-500">{angle3d}°</span>
                      </label>
                    )}
                    <span className="ml-auto font-mono text-xs text-stone-400">
                      przeciągnij, żeby obrócić
                    </span>
                  </div>
                </div>
              ) : view === "side" ? (
                <SideView cab={cab} geo={geo} mat={mat} showDims={showDims} which={sideWhich} />
              ) : view === "top" ? (
                <TopView cab={cab} geo={geo} mat={mat} showDims={showDims} showShelves={showShelves} />
              ) : view === "rear" ? (
                <RearView cab={cab} geo={geo} mat={mat} showDims={showDims} />
              ) : (
                <FrontView cab={cab} geo={geo} mat={mat} open={view === "open"} showDims={showDims} showGaps={showGaps} showLabels={showLabels} />
              )}
            </div>
          </Card>

          {(errors.length > 0 || warns.length > 0 || infos.length > 0) && (
            <div ref={notesRef} className="scroll-mt-24">
            <Card title="Uwagi">
              {(errors.length > 0 || warns.length > 0) && (
                <ul className="space-y-2">
                  {errors.map((m, i) => (
                    <NoteLine key={"e" + i} text={m.text} color={ERRC} icon="×" editLevels={editLevels} cab={cab} />
                  ))}
                  {warns.map((m, i) => (
                    <NoteLine key={"w" + i} text={m.text} color={WARNC} icon="!" editLevels={editLevels} cab={cab} />
                  ))}
                </ul>
              )}
              {infos.length > 0 && (
                <div className={(errors.length || warns.length) ? "border-t border-stone-100 pt-3" : ""}>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-400">
                    Podpowiedzi — nic nie trzeba poprawiać
                  </div>
                  <ul className="space-y-2">
                    {infos.map((m, i) => (
                      <NoteLine key={"i" + i} text={m.text} color="#78716c" icon="i" editLevels={editLevels} cab={cab} />
                    ))}
                  </ul>
                </div>
              )}
            </Card>
            </div>
          )}

          <Card title="Kontrola frontów">
            <p className="text-xs text-stone-500">
              Rzeczywiste położenie każdego frontu na szerokości szafki, z odstępem do
              sąsiada. Liczby są liczone z tego samego silnika co formatki.
            </p>
            {geo.levels.map((lv) => {
              const rows = geo.doors
                .filter((d) => d.lvl === lv.i && d.w > 0)
                .sort((a, b) => b.y - a.y || a.x - b.x);
              if (!rows.length) return null;
              return (
                <div key={lv.i}>
                  <div className="mb-1 text-xs font-medium text-stone-700">
                    Poziom {lv.i + 1}
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="font-mono">
                      {rows.map((d, i) => {
                        let nb = null;
                        rows.forEach((b) => {
                          if (b === d || b.x < d.x + d.w - 0.5) return;
                          const vo = Math.min(d.y + d.h, b.y + b.h) - Math.max(d.y, b.y);
                          if (vo <= 0) return;
                          if (!nb || b.x < nb.x) nb = b;
                        });
                        const gap = nb ? Math.round(nb.x - (d.x + d.w)) : null;
                        const nm = { door: "drzwi", drawer: "szuflada", fix: "fix", blenda: "blenda" }[d.type];
                        return (
                          <tr key={i} className="border-b border-stone-100">
                            <td className="py-1 pr-2 font-sans text-stone-600">{nm}</td>
                            <td className="py-1 pr-2 text-right">{fmt(d.x)}</td>
                            <td className="py-1 pr-2 text-stone-400">…</td>
                            <td className="py-1 pr-2">{fmt(d.x + d.w)}</td>
                            <td className="py-1 pr-2 text-right text-stone-500">{fmt(d.w)}×{fmt(d.h)}</td>
                            <td className="py-1 text-right"
                              style={{ color: gap === null ? "#a8a29e" : gap < 2 ? ERRC : "#78716c" }}>
                              {gap === null ? "—" : `luz ${fmt(gap)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </Card>

          <Card title="Formatki do zamówienia"
            right={
              Object.keys(cab.edgeOverrides || {}).length > 0 ? (
                <button onClick={() => set({ edgeOverrides: {} })} className="text-xs text-teal-700 hover:underline">
                  Wróć do automatycznego oklejania
                </button>
              ) : null
            }>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
                    <th className="py-2 pr-3 font-medium">Element</th>
                    <th className="py-2 pr-3 font-medium">Płyta</th>
                    <th className="py-2 pr-3 text-right font-medium">Długość</th>
                    <th className="py-2 pr-3 text-right font-medium">Szerokość</th>
                    <th className="py-2 pr-3 text-right font-medium">Szt.</th>
                    <th className="py-2 pr-3 font-medium">Oklejanie PCV 2 mm</th>
                    <th className="py-2 font-medium">Słoje</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {cutList.map((p, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="py-2 pr-3 font-sans">{p.name}</td>
                      <td className="py-2 pr-3 font-sans text-stone-500">{mat[p.matKey].name}</td>
                      <td className="py-2 pr-3 text-right">{fmt(p.a)}</td>
                      <td className="py-2 pr-3 text-right">{fmt(p.b)}</td>
                      <td className="py-2 pr-3 text-right">{p.qty}</td>
                      <td className="py-2 pr-3"><EdgeChips p={p} /></td>
                      <td className="py-2 font-sans text-stone-500">
                        {p.matKey === "back" ? "—" : cab.grainMatters ? "wzdłuż dł." : "dowolnie"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 border-t border-stone-200 pt-3 text-sm sm:grid-cols-3">
              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-500">Sztuk razem</span>
                <span className="font-mono text-lg">{cutList.reduce((s, p) => s + p.qty, 0)}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-500">Obrzeże PCV</span>
                <span className="font-mono text-lg">{fmt(edgeMeters)} mb</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-500">Powierzchnia</span>
                <span className="font-mono text-sm">
                  {Object.entries(boardArea).map(([k, v]) => (
                    <span key={k} className="block">{mat[k].name}: {fmt(v)} m²</span>
                  ))}
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-500">
              Wymiary są wymiarami gotowej formatki — automat szlifuje krawędź o 2 mm i nakleja
              obrzeże, więc zamawiasz dokładnie te liczby.
            </p>
          </Card>
          <Card title="Produkty do zamówienia">
            {geo.hardware.length === 0 ? (
              <p className="text-sm text-stone-400">
                Brak okuć — dodaj szuflady, uchwyty albo nóżki.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
                    <th className="py-2 pr-3 font-medium">Produkt</th>
                    <th className="py-2 pr-3 font-medium">Specyfikacja</th>
                    <th className="py-2 text-right font-medium">Ilość</th>
                  </tr>
                </thead>
                <tbody>
                  {geo.hardware.map((h, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="py-2 pr-3">{h.name}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-stone-500">{h.spec}</td>
                      <td className="py-2 text-right font-mono">{h.qty} {h.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Field label="Nazwa uchwytu" hint="trafia do listy zamówienia">
              <input value={cab.handleName || ""} placeholder="np. Uchwyt relingowy 160"
                onChange={(e) => set({ handleName: e.target.value })}
                className="w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none" />
            </Field>
            <p className="text-xs text-stone-500">
              Zawiasy domyślnie dwa na skrzydło. Trzy dopiero przy szerokości powyżej
              500 mm i wysokości powyżej 1400 mm, cztery powyżej 2000 mm. Wąskie drzwi
              zawsze dostają dwa. Liczbę nadpiszesz w polu przy każdym skrzydle.
            </p>
          </Card>

        </div>
      </main>

      {transfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
          onClick={() => setTransfer(null)}>
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-sm font-semibold text-stone-800">
              {transfer.mode === "export" ? "Kopia projektu" : "Wklej projekt"}
            </h3>
            <p className="mb-2 text-xs text-stone-500">
              {transfer.mode === "export"
                ? "Zaznacz i skopiuj poniższy tekst, wklej go do pliku tekstowego albo notatki. Tak zachowasz projekt niezależnie od przeglądarki."
                : "Wklej tutaj wcześniej skopiowany tekst projektu."}
            </p>
            <textarea
              readOnly={transfer.mode === "export"}
              value={transfer.text}
              onChange={(e) => setTransfer({ ...transfer, text: e.target.value })}
              onFocus={(e) => transfer.mode === "export" && e.target.select()}
              className="h-64 w-full rounded border border-stone-300 p-2 font-mono text-[11px] focus:border-teal-600 focus:outline-none" />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setTransfer(null)}
                className="rounded px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100">Zamknij</button>
              {transfer.mode === "export" ? (
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(transfer.text); setSaved("skopiowano do schowka"); }
                    catch { setSaved("zaznacz tekst i skopiuj ręcznie"); }
                  }}
                  className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
                  Kopiuj do schowka
                </button>
              ) : (
                <button onClick={() => applyImportText(transfer.text)}
                  className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
                  Wczytaj projekt
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
