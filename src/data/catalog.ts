import type { CatalogProduct, Category, Unit } from '../types';

/**
 * Početni katalog artikala (bez fiksnih cijena).
 * Cijena se u UI-u prikazuje samo ako postoji u Arhivi artikala.
 */
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

function product(
  id: string,
  name: string,
  category: Category,
  variants: ReturnType<typeof v>[],
): CatalogProduct {
  return { id, name, category, variants };
}

export const CATALOG: CatalogProduct[] = [
  // —— Cigarete i duvan ——
  product('cigarete', 'Cigarete i duvan', 'cigarete', [
    v('marlboro-4-dugi-plavi', 'Marlboro 4 (dugi plavi)', 'pak', 'cigarete', ['marlboro', '4', 'dugi', 'plavi', 'cigarete']),
    v('marlboro-red', 'Marlboro Red', 'pak', 'cigarete', ['marlboro', 'red', 'crvene', 'cigarete']),
    v('marlboro-gold', 'Marlboro Gold', 'pak', 'cigarete', ['marlboro', 'gold', 'zlatne', 'cigarete']),
    v('marlboro-touch', 'Marlboro Touch', 'pak', 'cigarete', ['marlboro', 'touch', 'cigarete']),
    v('winston-blue', 'Winston Blue', 'pak', 'cigarete', ['winston', 'blue', 'plave', 'cigarete']),
    v('winston-classic', 'Winston Classic', 'pak', 'cigarete', ['winston', 'classic', 'cigarete']),
    v('lm-blue', 'L&M Blue', 'pak', 'cigarete', ['lm', 'l&m', 'blue', 'cigarete']),
    v('lm-red', 'L&M Red', 'pak', 'cigarete', ['lm', 'l&m', 'red', 'cigarete']),
    v('davidoff-gold', 'Davidoff Gold', 'pak', 'cigarete', ['davidoff', 'gold', 'cigarete']),
    v('rothmans-blue', 'Rothmans Blue', 'pak', 'cigarete', ['rothmans', 'blue', 'cigarete']),
    v('chesterfield-blue', 'Chesterfield Blue', 'pak', 'cigarete', ['chesterfield', 'blue', 'cigarete']),
    v('pall-mall', 'Pall Mall', 'pak', 'cigarete', ['pall', 'mall', 'cigarete']),
    v('drina', 'Drina', 'pak', 'cigarete', ['drina', 'cigarete']),
    v('filter-215', 'Filter 215', 'pak', 'cigarete', ['filter', '215', 'cigarete']),
    v('duvan-kesica', 'Duvan (kesica)', 'pak', 'cigarete', ['duvan', 'kesica', 'duhan']),
    v('rizle', 'Rizle / papirići', 'pak', 'cigarete', ['rizle', 'papirici', 'duvan']),
    v('upaljac', 'Upaljač', 'kom', 'cigarete', ['upaljac', 'upaljač', 'vatra']),
  ]),

  // —— Mliječno i jaja ——
  product('mlijeko', 'Mlijeko', 'mlijecno', [
    v('mlijeko-1l', 'Mlijeko 1L (tetrapak)', 'l', 'mlijecno', ['mlijeko', 'mleko', '1l', 'tetrapak', 'mlijecno']),
    v('mlijeko-05l', 'Mlijeko 0.5L', 'l', 'mlijecno', ['mlijeko', 'mleko', '0.5', 'pola'], 0.5),
    v('mlijeko-15l', 'Mlijeko 1.5L', 'l', 'mlijecno', ['mlijeko', 'mleko', '1.5'], 1.5),
    v('mlijeko-2l', 'Mlijeko 2L', 'l', 'mlijecno', ['mlijeko', 'mleko', '2l'], 2),
    v('mlijeko-bez-laktoze', 'Mlijeko bez laktoze 1L', 'l', 'mlijecno', ['mlijeko', 'laktoze', 'bez laktoze']),
    v('mlijeko-3-2', 'Mlijeko 3.2% 1L', 'l', 'mlijecno', ['mlijeko', '3.2', 'punomasno']),
    v('mlijeko-1-5', 'Mlijeko 1.5% 1L', 'l', 'mlijecno', ['mlijeko', '1.5%', 'obrano']),
  ]),
  product('jogurt', 'Jogurt', 'mlijecno', [
    v('jogurt-180', 'Jogurt 180g', 'kom', 'mlijecno', ['jogurt', '180', 'mlijecno']),
    v('jogurt-500', 'Jogurt 500g', 'kom', 'mlijecno', ['jogurt', '500']),
    v('jogurt-1kg', 'Jogurt 1kg', 'kg', 'mlijecno', ['jogurt', '1kg']),
    v('jogurt-grcki', 'Grčki jogurt', 'kom', 'mlijecno', ['jogurt', 'grcki', 'grčki']),
    v('jogurt-vocni', 'Voćni jogurt', 'kom', 'mlijecno', ['jogurt', 'vocni', 'voćni']),
  ]),
  product('pavlaka', 'Pavlaka', 'mlijecno', [
    v('pavlaka-12', 'Pavlaka 12% 200g', 'kom', 'mlijecno', ['pavlaka', '12', 'mlijecno']),
    v('pavlaka-20', 'Pavlaka 20% 200g', 'kom', 'mlijecno', ['pavlaka', '20']),
    v('pavlaka-kisela', 'Kisela pavlaka 400g', 'kom', 'mlijecno', ['pavlaka', 'kisela']),
    v('pavlaka-za-kuhanje', 'Pavlaka za kuhanje 15%', 'kom', 'mlijecno', ['pavlaka', 'kuhanje']),
  ]),
  product('jaja', 'Jaja', 'mlijecno', [
    v('jaja-10', 'Jaja 10 kom', 'pak', 'mlijecno', ['jaja', '10', 'mlijecno']),
    v('jaja-15', 'Jaja 15 kom', 'pak', 'mlijecno', ['jaja', '15']),
    v('jaja-30', 'Jaja 30 kom', 'pak', 'mlijecno', ['jaja', '30']),
    v('jaja-m', 'Jaja M (kutija)', 'pak', 'mlijecno', ['jaja', 'm']),
    v('jaja-l', 'Jaja L (kutija)', 'pak', 'mlijecno', ['jaja', 'l', 'velika']),
  ]),
  product('sir', 'Sir', 'mlijecno', [
    v('sir-trapist', 'Sir trapist', 'kg', 'mlijecno', ['sir', 'trapist', 'mlijecno']),
    v('sir-feta', 'Sir feta', 'kg', 'mlijecno', ['sir', 'feta']),
    v('sir-gauda', 'Sir gauda', 'kg', 'mlijecno', ['sir', 'gauda']),
    v('sir-edamer', 'Sir edamer', 'kg', 'mlijecno', ['sir', 'edamer']),
    v('sir-svjezi', 'Svježi sir', 'kg', 'mlijecno', ['sir', 'svjezi', 'svježi']),
    v('sir-mladi', 'Mladi sir', 'kg', 'mlijecno', ['sir', 'mladi']),
    v('sir-tost', 'Tost sir / listići', 'pak', 'mlijecno', ['sir', 'tost', 'listici']),
    v('kajmak', 'Kajmak', 'kom', 'mlijecno', ['kajmak', 'mlijecno']),
    v('maslac', 'Maslac 250g', 'kom', 'mlijecno', ['maslac', 'puter', 'mlijecno']),
    v('margarin', 'Margarin', 'kom', 'mlijecno', ['margarin', 'mlijecno']),
  ]),

  // —— Pekara i tjestenina ——
  product('hljeb', 'Hljeb / pecivo', 'pekara', [
    v('hljeb-bijeli', 'Hljeb bijeli', 'kom', 'pekara', ['hljeb', 'hleb', 'bijeli', 'pekara']),
    v('hljeb-polubijeli', 'Hljeb polubijeli / crni', 'kom', 'pekara', ['hljeb', 'polubijeli', 'crni']),
    v('hljeb-integralni', 'Hljeb integralni', 'kom', 'pekara', ['hljeb', 'integralni']),
    v('somun-lepinja', 'Somun / lepinja', 'kom', 'pekara', ['somun', 'lepinja']),
    v('kifle-pecivo', 'Kifle / pecivo', 'kom', 'pekara', ['kifle', 'pecivo', 'kifla']),
    v('baguette', 'Baguette', 'kom', 'pekara', ['baguette', 'baget']),
    v('tost-hljeb', 'Tost hljeb', 'pak', 'pekara', ['tost', 'hljeb']),
    v('kroasan', 'Kroasan', 'kom', 'pekara', ['kroasan', 'croissant']),
    v('burek', 'Burek', 'kom', 'pekara', ['burek', 'pekara']),
    v('pite', 'Pita', 'kom', 'pekara', ['pita', 'zeljanica', 'sirnica']),
  ]),
  product('tjestenina', 'Tjestenina / riža', 'pekara', [
    v('spaghetti', 'Spaghetti 500g', 'pak', 'pekara', ['spaghetti', 'spageti', 'tjestenina', 'pekara']),
    v('penne', 'Penne 500g', 'pak', 'pekara', ['penne', 'tjestenina']),
    v('fusilli', 'Fusilli 500g', 'pak', 'pekara', ['fusilli', 'tjestenina']),
    v('makarone', 'Makarone 500g', 'pak', 'pekara', ['makarone', 'tjestenina']),
    v('lazanje', 'Listovi za lazanje', 'pak', 'pekara', ['lazanje', 'tjestenina']),
    v('riza-1kg', 'Riža 1kg', 'kg', 'pekara', ['riza', 'riža', '1kg']),
    v('riza-basmati', 'Riža basmati', 'pak', 'pekara', ['riza', 'basmati']),
    v('kus-kus', 'Kus-kus', 'pak', 'pekara', ['kus', 'kus-kus']),
    v('zobene-pahuljice', 'Zobene pahuljice', 'pak', 'pekara', ['zobene', 'pahuljice', 'zob']),
  ]),

  // —— Ulja i ostava ——
  product('ulje', 'Ulje', 'ostava', [
    v('ulje-floriol-1l', 'Ulje Floriol 1L', 'l', 'ostava', ['ulje', 'floriol', '1l', 'ostava']),
    v('ulje-floriol-2l', 'Ulje Floriol 2L', 'l', 'ostava', ['ulje', 'floriol', '2l'], 2),
    v('ulje-suncokret-1l', 'Ulje suncokretovo 1L', 'l', 'ostava', ['ulje', 'suncokretovo', '1l']),
    v('ulje-suncokret-2l', 'Ulje suncokretovo 2L', 'l', 'ostava', ['ulje', 'suncokretovo', '2l'], 2),
    v('ulje-maslinovo-1l', 'Ulje maslinovo 1L', 'l', 'ostava', ['ulje', 'maslinovo', '1l']),
    v('ulje-maslinovo-05', 'Ulje maslinovo 0.5L', 'l', 'ostava', ['ulje', 'maslinovo', '0.5'], 0.5),
    v('ulje-kokosovo', 'Kokosovo ulje', 'kom', 'ostava', ['ulje', 'kokosovo']),
  ]),
  product('ostava', 'Ostava / začini', 'ostava', [
    v('secer-1kg', 'Šećer 1kg', 'kg', 'ostava', ['secer', 'šećer', '1kg', 'ostava']),
    v('secer-kocke', 'Šećer kocke', 'pak', 'ostava', ['secer', 'kocke']),
    v('brasno-1kg', 'Brašno T400 1kg', 'kg', 'ostava', ['brasno', 'brašno', '1kg']),
    v('brasno-5kg', 'Brašno 5kg', 'kg', 'ostava', ['brasno', '5kg'], 5),
    v('brasno-25kg', 'Brašno 25kg', 'kg', 'ostava', ['brasno', '25kg'], 25),
    v('brasno-integralno', 'Brašno integralno 1kg', 'kg', 'ostava', ['brasno', 'integralno']),
    v('kafa-200', 'Kafa mljevena 200g', 'kom', 'ostava', ['kafa', '200', 'ostava']),
    v('kafa-500', 'Kafa mljevena 500g', 'kom', 'ostava', ['kafa', '500']),
    v('kafa-instant', 'Instant kafa', 'kom', 'ostava', ['kafa', 'instant']),
    v('caj-kutija', 'Čaj (kutija)', 'pak', 'ostava', ['caj', 'čaj']),
    v('sol', 'Kuhinjska so 1kg', 'kg', 'ostava', ['sol', 'so', 'kuhinjska']),
    v('biber', 'Biber mljeveni', 'kom', 'ostava', ['biber', 'zacin']),
    v('vegeta', 'Vegeta', 'kom', 'ostava', ['vegeta', 'zacin']),
    v('pavlaka-koktel', 'Kečap', 'kom', 'ostava', ['kecap', 'kečap']),
    v('majoneza', 'Majoneza', 'kom', 'ostava', ['majoneza']),
    v('senf', 'Senf', 'kom', 'ostava', ['senf']),
    v('sirce', 'Sirće', 'l', 'ostava', ['sirce', 'sirće']),
    v(' konzerva-pasulj', 'Pasulj konzerva', 'kom', 'ostava', ['pasulj', 'konzerva']),
    v('konzerva-tunjevina', 'Tunjevina konzerva', 'kom', 'ostava', ['tunjevina', 'konzerva']),
    v('konzerva-rajcica', 'Pelati / passata', 'kom', 'ostava', ['pelati', 'passata', 'rajcica']),
    v('secer-prasak', 'Šećer u prahu', 'pak', 'ostava', ['secer', 'prah']),
    v('kakao', 'Kakao prah', 'pak', 'ostava', ['kakao']),
    v('prasak-za-pecivo', 'Prašak za pecivo', 'kom', 'ostava', ['prasak', 'pecivo']),
    v('vanilin-secer', 'Vanilin šećer', 'kom', 'ostava', ['vanilin', 'secer']),
  ]),

  // —— Meso i riba ——
  product('meso', 'Meso i riba', 'meso', [
    v('pile-file', 'Pileći file', 'kg', 'meso', ['pile', 'piletina', 'file', 'meso']),
    v('pile-batak', 'Pileći batak', 'kg', 'meso', ['pile', 'batak']),
    v('pile-krilca', 'Pileća krilca', 'kg', 'meso', ['pile', 'krilca']),
    v('pile-cijelo', 'Cijelo pile', 'kg', 'meso', ['pile', 'cijelo']),
    v('junece', 'Juneće meso', 'kg', 'meso', ['junece', 'junetina', 'govedina']),
    v('mljeveno', 'Mljeveno meso', 'kg', 'meso', ['mljeveno', 'meso']),
    v('svinjetina', 'Svinjetina', 'kg', 'meso', ['svinjetina', 'svinjsko']),
    v('janjetina', 'Janjetina', 'kg', 'meso', ['janjetina']),
    v('virsle', 'Virsle', 'pak', 'meso', ['virsle']),
    v('sunka', 'Šunka', 'kg', 'meso', ['sunka', 'šunka']),
    v('kulen', 'Kulen / kobasica', 'kg', 'meso', ['kulen', 'kobasica']),
    v('slanina', 'Slanina', 'kg', 'meso', ['slanina']),
    v('panceta', 'Panceta', 'kg', 'meso', ['panceta']),
    v('riba-oslic', 'Oslić', 'kg', 'meso', ['oslic', 'oslić', 'riba']),
    v('riba-saran', 'Šaran', 'kg', 'meso', ['saran', 'šaran', 'riba']),
    v('riba-losos', 'Losos', 'kg', 'meso', ['losos', 'riba']),
    v('gambori', 'Gambori / škampi', 'kg', 'meso', ['gambori', 'skampi', 'škampi']),
  ]),

  // —— Voće i povrće ——
  product('voce-povrce', 'Voće i povrće', 'voce-povrce', [
    v('banane', 'Banane', 'kg', 'voce-povrce', ['banane', 'voce']),
    v('jabuke', 'Jabuke', 'kg', 'voce-povrce', ['jabuke', 'voce']),
    v('kruske', 'Kruške', 'kg', 'voce-povrce', ['kruske', 'kruške']),
    v('pomorandze', 'Pomorandže', 'kg', 'voce-povrce', ['pomorandze', 'narandze']),
    v('limun', 'Limun', 'kg', 'voce-povrce', ['limun']),
    v('mandarine', 'Mandarine', 'kg', 'voce-povrce', ['mandarine']),
    v('grozdje', 'Grožđe', 'kg', 'voce-povrce', ['grozdje', 'grožđe']),
    v('jagode', 'Jagode', 'kg', 'voce-povrce', ['jagode']),
    v('borovnice', 'Borovnice', 'pak', 'voce-povrce', ['borovnice']),
    v('krompir', 'Krompir', 'kg', 'voce-povrce', ['krompir', 'povrce']),
    v('luk', 'Crveni luk', 'kg', 'voce-povrce', ['luk', 'crveni']),
    v('bijeli-luk', 'Bijeli luk', 'kom', 'voce-povrce', ['bijeli', 'luk', 'cesnjak']),
    v('paradajz', 'Paradajz', 'kg', 'voce-povrce', ['paradajz']),
    v('krastavac', 'Krastavac', 'kg', 'voce-povrce', ['krastavac']),
    v('mrkva', 'Mrkva', 'kg', 'voce-povrce', ['mrkva']),
    v('kupus', 'Kupus', 'kg', 'voce-povrce', ['kupus']),
    v('paprika', 'Paprika', 'kg', 'voce-povrce', ['paprika']),
    v('tikvice', 'Tikvice', 'kg', 'voce-povrce', ['tikvice']),
    v('patlidzan', 'Patlidžan', 'kg', 'voce-povrce', ['patlidzan', 'patlidžan']),
    v('salata', 'Zelena salata', 'kom', 'voce-povrce', ['salata', 'zelena']),
    v('spanc', 'Špinat', 'kg', 'voce-povrce', ['spinat', 'špinat']),
    v('gljive', 'Gljive / šampinjoni', 'kg', 'voce-povrce', ['gljive', 'sampinjoni']),
    v('kukuruz', 'Kukuruz šećerac', 'kom', 'voce-povrce', ['kukuruz']),
    v('grasak', 'Grašak', 'kg', 'voce-povrce', ['grasak', 'grašak']),
  ]),

  // —— Slatkiši i grickalice ——
  product('slatkisi', 'Slatkiši i grickalice', 'slatkisi', [
    v('cokolada-mlijecna', 'Čokolada mliječna', 'kom', 'slatkisi', ['cokolada', 'čokolada', 'mlijecna', 'slatkisi']),
    v('cokolada-crna', 'Čokolada crna', 'kom', 'slatkisi', ['cokolada', 'crna']),
    v('cokolada-bijela', 'Čokolada bijela', 'kom', 'slatkisi', ['cokolada', 'bijela']),
    v('keks-plazma', 'Plazma keks', 'pak', 'slatkisi', ['plazma', 'keks']),
    v('keks-jaffa', 'Jaffa keks', 'pak', 'slatkisi', ['jaffa', 'keks']),
    v('keks-napolitanke', 'Napolitanke', 'pak', 'slatkisi', ['napolitanke', 'keks']),
    v('cips', 'Čips', 'pak', 'slatkisi', ['cips', 'čips', 'grickalice']),
    v('stapici', 'Slani štapići', 'pak', 'slatkisi', ['stapici', 'štapići']),
    v('kikiriki', 'Kikiriki', 'pak', 'slatkisi', ['kikiriki']),
    v('smoki', 'Smoki', 'pak', 'slatkisi', ['smoki']),
    v('bombone', 'Bombone', 'pak', 'slatkisi', ['bombone']),
    v('zvake', 'Žvake', 'pak', 'slatkisi', ['zvake', 'žvake']),
    v('sladoled', 'Sladoled', 'kom', 'slatkisi', ['sladoled']),
    v('med', 'Med', 'kom', 'slatkisi', ['med']),
    v('dzem', 'Džem', 'kom', 'slatkisi', ['dzem', 'džem']),
    v('nutella', 'Nutella / krem', 'kom', 'slatkisi', ['nutella', 'krem']),
  ]),

  // —— Pića ——
  product('voda', 'Voda i pića', 'pice', [
    v('voda-15l', 'Voda 1.5L', 'kom', 'pice', ['voda', '1.5', 'pice', 'pića']),
    v('voda-05l', 'Voda 0.5L', 'kom', 'pice', ['voda', '0.5']),
    v('voda-5l', 'Voda 5L', 'kom', 'pice', ['voda', '5l']),
    v('voda-gazirana', 'Voda gazirana 1.5L', 'kom', 'pice', ['voda', 'gazirana']),
    v('sok-1l', 'Sok 1L', 'l', 'pice', ['sok', '1l']),
    v('sok-jabuka', 'Sok jabuka 1L', 'l', 'pice', ['sok', 'jabuka']),
    v('sok-narandza', 'Sok narandža 1L', 'l', 'pice', ['sok', 'narandza', 'narandža']),
    v('cola-15', 'Gazirani sok / Cola 1.5L', 'kom', 'pice', ['cola', 'gazirani', 'fanta', 'sprite']),
    v('energy-drink', 'Energy drink', 'kom', 'pice', ['energy', 'red bull', 'burn']),
    v('pivo-05', 'Pivo 0.5L', 'kom', 'pice', ['pivo', '0.5']),
    v('pivo-pak', 'Pivo paket 6/1', 'pak', 'pice', ['pivo', 'paket']),
    v('vino-crveno', 'Vino crveno', 'l', 'pice', ['vino', 'crveno']),
    v('vino-bijelo', 'Vino bijelo', 'l', 'pice', ['vino', 'bijelo']),
    v('rakija', 'Rakija', 'l', 'pice', ['rakija']),
  ]),

  // —— Hemija i higijena ——
  product('hemija', 'Hemija i higijena', 'hemija', [
    v('deterdzent', 'Deterdžent za veš', 'kom', 'hemija', ['deterdzent', 'ves', 'veš', 'hemija']),
    v('omeksivac', 'Omekšivač', 'kom', 'hemija', ['omeksivac', 'omekšivač']),
    v('tecnost-sudje', 'Tečnost za suđe', 'kom', 'hemija', ['sudje', 'suđe', 'tecnost']),
    v('paste-zubi', 'Pasta za zube', 'kom', 'hemija', ['pasta', 'zubi']),
    v('sampon', 'Šampon', 'kom', 'hemija', ['sampon', 'šampon']),
    v('gel-tusiranje', 'Gel za tuširanje', 'kom', 'hemija', ['gel', 'tusiranje']),
    v('sapun', 'Sapun', 'kom', 'hemija', ['sapun']),
    v('wc-papir', 'Toalet papir', 'pak', 'hemija', ['toalet', 'papir', 'wc']),
    v('ubrusi', 'Kuhinjski ubrusi', 'pak', 'hemija', ['ubrusi', 'papirni']),
    v('maramice', 'Maramice', 'pak', 'hemija', ['maramice']),
    v('pelene', 'Pelene', 'pak', 'hemija', ['pelene']),
    v('vate', 'Vata / štapići', 'pak', 'hemija', ['vata', 'stapici']),
    v('dezodorans', 'Dezodorans', 'kom', 'hemija', ['dezodorans']),
    v('krema', 'Krema za ruke / tijelo', 'kom', 'hemija', ['krema']),
    v('sredstvo-kupatilo', 'Sredstvo za kupatilo', 'kom', 'hemija', ['kupatilo', 'ciscenje']),
    v('sredstvo-staklo', 'Sredstvo za staklo', 'kom', 'hemija', ['staklo', 'ciscenje']),
    v('kese-za-smece', 'Kese za smeće', 'pak', 'hemija', ['kese', 'smece', 'smeće']),
    v('alufolija', 'Alufolija', 'kom', 'hemija', ['alufolija', 'folija']),
    v('stretch-folija', 'Stretch folija', 'kom', 'hemija', ['stretch', 'folija']),
  ]),

  // —— Kućanstvo / alat / auto / vrt / ostalo ——
  product('kucanstvo', 'Kućanstvo / alat / auto / vrt', 'kucanstvo', [
    v('baterije-aa', 'Baterije AA', 'pak', 'kucanstvo', ['baterije', 'aa', 'kucanstvo', 'alat']),
    v('baterije-aaa', 'Baterije AAA', 'pak', 'kucanstvo', ['baterije', 'aaa']),
    v('baterije-9v', 'Baterija 9V', 'kom', 'kucanstvo', ['baterije', '9v']),
    v('sijalica-led', 'Sijalica LED', 'kom', 'kucanstvo', ['sijalica', 'led', 'sijalice']),
    v('sijalica-e27', 'Sijalica E27', 'kom', 'kucanstvo', ['sijalica', 'e27']),
    v('sijalica-e14', 'Sijalica E14', 'kom', 'kucanstvo', ['sijalica', 'e14']),
    v('igle', 'Igle (šivaće)', 'pak', 'kucanstvo', ['igle', 'igla', 'sivanje']),
    v('konac', 'Konac', 'kom', 'kucanstvo', ['konac', 'konac']),
    v('cavao', 'Čavli / ekseri', 'pak', 'kucanstvo', ['cavli', 'čavli', 'ekseri', 'alat']),
    v('srafovi', 'Šrafovi', 'pak', 'kucanstvo', ['srafovi', 'šrafovi', 'alat']),
    v('odvijac', 'Odvijač', 'kom', 'kucanstvo', ['odvijac', 'odvijač', 'alat']),
    v('cekic', 'Čekić', 'kom', 'kucanstvo', ['cekic', 'čekić', 'alat']),
    v('kljuc-francuski', 'Francuski ključ', 'kom', 'kucanstvo', ['kljuc', 'francuski', 'alat']),
    v('metar', 'Metar / mjerna traka', 'kom', 'kucanstvo', ['metar', 'mjerna', 'alat']),
    v('ljepilo', 'Ljepilo / super glue', 'kom', 'kucanstvo', ['ljepilo', 'glue']),
    v('izolir-traka', 'Izolir traka', 'kom', 'kucanstvo', ['izolir', 'traka']),
    v('produljni-kabl', 'Produžni kabl', 'kom', 'kucanstvo', ['produzni', 'kabl', 'kabel']),
    v('sijalice-auto', 'Sijalice za auto', 'kom', 'kucanstvo', ['sijalice', 'auto']),
    v('ulje-motorno', 'Motorno ulje', 'l', 'kucanstvo', ['ulje', 'motorno', 'auto']),
    v('antifriz', 'Antifriz', 'l', 'kucanstvo', ['antifriz', 'auto']),
    v('tekucina-stakla', 'Tečnost za stakla (auto)', 'l', 'kucanstvo', ['tecnost', 'stakla', 'auto']),
    v('spuzva-auto', 'Spužva / krpa za auto', 'kom', 'kucanstvo', ['spuzva', 'auto']),
    v('zemlja-za-cvijece', 'Zemlja za cvijeće', 'pak', 'kucanstvo', ['zemlja', 'cvijece', 'vrt']),
    v('saksija', 'Saksija', 'kom', 'kucanstvo', ['saksija', 'vrt']),
    v('crijevo-vrt', 'Vrtno crijevo', 'kom', 'kucanstvo', ['crijevo', 'vrt']),
    v('sjeme', 'Sjeme / sadnice', 'pak', 'kucanstvo', ['sjeme', 'sadnice', 'vrt']),
    v('kesa-platnena', 'Platnena kesa', 'kom', 'kucanstvo', ['kesa', 'platnena']),
    v('sundjer', 'Spužva / sunđer', 'pak', 'kucanstvo', ['sundjer', 'sunđer', 'spuzva']),
    v('metla', 'Metla', 'kom', 'kucanstvo', ['metla']),
    v('kanta', 'Kanta', 'kom', 'kucanstvo', ['kanta']),
  ]),

  // —— Ostalo / šaljivo ——
  product('ostalo-fun', 'Ostalo', 'ostalo', [
    v('lokomotiva', 'Lokomotiva', 'kom', 'ostalo', ['lokomotiva', 'voz', 'šala', 'ostalo']),
    v('upravljaca', 'Daljinski upravljač (baterije!)', 'kom', 'ostalo', ['daljinski', 'upravljac']),
    v('ves-kocke', 'Kocke za WC', 'kom', 'ostalo', ['kocke', 'wc']),
    v('sveca', 'Svijeća', 'kom', 'ostalo', ['sveca', 'svijeća']),
    v('zippo-benzin', 'Benzin za upaljač', 'kom', 'ostalo', ['benzin', 'upaljac']),
  ]),
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

/** Broj varijanti u početnom katalogu (za info u UI). */
export function catalogVariantCount(): number {
  return flattenCatalogVariants().length;
}
