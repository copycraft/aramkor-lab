# Áramkör Labor

Interaktív, magyar nyelvű oktatóoldal az elektromosság alapjairól (8. osztály, fizika).
A diákok kísérletezve tanulják az áramkörök működését: alkatrészeket húznak a vászonra,
vezetékkel kötik össze őket, és valós időben látják az Ohm törvénye alapján számolt
áramerősséget, feszültséget és fényerőt.

## Technika

- **Next.js 15 (App Router)**, statikus exportra konfigurálva (`output: 'export'`)
- **Nincs backend**: se API route, se adatbázis, se szerveroldali állapot — minden a böngészőben fut
- **Nem tárol semmit**: se localStorage, se cookie; az állapot csak React state-ben él, frissítéskor törlődik
- **Nincs külső asset**: minden alkatrész és ikon kódból generált SVG alapforma (kör, téglalap, vonal, poligon)
- Sötét téma, teljesen statikus build → közvetlenül deployolható Cloudflare Pages-re

## Futtatás

```bash
npm install
npm run dev
```

## Build és deploy

```bash
npm run build
```

A kimenet az `out/` mappába kerül (`index.html`, `labor/index.html`, `_next/…`).

Cloudflare Pages beállítás:

| mező | érték |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | 20 vagy újabb |

## Oldalak

- `/` – főoldal: bemutatkozás, használati útmutató, minta-áramkörök, elméleti összefoglaló
- `/labor/` – az áramkör-szerkesztő és a puskalap

## Az áramkör-szerkesztő

**Alkatrészek:** telep (1–24 V), kapcsoló, izzó, ellenállás, potenciométer (kör alakú
forgatógomb), ampermérő, voltmérő, elágazás (kötéspont).

**Kezelés**

| művelet | hogyan |
| --- | --- |
| alkatrész hozzáadása | kattintás a palettán, vagy ráhúzás a vászonra |
| beékelés meglévő vezetékbe | az alkatrészt a vezetékre ejtve automatikusan bekerül a vonalba |
| vezeték húzása | a kék csatlakozási pontból húzva egy másik csatlakozási pontra |
| kapcsoló nyitása / zárása | kattintás a kapcsolóra |
| forgatás | `R` billentyű vagy a Forgatás gomb |
| törlés | `Delete` billentyű vagy a Törlés gomb |

**Szimuláció**

- Csomóponti potenciálok módosított csomóponti analízissel (MNA), Gauss-eliminációval
- A telep belső ellenállása 0,4 Ω, így rövidzárnál is véges az áram
- Zárt körben animált pontok mutatják az áram irányát és — sebességükkel — az erősségét
- Nyitott / szakadt körnél nincs animáció, a vászon alján magyarázó üzenet jelenik meg
- **Túlterhelés:** rövidzárnál a legterheltebb vezeték felvillan és elszakad, az izzó pedig
  kiég, ha a névleges 4,5 V-nál sokkal többet kap. A hibás elemek egy gombbal cserélhetők.

## Fájlszerkezet

```
app/
  page.tsx          főoldal
  labor/page.tsx    a labor oldal
  layout.tsx, globals.css
components/
  Lab.tsx           állapotkezelés, eszköztár, minta-áramkörök
  CircuitCanvas.tsx SVG vászon: húzás, vezetékezés, animáció
  PartShape.tsx     az alkatrészek rajza alapformákból
  Palette.tsx, Inspector.tsx, SiteNav.tsx, HeroCircuit.tsx
lib/
  solver.ts         áramkör-szimuláció (MNA + Ohm törvénye)
  geometry.ts       vezeték-nyomvonalak, vezetékre ejtés
  parts.ts          alkatrész-definíciók
  presets.ts        beépített minta-áramkörök
  theory.ts         elméleti szövegek
```
