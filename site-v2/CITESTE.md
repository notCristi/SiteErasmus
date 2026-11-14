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
- `project`: codul proiectului, email, autoritatea finantatoare
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
- `_worker.js` = partea de server (ruleaza la Cloudflare, nu in browser). Verifica parolele, primeste fisierele, le pune in R2 (sau in Cloudflare Images / Stream, vezi mai jos) si tine in baza de date D1 cine a urcat ce. Sus in fisier sunt limitele (`MAX`: poza 25 MB, video 300 MB, document 100 MB).
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
- Dupa 1000 de parole gresite de pe aceeasi adresa, urmeaza 15 minute de pauza.
- Elevii si profesorii raman logati pentru totdeauna pe dispozitivul lor (pana la „Log out” sau pana opresti parola). Adminul iese dupa 24 de ore fara activitate sau la 7 zile de la logare.
- Nu exista limita zilnica de upload si nici limita de upload-uri neterminate. Ramane doar plafonul total de spatiu.
- Parolele nu sunt nicaieri in fisierele site-ului. In browser ramane doar un cod de acces al dispozitivului (`localStorage`, „erasmus-upload”), de aceea nu mai cere parola a doua oara.

### Pozele in Cloudflare Images, video-urile in Cloudflare Stream
Cu pachetul „Images & Stream Starter Bundle” (5 $ pe luna), pozele noi se tin in Cloudflare Images, iar video-urile noi in Cloudflare Stream. Documentele (PDF, PowerPoint, Word...) raman in R2.

Ce trebuie legat o singura data de proiectul Cloudflare Pages (Settings > Variables and Secrets), si la Production, si la Preview:
- `CF_ACCOUNT_ID` = variabila simpla: Account ID-ul contului (32 de caractere, se vede in dashboard)
- `CF_MEDIA_TOKEN` = secret: un API token cu drepturile „Cloudflare Images: Edit” si „Stream: Edit”
Dupa ce le pui, e nevoie de o publicare noua (Retry deployment). Fara ele, totul merge in R2, ca inainte.

Cum merge:
- O poza se urca o singura data (latura lunga 2560 px). Cloudflare face din ea si poza mica pentru liste (640 px) si o da fiecarui browser in formatul cel mai usor pe care il stie. Cele doua marimi („full” si „thumb”) le face serverul singur, la prima poza.
- Un video se vede in playerul Stream, care alege singur calitatea dupa internetul fiecaruia. Imediat dupa upload, Stream il prelucreaza (de obicei cam un minut); pana atunci playerul spune ca video-ul se prelucreaza.
- Adresele din pagini au ramas `/media/...`: serverul trimite de acolo browserul la poza sau la player. De aceea o postare pusa in Trash dispare in continuare de pe site, iar la stergerea definitiva fisierul e sters si din Images / Stream.
- In UPLOAD, adminul vede sub „Access keys & devices” trei contoare: R2, poze (din 100.000) si minute de video (din 1.000). Daca Images sau Stream dau o eroare, fisierul ajunge in R2 si eroarea apare acolo, sub contoare.
- Cand minutele de video se termina, video-urile noi merg in R2 (nu se plateste nimic in plus). Daca iei mai multe minute, schimba `STREAM_MAX_MIN` sus in `_worker.js` (la fel `IMAGES_MAX` pentru poze).
- Ce a fost urcat inainte in R2 ramane acolo si merge la fel.
- Pozele mai mari de 10 MB dupa micsorare si formatele pe care Images nu le primeste (AVIF) raman in R2.

Ce se intampla cu fisierele:
- Pozele se micsoreaza in browser inainte de upload (latura lunga 2560 px, WebP la calitate 90%; cand pozele merg in R2, urca si una mica pentru liste). Setarile: `PHOTO`, sus in `upload.js`. Asa dispare si locul (GPS) din datele pozei.
- Video-urile urca asa cum sunt, cele mari in bucati de 20 MB. PDF-ul se deschide in pagina; PowerPoint si Word se descarca.
- In Gallery apar doar pozele si video-urile adevarate. Articolele scrise apar inaintea celor goale din Journal. Cand un loc primeste prima poza, locurile lui goale dispar.
- La Results textele se aduna unul sub altul. „Mobility info” si „Days & places” inlocuiesc ce era.

