# Rocky Ocean – Nettside

## Om prosjektet

En enkel, vakker visningsside for seilbåten **Rocky Ocean** (NOR 11782),
en 36-fots seilbåt med ORC-sertifikat. Siden skal vise frem båten med
stil – ikke en blogg, ikke en butikk, bare en ren presentasjon.

## Stil og uttrykk

**Minimalistisk og maritim.** Tenk:

- Mye luft, store marger, generøst whitespace
- Få farger – hvit/off-white bakgrunn, mørk navy eller koksgrå tekst,
  én aksentfarge fra logo/ORC-blå (#3399FF som referanse)
- Typografi gjør tunge løft: én serif eller en stilren sans-serif,
  få vekter, store kontraster mellom display og brødtekst
- Store, rolige bilder – fullbredde der det passer
- Ingen unødvendige animasjoner, men gjerne subtile fade-ins og
  myk parallax på hero
- Inspirasjon: think båtprodusent-sider som Hallberg-Rassy,
  Nautor Swan, X-Yachts – ikke charterannonser

## Sider / seksjoner

Én-sidet (single page) eller maks 2-3 sider. Forslag til struktur:

1. **Hero** – fullbredde-bilde av båten, navnet "Rocky Ocean" stort,
   "NOR 11782" som understell, eventuell tagline
2. **Om båten** – kort, velskrevet tekst om båten og navnet, ledsaget
   av ett eller to bilder
3. **Spesifikasjoner** – ren tabell/grid med nøkkeltall fra ORC.
   Lat-stil, ikke overveldende. Knapp for "Se fullt ORC-sertifikat"
   som åpner sertifikatet
4. **Galleri** – grid av bilder, klikk for full størrelse (lightbox).
   Holdes ryddig – kanskje grupper: "Båten", "På sjøen", "Detaljer"

## Teknisk stack

**Anbefaling: Astro**

- Perfekt for statiske visningssider
- Bilder optimaliseres automatisk (viktig for galleri)
- Markdown for tekstinnhold = enkelt å redigere
- Deployer gratis til Netlify/Vercel/Cloudflare Pages
- Lite JavaScript = rask side

Alternativer hvis enklere ønskes:

- **Ren HTML/CSS** med litt vanilla JS for lightbox – minimal og
  evigvarende
- **Eleventy (11ty)** – også markdown-basert, enda mer minimalistisk
  enn Astro

## Ressurser i `assets/`

- `ORC_Certificate_for_Rocky_Ocean.html` – komplett ORC-sertifikat
  (NOR 11782, LOA 11.100m, 2023). Skal lenkes til, og data herfra
  fyller spesifikasjons-seksjonen
- `ROCKey_Ocean_.jpg` – hovedbilde av båten
- `rockyoceandrawing_png.png` – linjetegning av båten (bra som
  dekorelement, evt. i hero eller "Om båten"-seksjonen)
- `Logo_ideer.png` – logo-skisser (vurder hvilken som blir endelig)
- `Profilbilde_1.png` – profilbilde
- `Profil_teging_1.pdf`, `Rocky_Profil_TegningModel_pdf_4.pdf` – profiltegninger
- Diverse foto: `IMG_*.jpg/PNG` – kandidater til galleri

## Nøkkeldata fra ORC-sertifikatet

| Felt              | Verdi                              |
| ----------------- | ---------------------------------- |
| Navn              | Rocky Ocean                        |
| Seilnummer        | NOR 11782                          |
| Klasse            | One-off                            |
| LOA               | 11.100 m                           |
| Sertifikat        | ORC Club Non-Spinnaker 2023        |
| Utstedt           | 17/04/2023                         |
| Forbund           | Norges Seilforbund                 |
| ORC Ref           | 03440002I62                        |

Mer detaljert data (seil, allowances, VPP-tall) finnes i ORC-HTML-filen
og kan trekkes ut til en utvidet spesifikasjons-tabell.

## Designprinsipper

- **Bildet er stjernen** – la det puste
- **Ingen "design noise"** – ingen knapper i flere farger, ingen
  unødvendige bokser, ingen iconpacks
- **Typografi som hierarki** – størrelse og vekt, ikke farge eller bokser
- **Rolig palett** – maks 3 farger totalt
- **Mobil først** – siden skal være vakker på telefon

## Deployment

**Netlify** eller **Cloudflare Pages** – gratis, git-basert, custom
domene-støtte. Drag-and-drop deploy også mulig hvis git er overkill.

## Første oppgave til Claude Code

> Les denne README.md og innholdet i `assets/`-mappen.
>
> Sett opp et Astro-prosjekt med:
> - Én side delt i fire seksjoner: Hero, Om båten, Spesifikasjoner, Galleri
> - Minimalistisk maritim stil – mye whitespace, stilren typografi,
>   få farger (off-white bakgrunn, koksgrå/navy tekst, ORC-blå som aksent)
> - Spesifikasjons-data hentes fra `ORC_Certificate_for_Rocky_Ocean.html`
> - Lightbox-galleri for bildene
> - Optimal bildehåndtering (Astro Image)
> - Fullt responsiv
>
> Vis meg planen og prosjektstrukturen først. Sett deretter opp
> grunnoppsettet og hero-seksjonen så vi kan se retningen før vi
> bygger videre.
