# Site-ul nou (dupa countdown)

## Cum il testezi
Deschide `site-v2/index.html` in browser (dublu click).
Asa merge tot, mai putin imaginile hartii din Journey > Daily activities: OpenStreetMap le da doar unei pagini care vine de la un site, nu unui fisier deschis cu dublu click. Harta apare atunci fara imagini, doar cu pinii, traseele si numele locurilor.
Ca sa vezi site-ul exact ca pe internet, cu harta intreaga: dublu click pe `site-v2/porneste-site.bat`. Porneste un mic server pe calculatorul tau si deschide site-ul la `http://localhost:8080/site-v2/`. Cat timp fereastra neagra e deschisa, site-ul merge; o inchizi cand ai terminat. Are nevoie de Node.js (cel cu care rulezi si `node scripts/...`).
Video-ul de fundal il ia singur din `../site/media/`, deci nu trebuie copiat nimic.

## Prima pagina, pas cu pas
1. Logoul animat (cu sunet).
2. Un scroll: logoul se desface pe rand (sloganul, stropii, siluetele, cladirile), iar panglicile se trag in cercul de stele. Cercul devine steagul UE, care urca sus. Cand pleaca fiecare parte: `assets/js/home.js`, lista `PLECARE`. Literele „Erasmus+” din logo raman si devin ERASMUS+ din contur. Sus e doar steagul, fara bara cu About, Partners...
3. Inca un scroll: textul care se scrie singur (THREE SCHOOLS, THREE COUNTRIES, ONE SHARED STORY, TOLD BY THE STUDENTS WHO LIVED IT). WHO LIVED IT trece repede prin multe fonturi si la final devine WHO LOVED IT. Are buton de Skip.
4. Coloanele: meniul paginii. Cea peste care treci cu mouse-ul se largeste. Pe telefon sunt sase benzi una sub alta.

Scroll in sus face pasii inapoi (de la coloane la ERASMUS+, de acolo la logo). Click pe steagul din mijlocul coloanelor te duce tot la ERASMUS+.

Intro-ul (logoul, muzica si textul care se scrie) apare o data la 30 de zile in acelasi browser. Conteaza ca vazut cand ajungi la coloane, fie dupa text, fie cu Skip. Dupa aceea, prima pagina se deschide direct cu coloanele. Browserul tine minte ziua (in `localStorage`), chiar daca inchizi tab-ul sau calculatorul. Daca pleci de pe site inainte sa ajungi la coloane, intro-ul apare din nou data viitoare. Pe alt browser, pe alt telefon sau in modul incognito apare din nou. Ca sa il vezi din nou pe acelasi browser: deschide consola (F12) si scrie `localStorage.clear()`, apoi reincarca pagina. Numarul de zile e `ZILE_INTRO` sus in `assets/js/home.js` (si `30` in scriptul mic din `index.html`, sa fie la fel).

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

## Pe telefon (iPhone)
- Zona de sub ceas (sus) si cea de sub bara cu adresa (jos) nu sunt ale paginii: Safari le umple singur cu o singura culoare, aceeasi sus si jos: cea a lui `<html>`. Pe iPhone am pus negru curat, ca zona de sus sa se continue cu Dynamic Island (pe alte telefoane si pe calculator ramane albastrul inchis). Un fundal fix (video-ul nostru) nu are voie sa intre in ele; doar continutul care se deruleaza trece pe sub bara de jos. Ca sa nu ramana o dunga cu margine dreapta, fundalul se topeste sus si jos in culoarea aceea. Stratul se numeste `.edges` si e in `assets/css/site.css` (`--edge-top` si `--edge-bottom` = cat de inalta e trecerea). Apare doar pe iPhone / iPad. Culoarea se schimba in trei locuri, care trebuie sa fie la fel: `--bar` si `--edge` in `site.css` si `SITE_BAR` sus in `assets/js/navigation.js`.
- Telefonul opreste video-ul de fundal cand iesi din browser, schimbi tab-ul sau blochezi ecranul. La intoarcere il reporneste `wake()` din `assets/js/background-video.js`. In modul de economisire a bateriei, iPhone-ul nu lasa video-ul sa porneasca singur: porneste la prima atingere a ecranului.

## Muzica de la intro
Piesa e `assets/audio/music.mp3`. E deja mixata: incepe incet, creste 3 secunde si la secunda 3,05 intra tare.
Porneste in timpul sunetului de la logo (la secunda 2,30 a animatiei), asa ca intrarea tare cade exact cand se termina logoul. Canta peste ERASMUS+ si peste textul care se scrie, iar cand apar coloanele se stinge lin. Dupa aceea site-ul e fara muzica.

