# Site-ul nou (dupa countdown)

## Cum il testezi
Deschide `site-v2/index.html` in browser (dublu click).
Video-ul de fundal il ia singur din `../site/media/`, deci nu trebuie copiat nimic.

## Prima pagina, pas cu pas
1. Logoul animat (cu sunet).
2. Un scroll: totul se strange in steagul UE, care urca sus. Literele „Erasmus+” din logo raman si devin ERASMUS+ din contur. Sus e doar steagul, fara bara cu About, Partners...
3. Inca un scroll: textul care se scrie singur (THREE SCHOOLS, THREE COUNTRIES, ONE SHARED STORY, TOLD BY THE STUDENTS WHO LIVED IT). WHO LIVED IT trece repede prin multe fonturi si la final devine WHO LOVED IT. Are buton de Skip.
4. Coloanele: meniul paginii. Cea peste care treci cu mouse-ul se largeste. Pe telefon sunt sase benzi una sub alta.

Scroll in sus face pasii inapoi (de la coloane la ERASMUS+, de acolo la logo). Click pe steagul din mijlocul coloanelor te duce tot la ERASMUS+.

Intro-ul cu logo si textul care se scrie apar o data pe sesiune. Ca sa le vezi din nou, inchide tab-ul si deschide-l iar.

Ce schimbi si unde:
- numele si descrierile din coloane: `index.html`, in `<nav class="cols">`
- textele care se scriu si cat sta fiecare pe ecran: `assets/js/home-seq.js`, functia `play()` de la final
- fonturile prin care trece WHO LIVED IT si ordinea lor: `home-seq.js`, lista `STILURI` de sus. Fisierele cu `-ascii-` in nume din `assets/fonts` au doar literele fara diacritice, cifrele si semnele de baza.
- materialele din care e facut STORY (crosetat, graffiti, confetti, mozaic, neon, hartie): tot in `home-seq.js`, in `MAT`. `FINAL` spune cu ce material ramane fiecare litera.

## Meniul si trecerea intre pagini
- Pe paginile din interior, meniul e randul de sus: cele sase nume din contur, cu steagul UE la mijloc. Pagina pe care esti are numele alb si rarit. Cand derulezi, meniul primeste un fundal inchis, ca textul paginii sa nu se amestece cu el.
- Click pe o coloana de pe prima pagina: numele urca din coloane in meniul de sus si se deschide pagina. Click pe steagul din meniu: numele coboara inapoi in coloane.
- Fundalul e acelasi pe toate paginile (acelasi video), doar „imbracat” diferit: pe prima pagina, sub coloane, e mai inchis si in ceata (blur); pe paginile din interior e clar. Intre ele trece lin, in 0,6 secunde. Durata e `--bg-fade` din `assets/css/site.css`, unde sunt si straturile fundalului.
- Paginile se schimba fara ca site-ul sa se reincarce (se inlocuieste doar continutul), asa ca video-ul de fundal merge mai departe fara intrerupere. Butoanele Inapoi / Inainte din browser merg normal.

**Important, dupa ce schimbi ceva intr-un fisier `.html`** (de exemplu textul din `about.html` sau coloanele din `index.html`):
continutul paginilor e tinut si intr-o copie, `assets/js/page-templates.js`, din care se face trecerea intre pagini. Daca nu refaci copia, la click din meniu apare textul vechi (cel nou se vede doar daca deschizi pagina direct). Copia se reface cu comanda asta, data in folderul `site-v2`:

    node scripts/build-page-templates.cjs

Ce schimbi in `assets/js/data.js` nu are nevoie de comanda asta.

## Cum schimbi textele, pozele si harta
Totul e in `assets/js/data.js`:
- `project`: codul proiectului, durata, email, Instagram, numarul de elevi
- `schools`: cele 3 scoli (text, profesor, site, data mobilitatii)
- `mobilities`: locurile de pe harta (lat / lon din Google Maps) si pozele de la fiecare loc
- `journal`: articolele din jurnal (cel mai nou primul)

Ce e intre `[ ]` trebuie completat. Pe site apare colorat in albastru, ca sa se vada.

Pozele le pui de exemplu in `media/poze/` si scrii in data.js:
`{ type: 'photo', src: 'media/poze/prejmer-1.jpg', caption: 'Prejmer, in the morning' }`

## Cand il punem live
Copiezi ce e in `site-v2` peste `site` (folderul `site/media` ramane cum e).
Nu copia `node_modules`, `tests`, `scripts`, `package.json`, `package-lock.json` si `README.md`: sunt doar pentru lucru si verificari, site-ul nu are nevoie de ele (`node_modules` are peste o mie de fisiere).
Inainte sa copiezi, ruleaza o data `node scripts/build-page-templates.cjs`, ca sa fii sigur ca trecerea intre pagini arata ultimele texte.
Pagina 404 merge asa cum e pe erasmus-rofrdk.com. Daca site-ul ar sta intr-un subfolder, schimbi `ROOT` in `404.html`.
