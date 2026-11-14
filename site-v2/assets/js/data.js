/* =========================================================
   TOT CONTINUTUL SITE-ULUI E AICI.
   Schimbi textul aici si se schimba pe toate paginile.
   Ce e intre [ ] trebuie completat.
   ========================================================= */
window.SITE = {

  project: {
    name: 'United in Diversity, Stronger Through Participation',
    programme: 'Erasmus+',
    code: '2026-1-RO01-KA121-SCH-000448210',
    email: 'liceulhonterus@yahoo.com',
    // autoritatea care da banii (agentia nationala). In disclaimerul UE apare numele ei.
    grantAuthority: 'ANPCDEFP',
  },

  // cele trei scoli (ordinea = ordinea mobilitatilor: Brasov, Orsay, Fjerritslev)
  schools: [
    {
      id: 'ro', n: '01', name: 'Colegiul Național „Johannes Honterus”', city: 'Brașov', country: 'Romania',
      url: 'https://liceulhonterusbrasov.ro/lic/',
      address: 'Curtea Honterus 3, 500025 Brașov, Romania',
      text: 'One of the oldest schools in Romania. Johannes Honterus started it in 1541, in the old town of Brașov.',
      teacher: '[Name]', students: '[NR]', date: '16–20 Nov 2026',
    },
    {
      id: 'fr', n: '02', name: 'Cours Secondaire d\'Orsay', city: 'Orsay', country: 'France',
      url: 'https://cours-secondaire-orsay.fr/',
      address: '11 rue de Courtaboeuf, 91400 Orsay, France',
      text: 'A school in Orsay, a small town south of Paris. It has a primary school, a middle school and a high school in one place.',
      teacher: '[Name]', students: '[NR]', date: '[DATE]',
    },
    {
      id: 'dk', n: '03', name: 'Fjerritslev Gymnasium', city: 'Fjerritslev', country: 'Denmark',
      url: 'https://www.fjerritslev-gym.dk/english/',
      address: 'Skovbrynet 9, 9690 Fjerritslev, Denmark',
      text: 'An upper secondary school with around 300 students. It is in the north of Denmark, between the North Sea and the Limfjord.',
      teacher: '[Name]', students: '[NR]', date: '[DATE]',
    },
  ],


  // oamenii din spatele proiectului (pagina About)
  team: [
    { name: '[Name]', role: 'Coordinating teacher', org: 'Colegiul Național „Johannes Honterus”' },
    { name: '[Name]', role: 'Coordinating teacher', org: 'Cours Secondaire d\'Orsay' },
    { name: '[Name]', role: 'Coordinating teacher', org: 'Fjerritslev Gymnasium' },
    { name: 'Website team', role: 'Design and code', org: 'Students of Colegiul Național „Johannes Honterus”' },
  ],


  /* -------------------------------------------------------
     MOBILITATILE (ordinea reala: Brasov, Orsay, Fjerritslev)
     Fiecare mobilitate are cele 5 rubrici cerute, aceleasi la toate trei. Pe pagina Journey sunt taburile de sub orase:
       about         = 1. About the mobility
       materials     = 2. Learning materials & student projects (cat: 'a', 'b', 'c' sau 'd', vezi materialCats mai jos)
       days + stops  = 3. Daily activities (zilele + locurile de pe harta)
       results       = 4. Evaluation & results
       dissemination = 5. Dissemination
     Fisierele (PDF, prezentari) le pui de exemplu in media/docs/ si scrii calea la file / programme:
       { cat: 'b', title: 'Council Square', by: 'Romanian students', file: 'media/docs/council-square.pdf' }
     La dissemination, url = linkul catre articol sau postare.

     LOCURILE DE PE HARTA (stops)
     town = orasul locului; in UPLOAD locurile sunt grupate dupa el (fara town: orasul mobilitatii)
     lat / lon = coordonatele locului (din Google Maps: click dreapta pe loc)
     media = pozele si video-urile de la locul respectiv:
       { type: 'photo', src: 'media/poze/prejmer-1.jpg', caption: '...' }
       { type: 'video', src: 'media/video/prejmer.mp4', poster: 'media/poze/prejmer.jpg', caption: '...' }
       { type: 'video', embed: 'https://drive.google.com/file/d/ID/preview', caption: '...' }   (Google Drive / YouTube)
     Cat timp src e gol, apare un loc gol frumos in locul pozei.
     ------------------------------------------------------- */
  // cele patru subcategorii de la rubrica 2 (aceleasi pentru toate mobilitatile)
  materialCats: [
    { id: 'a', name: 'School, city & country presentations', text: 'Presentations made by the students about their school, their city and their country.' },
    { id: 'b', name: 'Cultural heritage: presentations', text: 'Short presentations about the historical and cultural places we visited.' },
    { id: 'c', name: 'Worksheets: learning through discovery', text: 'The worksheets prepared for the educational visits and the materials used in the workshops, in their original form, so they can be used again.' },
    { id: 'd', name: 'Students\' projects & reflections', text: 'What the students made alone or in teams: answers to the worksheets, conclusions and reflections.' },
  ],

  mobilities: [
    {
      id: 'ro', n: '01', city: 'Brașov', country: 'Romania', date: '16–20 Nov 2026',
      labels: [{ t: 'Brașov', lat: 45.665, lon: 25.60 }, { t: 'Prejmer', lat: 45.735, lon: 25.776 }, { t: 'Bran', lat: 45.50, lon: 25.367 }, { t: 'Sinaia', lat: 45.345, lon: 25.55 }],
      about: {
        theme: 'United in Diversity, Stronger Through Participation',
        text: 'For one week in November, students and teachers from Brașov and Orsay meet at Colegiul Național „Johannes Honterus” to explore what it means to be united in diversity. Through workshops, a City Rally and visits to Sinaia, Bușteni, Prejmer, Piatra Craiului and Bran, we look at democracy, European identity and how different communities live together. We want to learn from each other, work in international teams and see how taking part makes a community stronger.',
        goals: ['[Goal 1]', '[Goal 2]', '[Goal 3]'],
        groups: '[How many students and teachers came from each school.]',
        programme: '',   // programul mobilitatii (PDF), de ex. 'media/docs/programme-romania.pdf'
        photo: 'assets/img/brasov.webp',   // poza reprezentativa a mobilitatii
      },
      // zilele mobilitatii. journal = id-ul articolului din jurnal pentru ziua aceea (vezi mai jos, la journal)
      days: [
        { day: 'Monday', date: '16 November', title: 'Welcome to Brașov', text: 'Welcome of the participants, getting-to-know-each-other activities, presentations of the schools, cities and countries, and a tour of Brașov.', journal: 'ro-day-1' },
        { day: 'Tuesday', date: '17 November', title: 'Democracy, Diversity and Dialogue', text: 'The workshop, the cultural visits and the City Rally, with moments and results from the group activities.', journal: 'ro-day-2' },
        { day: 'Wednesday', date: '18 November', title: 'European Identity: Past and Present', text: 'A cultural trip to Sinaia and Bușteni, with visits to Pelișor Castle and Cantacuzino Castle.', journal: 'ro-day-3' },
        { day: 'Thursday', date: '19 November', title: 'Solidarity and Coexistence', text: 'Visits to the Prejmer Fortified Church, the Piatra Craiului Visitor Centre and Bran Castle.', journal: 'ro-day-4' },
        { day: 'Friday', date: '20 November', title: 'United in Diversity', text: 'Debriefing and conclusions, the evaluation of the mobility, the certificates and the artistic programme.', journal: 'ro-day-5' },
      ],
      // Pelisor, Cantacuzino si Centrul de vizitare au coordonate aproximative: verifica-le in Google Maps.
      stops: [
        { id: 'ro-school', town: 'Brașov', title: 'Colegiul Național „Johannes Honterus”', when: 'Monday · 16 November', text: 'We welcome our guests from Orsay, get to know each other and present our schools, cities and countries.', lat: 45.6406, lon: 25.5878, media: 'pppvppp' },
        { id: 'ro-old-town', town: 'Brașov', title: 'Brașov old town', when: 'Monday · 16 November', text: 'A walk through the medieval centre of Brașov, from Council Square and the Black Church to the old city gates.', lat: 45.6426, lon: 25.5886, media: 'ppvpp' },
        { id: 'ro-city-rally', town: 'Brașov', title: 'City Rally', when: 'Tuesday · 17 November', text: 'In mixed Romanian–French teams, we explore the city and solve tasks about its history and its people.', lat: 45.6389, lon: 25.5856, media: 'pppp' },
        { id: 'ro-pelisor', town: 'Sinaia', title: 'Pelișor Castle, Sinaia', when: 'Wednesday · 18 November', text: 'A smaller castle next to Peleș, built for the Romanian royal family and known for its Art Nouveau rooms.', lat: 45.3590, lon: 25.5405, media: 'pppvp' },
        { id: 'ro-cantacuzino', town: 'Bușteni', title: 'Cantacuzino Castle, Bușteni', when: 'Wednesday · 18 November', text: 'A castle built in the Neo-Romanian style, with a wide view of the Bucegi Mountains.', lat: 45.4190, lon: 25.5400, media: 'pppp' },
        { id: 'ro-prejmer', town: 'Prejmer', title: 'Prejmer Fortified Church', when: 'Thursday · 19 November', text: 'One of the best-kept fortified churches in Europe and a UNESCO World Heritage Site. Its thick walls protected the whole village during attacks.', lat: 45.7224, lon: 25.7718, media: 'pppvp' },
        { id: 'ro-piatra-craiului', town: 'Zărnești', title: 'Piatra Craiului Visitor Centre', when: 'Thursday · 19 November', text: 'We learn about Piatra Craiului National Park and why its nature needs to be protected.', lat: 45.5600, lon: 25.3050, media: 'ppp' },
        { id: 'ro-bran', town: 'Bran', title: 'Bran Castle', when: 'Thursday · 19 November', text: 'A medieval fortress on the old road between Transylvania and Wallachia, known around the world for the Dracula legend.', lat: 45.5149, lon: 25.3672, media: 'ppvpp' },
      ],
      materials: [
        { cat: 'a', title: 'Our School: Colegiul Național „Johannes Honterus”', by: 'Romanian students', file: '' },
        { cat: 'a', title: 'Our School: Cours Secondaire d\'Orsay', by: 'French students', file: '' },
        { cat: 'a', title: 'Our City', by: 'Romanian and French students', file: '' },
        { cat: 'a', title: 'Our Country: Romania and France', by: 'Romanian and French students', file: '' },
        { cat: 'a', title: 'Multicultural Brașov: the minorities of Brașov', by: 'Romanian students', file: '' },
        { cat: 'b', title: 'Catherine\'s Gate (Poarta Ecaterinei)', by: 'The Erasmus+ team of Colegiul Național „Johannes Honterus”', file: '' },
        { cat: 'b', title: 'Șchei Gate (Poarta Șchei)', by: 'The Erasmus+ team of Colegiul Național „Johannes Honterus”', file: '' },
        { cat: 'b', title: 'Council Square (Piața Sfatului)', by: 'The Erasmus+ team of Colegiul Național „Johannes Honterus”', file: '' },
        { cat: 'b', title: 'Prejmer Fortified Church', by: 'The Erasmus+ team of Colegiul Național „Johannes Honterus”', file: '' },
        { cat: 'c', title: 'Worksheet: Pelișor Castle', by: '', file: '' },
        { cat: 'c', title: 'Worksheet: Cantacuzino Castle', by: '', file: '' },
        { cat: 'c', title: 'Worksheet: Prejmer Fortified Church', by: '', file: '' },
        { cat: 'c', title: 'Worksheet: Piatra Craiului National Park Visitor Centre', by: '', file: '' },
        { cat: 'c', title: 'Worksheet: Bran Castle', by: '', file: '' },
        { cat: 'd', title: 'Posters and presentations made in international teams', by: '', file: '' },
        { cat: 'd', title: 'Results of the group activities', by: '', file: '' },
        { cat: 'd', title: 'Examples of completed worksheets', by: '', file: '' },
        { cat: 'd', title: 'What Have We Learned? Conclusions and reflections', by: '', file: '' },
      ],
      results: [
        { title: 'Feedback from students and teachers', text: '[What students and teachers said about the mobility.]' },
        { title: 'Impressions', text: '[A few impressions from the week.]' },
        { title: 'Conclusions', text: '[The main conclusions of the mobility.]' },
        { title: 'Results and our goals', text: '[What we achieved, compared with the goals of the mobility.]' },
        { title: 'Skills and knowledge', text: '[What the students learned and which skills they developed.]' },
        { title: 'Questionnaires (initial and final)', text: '[The questionnaires filled in by the students before and after the mobility.]' },
      ],
      dissemination: [
        { where: 'School website', title: '[Title of the article]', url: '' },
        { where: 'Facebook', title: '[Post]', url: '' },
        { where: 'Press', title: '[Title of the article]', url: '' },
        { where: 'School community', title: '[Presentation of the experience]', url: '' },
        { where: 'Press releases & promotion', title: '[Press release or promotional material]', url: '' },
      ],
    },
    {
      id: 'fr', n: '02', city: 'Orsay', country: 'France', date: '[DATE]',
      labels: [{ t: 'Orsay', lat: 48.70, lon: 2.20 }, { t: 'Paris', lat: 48.862, lon: 2.36 }],
      about: {
        theme: '[Theme of the mobility]',
        text: '[A short presentation of the mobility: what it was about and what we wanted to learn.]',
        goals: ['[Goal 1]', '[Goal 2]', '[Goal 3]'],
        groups: '[How many students and teachers came from each school.]',
        programme: '',   // programul mobilitatii (PDF), de ex. 'media/docs/programme-fr.pdf'
        photo: '',       // o poza reprezentativa, de ex. 'media/poze/fr-group.jpg'
      },
      days: [
        { day: 'Day 1', date: '[DATE]', title: '[Title of the day]', text: '[A short description of the day.]', journal: 'fr-entry-1' },
        { day: 'Day 2', date: '[DATE]', title: '[Title of the day]', text: '[A short description of the day.]', journal: 'fr-entry-2' },
      ],
      materials: [
        { cat: 'a', title: '[Title of the presentation]', by: '[Who made it]', file: '' },
        { cat: 'b', title: '[Title of the presentation]', by: '[Who made it]', file: '' },
        { cat: 'c', title: '[Title of the worksheet]', by: '', file: '' },
        { cat: 'd', title: '[Title of the project]', by: '[Who made it]', file: '' },
      ],
      results: [
        { title: 'Feedback from students and teachers', text: '[What students and teachers said about the mobility.]' },
        { title: 'Impressions', text: '[A few impressions from the week.]' },
        { title: 'Conclusions', text: '[The main conclusions of the mobility.]' },
        { title: 'Results and our goals', text: '[What we achieved, compared with the goals of the mobility.]' },
        { title: 'Skills and knowledge', text: '[What the students learned and which skills they developed.]' },
        { title: 'Questionnaires (initial and final)', text: '[The questionnaires filled in by the students before and after the mobility.]' },
      ],
      dissemination: [
        { where: 'School website', title: '[Title of the article]', url: '' },
        { where: 'Facebook', title: '[Post]', url: '' },
        { where: 'Press', title: '[Title of the article]', url: '' },
        { where: 'School community', title: '[Presentation of the experience]', url: '' },
        { where: 'Press releases & promotion', title: '[Press release or promotional material]', url: '' },
      ],
      stops: [
        { id: 'fr-school', town: 'Orsay', title: 'Cours Secondaire d\'Orsay', when: 'Day 1 · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 48.6958, lon: 2.1905, media: 'pppvpp' },
        { id: 'fr-2', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 48.8566, lon: 2.3522, media: 'ppvpp' },
        { id: 'fr-3', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 48.8049, lon: 2.1204, media: 'pppp' },
      ],
    },
    {
      id: 'dk', n: '03', city: 'Fjerritslev', country: 'Denmark', date: '[DATE]',
      labels: [{ t: 'Fjerritslev', lat: 57.075, lon: 9.30 }, { t: 'North Sea coast', lat: 57.18, lon: 9.12 }, { t: 'Limfjord', lat: 56.99, lon: 9.30 }],
      about: {
        theme: '[Theme of the mobility]',
        text: '[A short presentation of the mobility: what it was about and what we wanted to learn.]',
        goals: ['[Goal 1]', '[Goal 2]', '[Goal 3]'],
        groups: '[How many students and teachers came from each school.]',
        programme: '',   // programul mobilitatii (PDF), de ex. 'media/docs/programme-dk.pdf'
        photo: '',       // o poza reprezentativa, de ex. 'media/poze/dk-group.jpg'
      },
      days: [
        { day: 'Day 1', date: '[DATE]', title: '[Title of the day]', text: '[A short description of the day.]', journal: 'dk-entry-1' },
        { day: 'Day 2', date: '[DATE]', title: '[Title of the day]', text: '[A short description of the day.]', journal: 'dk-entry-2' },
      ],
      materials: [
        { cat: 'a', title: '[Title of the presentation]', by: '[Who made it]', file: '' },
        { cat: 'b', title: '[Title of the presentation]', by: '[Who made it]', file: '' },
        { cat: 'c', title: '[Title of the worksheet]', by: '', file: '' },
        { cat: 'd', title: '[Title of the project]', by: '[Who made it]', file: '' },
      ],
      results: [
        { title: 'Feedback from students and teachers', text: '[What students and teachers said about the mobility.]' },
        { title: 'Impressions', text: '[A few impressions from the week.]' },
        { title: 'Conclusions', text: '[The main conclusions of the mobility.]' },
        { title: 'Results and our goals', text: '[What we achieved, compared with the goals of the mobility.]' },
        { title: 'Skills and knowledge', text: '[What the students learned and which skills they developed.]' },
        { title: 'Questionnaires (initial and final)', text: '[The questionnaires filled in by the students before and after the mobility.]' },
      ],
      dissemination: [
        { where: 'School website', title: '[Title of the article]', url: '' },
        { where: 'Facebook', title: '[Post]', url: '' },
        { where: 'Press', title: '[Title of the article]', url: '' },
        { where: 'School community', title: '[Presentation of the experience]', url: '' },
        { where: 'Press releases & promotion', title: '[Press release or promotional material]', url: '' },
      ],
      stops: [
        { id: 'dk-school', town: 'Fjerritslev', title: 'Fjerritslev Gymnasium', when: 'Day 1 · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 57.0849, lon: 9.2655, media: 'ppvppp' },
        { id: 'dk-2', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 57.1390, lon: 9.2200, media: 'pvpp' },
        { id: 'dk-3', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 57.0460, lon: 9.4300, media: 'ppp' },
      ],
    },
  ],

  /* -------------------------------------------------------
     JURNALUL: cel mai nou primul (Brasov a fost prima mobilitate, deci zilele ei sunt jos)
     Un articol pentru fiecare zi. body = paragrafele articolului
     ------------------------------------------------------- */
  journal: [],   // articolele vin prin UPLOAD
};

/* ---------- de aici in jos nu trebuie schimbat nimic ---------- */
(() => {
  const S = window.SITE;
  // media scrise scurt ('ppvp' = poza, poza, video, poza) devin locuri goale pentru poze
  for (const m of S.mobilities) {
    for (const st of m.stops) {
      if (typeof st.media === 'string') {
        st.media = [...st.media].map((c, i) => ({ type: c === 'v' ? 'video' : 'photo', src: '', caption: `${c === 'v' ? 'Video' : 'Photo'} ${i + 1} · ${st.title}` }));
      }
      st.media.forEach(md => { md.mob = m.id; md.stop = st.id; md.place = st.title; md.city = m.city; });
    }
  }
  S.mob = id => S.mobilities.find(m => m.id === id);
  S.school = id => S.schools.find(s => s.id === id);
  S.allMedia = () => S.mobilities.flatMap(m => m.stops.flatMap(st => st.media)).filter(x => x.src || x.embed);   // Gallery: fara locuri goale
})();
