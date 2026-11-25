# KupiKM — pametna kupovina (BiH)

Mobile-first PWA za spisak namirnica, unos cijena u korpi, arhivu cijena i poređenje radnji (Bingo, Konzum, Mercator, Lidl, Amko…).

## Pokretanje

```bash
npm install
npm run dev
```

## Build i deploy

```bash
npm run build
firebase deploy --only hosting,firestore
```

## Funkcije

- Pametni unos sa varijantama pakovanja (čipovi)
- Režim kupovine: checkbox → unos cijene → auto-arhiva
- Ukupan iznos korpe u zaglavlju
- Poređenje spiska po radnjama (NAJJEFTINIJE)
- Historija kretanja cijena
- Dijeljeni spisak (Firestore `onSnapshot`) + offline persistence
- Budžet i obavljene kupovine

## Env

Kopiraj `.env.example` → `.env` i upiši `VITE_FIREBASE_*` za live Auth/Firestore. Bez ključeva app radi lokalno s demo podacima.