- Canta o singura data, impreuna cu intro-ul (deci o data la 30 de zile). Daca intro-ul nu apare, nu e nici muzica.
- In stanga jos e butonul rotund de sunet (ramane pe tot site-ul). Cat se aude muzica sau un sunet de click, cele 3 bare se misca; cand il opresti, se opresc atat muzica, cat si sunetele de click, iar alegerea se tine minte.
- Setarile sunt sus in `assets/js/music.js`: `LOGO_AT` (cand intra fata de logo), `VOLUME` (cat de tare) si `FADE_OUT` (in cat timp se stinge).
- Ca sa scoti muzica de tot: sterge linia cu `music.js` din `index.html`.

## Sunetele de la click
Pe toate paginile, click-urile au un sunet scurt si moale: unul pentru butoane, unul pentru selectoare si pinii de pe harta, unul cand deschizi o pagina, unul cand deschizi o poza si unul cand inchizi ceva.
Nu sunt fisiere audio; le face browserul pe loc, din `assets/js/sfx.js`. Sus in fisier sunt `VOLUME` (cat de tare sunt toate) si lista `SOUNDS` (nota, durata si taria fiecaruia).

- Daca vizitatorul a oprit muzica de la intro din butonul ei, sunt oprite si sunetele astea.
- Ca sa le scoti de tot: sterge linia cu `sfx.js` din fiecare fisier `.html`.

## Pagina Journey: cele 5 rubrici
Sub harta Europei alegi orasul (Brasov, Orsay, Fjerritslev), iar sub orase sunt cinci taburi: About, Materials, Daily activities, Results, Dissemination. Sunt rubricile din documentul cu cerintele site-ului, la fel pentru toate cele trei mobilitati.
Fiecare are si link direct, bun de trimis mai departe: `journey.html#ro` (Brasov), `journey.html#ro-materials`, `journey.html#ro-daily`, `journey.html#ro-results`, `journey.html#ro-dissemination`; la fel cu `fr` si `dk`.
Fisierele (programul, prezentarile, fisele de lucru) le pui de exemplu in `media/docs/` si scrii calea lor in `data.js`. Cat timp un material nu are fisier, pe el scrie „Coming soon”.

## Harta Europei (sus, pe pagina Journey)
E tot o harta reala, cu aceleasi imagini si aceeasi culoare ca harta fiecarei mobilitati, dar sta pe loc (fara zoom): arata cele trei tari colorate, drumul Brasov, Orsay, Fjerritslev si orasele. Click pe un oras deschide calatoria lui.
Intai apare harta desenata de noi, iar cea reala vine peste ea cand i s-au incarcat imaginile. La dublu click pe `index.html` sau fara internet ramane cea desenata.
Contururile tarilor sunt in `assets/js/countries.js`; orasele sunt primul loc (`stops`) al fiecarei mobilitati din `data.js`.

## Harta fiecarei mobilitati (Daily activities)
E o harta adevarata, cu strazi si orase, pe care se poate da zoom.
- Click pe un pin sau pe cardul unui loc: harta se duce la locul acela. Butonul cu patru colturi (stanga sus) arata din nou toata calatoria.
- Locurile foarte apropiate (cele din centrul Brasovului) apar ca un singur pin, de exemplu „1–3”. Click pe el apropie harta pana se despart.
- Liniile galbene sunt cate una pentru fiecare zi: pleaca de la scoala si trec prin locurile zilei. Leaga doar locurile, nu urmeaza soseaua. Cand alegi un loc, ramane aprinsa linia zilei lui.
- Pe telefon harta se trage cu un deget si se mareste cu doua degete (sau cu butoanele + si -). Pagina se deruleaza atingand in afara hartii.
- Biblioteca hartii (Leaflet) e pe site, in `assets/vendor/leaflet`. Imaginile hartii vin de pe internet (OpenStreetMap); de aceea sursa e scrisa in coltul hartii si in pagina Legal. Adresa lor e `TILES`, sus in sectiunea hartii din `assets/js/journey.js`.
- Fara internet, sau cand pagina e deschisa cu dublu click, harta apare fara imagini (doar pini, trasee si numele locurilor). Daca nici biblioteca nu se incarca, apare harta simpla, desenata de noi.
- Culoarea hartii: `--map-filter` din `assets/css/pages.css`.

## Cum schimbi textele, pozele si harta
Totul e in `assets/js/data.js`:
- `project`: codul proiectului, durata, email, Instagram, numarul de elevi
- `schools`: cele 3 scoli (text, profesor, site, data mobilitatii)
- `mobilities`: cele trei mobilitati, in ordinea reala (Brasov, Orsay, Fjerritslev). Fiecare are cele 5 rubrici cerute de proiect, aceleasi la toate trei:
  - `about` = 1. About the mobility (tema, prezentarea, obiectivele, grupurile, programul PDF, o poza)
  - `materials` = 2. Learning materials & student projects, pe cele patru subcategorii A-D (`materialCats`)
  - `days` + `stops` = 3. Daily activities: zilele, apoi locurile de pe harta (lat / lon din Google Maps) cu pozele de la fiecare loc
  - `results` = 4. Evaluation & results
  - `dissemination` = 5. Dissemination (linkuri catre articole si postari)