Cum arata pagina (ghidul pas cu pas):
- Dupa parola: un card cu numele tau si butonul mare **Upload**, apoi **Your uploads** (ce ai urcat tu) si, pentru profesori si admin, **All uploads**. Adminul are acolo si Trash, plus parolele.
- Upload porneste ghidul: ce urci, pentru ce mobilitate, apoi cateva intrebari scurte (depind de tip), apoi **Preview**: exact cardul sau pozele cum apar pe site. La poze, descrierea se scrie direct sub fiecare poza din preview. Pentru altceva, mergi inapoi cu Back. **Publish now** il pune pe site.
- NEXT merge doar cand campurile obligatorii sunt scrise. La pasii optionali merge si SKIP. BACK pastreaza ce ai scris. Daca te intorci la lista, ramane un Draft cat timp pagina e deschisa.
- Pozele urcate impreuna sunt un grup (`group` in baza de date) si apar ca un singur rand, cu „Show all”. Cele urcate inainte de asta raman cate una.
- Editarea merge ca in aplicatiile cunoscute (Instagram, Facebook): fiecare rand din lista are butonul **...**, care deschide un meniu cu Edit, View on site si Delete.
- **Edit** deschide un singur ecran: Cancel in stanga sus, Save in dreapta sus, toate campurile pe o pagina, iar alaturi cardul asa cum apare pe site (se schimba in timp ce scrii). Save se aprinde doar dupa ce ai schimbat ceva. Cancel cu schimbari nesalvate intreaba intai „Discard changes?”. Dupa Save te intorci la lista si jos apare „Changes saved”.
- Nu mai exista creioanele de pe preview si nici Advanced edit. Fisierele publicate nu se pot inlocui (inca): stergi si urci din nou. In cod: `moreBtn`, `editHTML`, `editFields` si `edOptions` din `upload.js`; stilul e in ultima sectiune din `pages.css`.
- Locurile din formular sunt grupate pe orase: campul `town` al fiecarui loc din `data.js` (fara el, orasul mobilitatii).
- Din Trash scoate doar adminul.

Partea vizuala a ghidului (noiembrie 2026):
- In loc de liste lungi si bife, fiecare alegere e un card cu iconita sau desen: felul de upload (desene), mobilitatea (steagul), ziua (foaie de calendar), categoria, sectiunea de la Results, cine a facut materialul (steaguri). Cardul ales are margine galbena si o bifa.
- La pasii cu un singur raspuns, ghidul trece singur la pasul urmator dupa ce alegi un card. Se opreste cu `AUTO_NEXT = false`, sus in `upload.js`.
- Sus in card se vede ce ai ales pana acum (felul si mobilitatea). Click pe ele te duce inapoi la pasul acela. Bara de progres are cate un segment pentru fiecare pas.
- Sub numele tau, pe prima pagina, e randul „What do you want to add?”: un click pe un card porneste ghidul direct cu felul acela.
- Pozele alese apar ca o grila de miniaturi (cu X pe fiecare), nu ca o lista. Documentele raman pe un rand, cu foaia lor colorata.
- Iconitele sunt in `ICON`, desenele mari in `ART`, iar textele scurte de pe carduri in `SEC_UI`, `WHERE_UI` si `INFO_UI`, toate sus in `upload.js`. Stilul e in ultima sectiune din `pages.css`.
- Varianta de dinainte e in `site-v2-backup-2026-11-14-upload-vizual` (`upload.js` si `pages.css`). In subfolderul `inainte-de-edit` e `upload.js` cu editarea veche (creioane + Advanced edit).

**Modul demo:** deschide `upload.html?demo` (merge si cu dublu click, si cu `porneste-site.bat`). Arata tot formularul fara server; nimic nu ajunge pe site si totul dispare la refresh. Orice parola merge: una care contine „admin” te baga ca admin, una cu „prof” ca profesor, restul ca elev.

Ca sa il incerci pe calculator, cu server cu tot (are nevoie de Node.js), in folderul `site-v2`:

    npx wrangler pages dev . --d1 DB --r2 MEDIA --binding ADMIN_KEY=o-parola-de-proba

si deschizi `http://localhost:8788/upload.html`. Cu `porneste-site.bat` site-ul merge, dar UPLOAD nu (acolo nu exista server).

## Log-uri si erori (Cloudflare)
- La Cloudflare **Pages**, log-urile serverului nu se salveaza. Le vezi doar live, cat timp sunt deschise: Workers & Pages > siteerasmus > alegi deployment-ul (Production sau Preview) > Functions > Real-time logs. Sau in terminal: `npx wrangler pages deployment tail`.
- Cand serverul da o eroare 500, scrie in log o linie cu `"event":"server_error"`: metoda, adresa (`/api/...`), mesajul erorii si de unde vine. Pe pagina, raspunsul are acelasi `id` (8 caractere), ca sa gasesti usor linia potrivita in log.
- Baza de date D1 se actualizeaza singura, o singura data. Daca schimbi tabelele (`SCHEMA` sau `MIGRATIONS` in `_worker.js`), creste `SCHEMA_VERSION` cu 1. Altfel schimbarea nu se aplica.
- `favicon.ico`, `apple-touch-icon.png` si `robots.txt` stau in radacina, ca browserele si iPhone-urile sa nu mai primeasca 404. `robots.txt` le spune motoarelor de cautare sa nu intre pe `/api/` si pe `upload.html`.

## Cand il punem live
Copiezi ce e in `site-v2` peste `site` (folderul `site/media` ramane cum e).
Nu copia `node_modules`, `tests`, `scripts`, `porneste-site.bat`, `package.json`, `package-lock.json` si `README.md`: sunt doar pentru lucru si verificari, site-ul nu are nevoie de ele (`node_modules` are peste o mie de fisiere).
Inainte sa copiezi, ruleaza o data `node scripts/build-page-templates.cjs`, ca sa fii sigur ca trecerea intre pagini arata ultimele texte.
`_worker.js` si `_routes.json` trebuie sa ajunga in radacina folderului publicat (langa `index.html`), altfel UPLOAD nu are server.
Pagina 404 merge asa cum e pe erasmus-rofrdk.com. Daca site-ul ar sta intr-un subfolder, schimbi `ROOT` in `404.html`.
