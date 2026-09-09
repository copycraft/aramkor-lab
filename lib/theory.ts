export interface TheoryCard {
  id: string;
  title: string;
  symbol: string;
  unit: string;
  lead: string;
  body: string[];
  formula?: string;
  accent: string;
}

export const THEORY: TheoryCard[] = [
  {
    id: 'voltage',
    title: 'Feszültség',
    symbol: 'U',
    unit: 'volt (V)',
    accent: '#f2c94c',
    lead: 'A telep „hajtóereje”: ez indítja el a töltéseket a vezetőben.',
    body: [
      'A feszültség mindig két pont között értelmezhető – a telep két pólusa között mérjük.',
      'Egy ceruzaelem 1,5 V, egy laposelem 4,5 V, egy kis blokkelem 9 V.',
      'Voltmérővel mérjük, amit párhuzamosan kötünk arra az alkatrészre, aminek a feszültségét tudni akarjuk.',
    ],
  },
  {
    id: 'current',
    title: 'Áramerősség',
    symbol: 'I',
    unit: 'amper (A)',
    accent: '#38bdf8',
    lead: 'Azt mondja meg, mennyi töltés halad át a vezeték keresztmetszetén másodpercenként.',
    body: [
      'Áram csak zárt áramkörben folyik: ha bárhol megszakad a kör, azonnal megáll.',
      'A vászonon a mozgó pontok az áramot jelképezik – minél nagyobb az áramerősség, annál gyorsabban futnak.',
      'Ampermérővel mérjük, amit sorosan, azaz az áram útjába iktatunk be.',
    ],
  },
  {
    id: 'resistance',
    title: 'Ellenállás',
    symbol: 'R',
    unit: 'ohm (Ω)',
    accent: '#f2994a',
    lead: 'Azt fejezi ki, mennyire „nehéz” az áramnak áthaladni az alkatrészen.',
    body: [
      'Nagyobb ellenállás ugyanakkora feszültségnél kisebb áramot enged át.',
      'Az izzó szála is ellenállás: a rajta átfolyó áram melegíti fel izzásig.',
      'A vezetékek ellenállása olyan kicsi, hogy az iskolai feladatokban nullának vesszük.',
    ],
  },
  {
    id: 'ohm',
    title: 'Ohm törvénye',
    symbol: 'U = I · R',
    unit: 'a három mennyiség kapcsolata',
    accent: '#a78bfa',
    lead: 'Egy fogyasztón a feszültség egyenlő az áramerősség és az ellenállás szorzatával.',
    formula: 'U = I · R      I = U / R      R = U / I',
    body: [
      'Ha kétszeresére növeled a feszültséget, kétszer akkora áram folyik – ha az ellenállás nem változik.',
      'Ha kétszeresére növeled az ellenállást, feleakkora áram folyik.',
      'Próbáld ki az „Ohm törvénye műszerekkel” mintakörön: számold ki fejben, majd olvasd le a műszerekről!',
    ],
  },
  {
    id: 'series',
    title: 'Soros kapcsolás',
    symbol: 'R = R₁ + R₂',
    unit: 'egyetlen úton',
    accent: '#4ade80',
    lead: 'A fogyasztók egymás után, egyetlen hurokban helyezkednek el.',
    body: [
      'Az áramerősség mindenhol ugyanakkora – nincs hová „elveszni” az áramnak.',
      'A telep feszültsége megoszlik a fogyasztók között: a nagyobb ellenállásra jut több.',
      'Az eredő ellenállás az egyes ellenállások összege, ezért a kör árama csökken.',
      'Ha egy izzó kiég vagy kilazul, az egész kör megszakad – a régi karácsonyfaégők így működtek.',
    ],
  },
  {
    id: 'parallel',
    title: 'Párhuzamos kapcsolás',
    symbol: '1/R = 1/R₁ + 1/R₂',
    unit: 'több ág',
    accent: '#38bdf8',
    lead: 'A fogyasztók külön ágakon, ugyanahhoz a két csomóponthoz kapcsolódnak.',
    body: [
      'Mindegyik ágra ugyanakkora feszültség jut, mint a telepé.',
      'Az áram szétágazik: az ágak áramainak összege adja a főágban folyó áramot.',
      'Az eredő ellenállás kisebb, mint a legkisebb ág ellenállása – ezért folyik több áram a telepből.',
      'Ha az egyik ág megszakad, a másik tovább működik. A lakásban is így vannak bekötve a lámpák.',
    ],
  },
  {
    id: 'short',
    title: 'Rövidzár',
    symbol: 'R ≈ 0',
    unit: 'vigyázz!',
    accent: '#f87171',
    lead: 'Ha a telep két pólusát fogyasztó nélkül, puszta vezetékkel kötöd össze.',
    body: [
      'Az ellenállás szinte nulla, ezért nagyon nagy áram indul meg.',
      'A laborban ilyenkor felvillan és elszakad a leginkább terhelt vezeték – ezt utána ki kell cserélni.',
      'Az izzó is kiég, ha a névlegesnél (4,5 V) sokkal nagyobb feszültséget kap.',
      'A valóságban ezért van minden lakásban biztosíték és kismegszakító.',
    ],
  },
];