- `journal`: articolele din jurnal (cel mai nou primul)

Ce e intre `[ ]` trebuie completat. Pe site apare colorat in albastru, ca sa se vada.

Pozele le pui de exemplu in `media/poze/` si scrii in data.js:
`{ type: 'photo', src: 'media/poze/prejmer-1.jpg', caption: 'Prejmer, in the morning' }`

## UPLOAD (in locul lui Contact din meniu)
Pagina `upload.html`: cere o parola, apoi arata formularul prin care se urca poze, video-uri, articole, materiale, rezultate, linkuri si (doar profesorii si adminul) informatiile mobilitatii, zilele si locurile de pe harta. Ce se urca apare imediat pe site, la toata lumea. Contact a ramas pagina, dar se ajunge la ea doar din subsol (Follow).

Fisierele:
- `_worker.js` = partea de server (ruleaza la Cloudflare, nu in browser). Verifica parolele, primeste fisierele, le pune in R2 si tine in baza de date D1 cine a urcat ce. Sus in fisier sunt limitele (`MAX`: poza 25 MB, video 300 MB, document 100 MB).
- `_routes.json` = spune Cloudflare ca doar `/api/...` si `/media/...` trec prin server; restul site-ului se da direct.
- `assets/js/upload.js` = pagina UPLOAD. `assets/js/cloud.js` = adauga ce s-a urcat peste `data.js`, pe toate paginile.
- stilul e la finalul lui `assets/css/pages.css` (clasele `.up-...`).

Ce trebuie legat o singura data de proiectul Cloudflare Pages (Settings):
- `DB` = o baza de date D1
- `MEDIA` = un bucket R2
- `ADMIN_KEY` = secret: parola ta de admin, minimum 10 caractere
Pana atunci site-ul merge normal, iar UPLOAD spune „Upload is not switched on yet”.

Parolele:
- Intri cu `ADMIN_KEY` si, in dreapta, la „Access keys”, faci cate parole vrei, pe doua feluri: Students si Teachers. Parola noua se vede o singura data, atunci cand o faci.
- Elevii pot edita si sterge doar ce au urcat de pe dispozitivul lor. Profesorii pot edita si sterge orice si vad in plus „Mobility info” si „Days & places”. Doar adminul vede cine a urcat fiecare lucru (numele scris la intrare + parola folosita).
- „Turn off” la o parola ii scoate pe toti cei care au intrat cu ea; ce au urcat ramane. Daca schimbi `ADMIN_KEY`, iesi si tu de pe toate dispozitivele.
- Dupa 8 parole gresite de pe aceeasi adresa, urmeaza 15 minute de pauza.
- Parolele nu sunt nicaieri in fisierele site-ului. In browser ramane doar un cod de acces al dispozitivului (`localStorage`, „erasmus-upload”), de aceea nu mai cere parola a doua oara.

Ce se intampla cu fisierele:
- Pozele se micsoreaza in browser inainte de upload (latura lunga 2560 px, WebP la calitate 90%, plus una mica pentru liste). Setarile: `PHOTO`, sus in `upload.js`. Asa dispare si locul (GPS) din datele pozei.
- Video-urile urca asa cum sunt, cele mari in bucati de 20 MB. PDF-ul se deschide in pagina; PowerPoint si Word se descarca.
- Pozele adevarate apar in Gallery inaintea locurilor goale, iar articolele scrise inaintea celor goale din Journal. Cand un loc primeste prima poza, locurile lui goale dispar.
- La Results textele se aduna unul sub altul. „Mobility info” si „Days & places” inlocuiesc ce era.

Ca sa il incerci pe calculator, cu server cu tot (are nevoie de Node.js), in folderul `site-v2`:

    npx wrangler pages dev . --d1 DB --r2 MEDIA --binding ADMIN_KEY=o-parola-de-proba

si deschizi `http://localhost:8788/upload.html`. Cu `porneste-site.bat` site-ul merge, dar UPLOAD nu (acolo nu exista server).

## Cand il punem live
Copiezi ce e in `site-v2` peste `site` (folderul `site/media` ramane cum e).
Nu copia `node_modules`, `tests`, `scripts`, `porneste-site.bat`, `package.json`, `package-lock.json` si `README.md`: sunt doar pentru lucru si verificari, site-ul nu are nevoie de ele (`node_modules` are peste o mie de fisiere).
Inainte sa copiezi, ruleaza o data `node scripts/build-page-templates.cjs`, ca sa fii sigur ca trecerea intre pagini arata ultimele texte.
`_worker.js` si `_routes.json` trebuie sa ajunga in radacina folderului publicat (langa `index.html`), altfel UPLOAD nu are server.
Pagina 404 merge asa cum e pe erasmus-rofrdk.com. Daca site-ul ar sta intr-un subfolder, schimbi `ROOT` in `404.html`.
