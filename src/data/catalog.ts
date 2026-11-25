import type { CatalogProduct, Category, Unit } from '../types';

function v(
  id: string,
  label: string,
  unit: Unit,
  category: Category,
  keywords: string[],
  defaultQty = 1,
) {
  return { id, label, unit, defaultQty, keywords, category };
}

/** Lokalni katalog najčešćih namirnica sa pakovanjima/varijantama. */
export const CATALOG: CatalogProduct[] = [
  {
    id: 'mlijeko',
    name: 'Mlijeko',
    category: 'mlijecno',
    variants: [
      v('mlijeko-1l', 'Mlijeko 1L (tetrapak)', 'l', 'mlijecno', ['mlijeko', 'mleko', '1l', 'tetrapak']),
      v('mlijeko-05l', 'Mlijeko 0.5L', 'l', 'mlijecno', ['mlijeko', 'mleko', '0.5', 'pola'], 0.5),
      v('mlijeko-15l', 'Mlijeko 1.5L', 'l', 'mlijecno', ['mlijeko', 'mleko', '1.5'], 1.5),
      v('mlijeko-2l', 'Mlijeko 2L', 'l', 'mlijecno', ['mlijeko', 'mleko', '2l'], 2),
      v('mlijeko-bez-laktoze', 'Mlijeko bez laktoze 1L', 'l', 'mlijecno', ['mlijeko', 'laktoze', 'bez laktoze']),
    ],
  },
  {
    id: 'jogurt',
    name: 'Jogurt',
    category: 'mlijecno',
    variants: [
      v('jogurt-180', 'Jogurt 180g', 'kom', 'mlijecno', ['jogurt', '180']),
      v('jogurt-500', 'Jogurt 500g', 'kom', 'mlijecno', ['jogurt', '500']),
      v('jogurt-1kg', 'Jogurt 1kg', 'kg', 'mlijecno', ['jogurt', '1kg']),
      v('jogurt-casica', 'Jogurt čašica', 'kom', 'mlijecno', ['jogurt', 'casica', 'čašica']),
    ],
  },
  {
    id: 'pavlaka',
    name: 'Pavlaka',
    category: 'mlijecno',
    variants: [
      v('pavlaka-12', 'Pavlaka 12% 200g', 'kom', 'mlijecno', ['pavlaka', '12']),
      v('pavlaka-20', 'Pavlaka 20% 200g', 'kom', 'mlijecno', ['pavlaka', '20']),
      v('pavlaka-kisela', 'Kisela pavlaka 400g', 'kom', 'mlijecno', ['pavlaka', 'kisela']),
    ],
  },
  {
    id: 'jaja',
    name: 'Jaja',
    category: 'mlijecno',
    variants: [
      v('jaja-10', 'Jaja 10 kom', 'pak', 'mlijecno', ['jaja', '10']),
      v('jaja-15', 'Jaja 15 kom', 'pak', 'mlijecno', ['jaja', '15']),
      v('jaja-30', 'Jaja 30 kom', 'pak', 'mlijecno', ['jaja', '30']),
    ],
  },
  {
    id: 'sir',
    name: 'Sir',
    category: 'mlijecno',
    variants: [
      v('sir-trapist', 'Sir trapist', 'kg', 'mlijecno', ['sir', 'trapist']),
      v('sir-feta', 'Sir feta', 'kg', 'mlijecno', ['sir', 'feta']),
      v('sir-gauda', 'Sir gauda', 'kg', 'mlijecno', ['sir', 'gauda']),
    ],
  },
  {
    id: 'hljeb',
    name: 'Hljeb / peciva',
    category: 'pekara',
    variants: [
      v('hljeb-bijeli', 'Hljeb bijeli', 'kom', 'pekara', ['hljeb', 'hleb', 'bijeli']),
      v('hljeb-integralni', 'Hljeb integralni', 'kom', 'pekara', ['hljeb', 'hleb', 'integralni']),
      v('somun', 'Somun', 'kom', 'pekara', ['somun', 'hljeb']),
      v('pecivo', 'Pecivo / kifla', 'kom', 'pekara', ['pecivo', 'kifla', 'hljeb']),
      v('lepinja', 'Lepinja', 'kom', 'pekara', ['lepinja', 'hljeb']),
    ],
  },
  {
    id: 'ulje',
    name: 'Ulje',
    category: 'ostalo',
    variants: [
      v('ulje-1l', 'Suncokretovo ulje 1L', 'l', 'ostalo', ['ulje', 'suncokretovo', '1l']),
      v('ulje-maslinovo', 'Maslinovo ulje 0.5L', 'l', 'ostalo', ['ulje', 'maslinovo'], 0.5),
    ],
  },
  {
    id: 'secer',
    name: 'Šećer',
    category: 'ostalo',
    variants: [
      v('secer-1kg', 'Šećer 1kg', 'kg', 'ostalo', ['secer', 'šećer', '1kg']),
      v('secer-kristal', 'Šećer kristal 1kg', 'kg', 'ostalo', ['secer', 'kristal']),
    ],
  },
  {
    id: 'brasno',
    name: 'Brašno',
    category: 'ostalo',
    variants: [
      v('brasno-1kg', 'Brašno T400 1kg', 'kg', 'ostalo', ['brasno', 'brašno', '1kg']),
      v('brasno-5kg', 'Brašno 5kg', 'kg', 'ostalo', ['brasno', 'brašno', '5kg'], 5),
      v('brasno-25kg', 'Brašno 25kg', 'kg', 'ostalo', ['brasno', 'brašno', '25kg'], 25),
    ],
  },
  {
    id: 'kafa',
    name: 'Kafa',
    category: 'ostalo',
    variants: [
      v('kafa-200', 'Kafa mljevena 200g', 'kom', 'ostalo', ['kafa', '200']),
      v('kafa-500', 'Kafa mljevena 500g', 'kom', 'ostalo', ['kafa', '500']),
    ],
  },
  {
    id: 'meso',
    name: 'Meso / piletina',
    category: 'meso',
    variants: [
      v('pile-file', 'Pileći file', 'kg', 'meso', ['pile', 'piletina', 'file', 'meso']),
      v('pile-batak', 'Pileći batak', 'kg', 'meso', ['pile', 'batak', 'meso']),
      v('junece', 'Juneće meso', 'kg', 'meso', ['junece', 'govedina', 'meso']),
      v('mljeveno', 'Mljeveno meso', 'kg', 'meso', ['mljeveno', 'meso']),
      v('virsle', 'Virsle', 'pak', 'meso', ['virsle', 'meso']),
    ],
  },
  {
    id: 'voce-povrce',
    name: 'Voće i povrće',
    category: 'voce-povrce',
    variants: [
      v('banane', 'Banane', 'kg', 'voce-povrce', ['banane', 'voce']),
      v('jabuke', 'Jabuke', 'kg', 'voce-povrce', ['jabuke', 'voce']),
      v('pomorandze', 'Pomorandže', 'kg', 'voce-povrce', ['pomorandze', 'narandze', 'voce']),
      v('krompir', 'Krompir', 'kg', 'voce-povrce', ['krompir', 'povrce']),
      v('luk', 'Crveni luk', 'kg', 'voce-povrce', ['luk', 'povrce']),
      v('paradajz', 'Paradajz', 'kg', 'voce-povrce', ['paradajz', 'povrce']),
      v('krastavac', 'Krastavac', 'kg', 'voce-povrce', ['krastavac', 'povrce']),
      v('mrkva', 'Mrkva', 'kg', 'voce-povrce', ['mrkva', 'povrce']),
    ],
  },
  {
    id: 'voda',
    name: 'Voda',
    category: 'pice',
    variants: [
      v('voda-15l', 'Voda 1.5L', 'kom', 'pice', ['voda', '1.5']),
      v('voda-05l', 'Voda 0.5L', 'kom', 'pice', ['voda', '0.5']),
      v('voda-5l', 'Voda 5L', 'kom', 'pice', ['voda', '5l', 'galon']),
      v('voda-gazirana', 'Voda gazirana 1.5L', 'kom', 'pice', ['voda', 'gazirana']),
    ],
  },
  {
    id: 'sokovi',
    name: 'Sokovi / napici',
    category: 'pice',
    variants: [
      v('sok-1l', 'Sok 1L', 'l', 'pice', ['sok', '1l']),
      v('cola', 'Gazirani sok 1.5L', 'kom', 'pice', ['cola', 'gazirani', 'sok']),
      v('caj', 'Čaj (kutija)', 'pak', 'pice', ['caj', 'čaj']),
    ],
  },
  {
    id: 'hemija',
    name: 'Hemija / higijena',
    category: 'hemija',
    variants: [
      v('deterdzent', 'Deterdžent za veš', 'kom', 'hemija', ['deterdzent', 'ves', 'veš']),
      v('omeksivac', 'Omekšivač', 'kom', 'hemija', ['omeksivac', 'omekšivač']),
      v('tecnost-sudje', 'Tečnost za suđe', 'kom', 'hemija', ['sudje', 'suđe', 'tecnost']),
      v('pasta-zubi', 'Pasta za zube', 'kom', 'hemija', ['pasta', 'zubi']),
      v('sapun', 'Sapun', 'kom', 'hemija', ['sapun']),
      v('wc-papir', 'Toalet papir', 'pak', 'hemija', ['toalet', 'papir', 'wc']),
    ],
  },
];

export function flattenCatalogVariants() {
  return CATALOG.flatMap((p) =>
    p.variants.map((variant) => ({
      ...variant,
      productId: p.id,
      productName: p.name,
    })),
  );
}
