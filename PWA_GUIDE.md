# MTG Top 8 Calculator — Web App

Una calcolatrice per stimare la probabilità di fare Top 8 (o altre posizioni) nei tornei Swiss di Magic: The Gathering.

## Caratteristiche

- **Calcolatore Top N** - Seleziona la posizione di premio (Top 8, 16, 32, ecc.)
- **Analisi in diretta** - Se il torneo è ancora in corso, ricevi consigli strategici su che cosa fare
- **OMW% estimation** - Stima dei tiebreaker basata sul round-by-round
- **Tabella di soglie** - Visualizza tutte le possibili combinazioni di risultati finali
- **Modalità offline** - Funziona completamente offline una volta caricata

## Installazione come Web App (telefono/tablet)

### Su iOS (iPhone/iPad)
1. Apri il sito nel browser Safari
2. Tocca il pulsante **Condividi** (quadrato con freccia)
3. Seleziona **Aggiungi alla schermata Home**
4. Scegli il nome e tocca **Aggiungi**
5. L'app apparirà sulla home del tuo dispositivo

### Su Android (Chrome)
1. Apri il sito nel browser Chrome
2. Tocca il menu ⋮ (tre punti) in alto a destra
3. Seleziona **Installa app** o **Aggiungi a schermata home**
4. Conferma l'installazione
5. L'app apparirà nel drawer delle applicazioni

### Su computer (Desktop)
1. Apri il sito nel browser
2. Clicca il pulsante **Installa** nella barra degli indirizzi (se disponibile)
3. Oppure nel menu del browser seleziona "Installa app"

## Come funziona

### Modalità standard
1. Inserisci il numero di giocatori nel torneo
2. Seleziona la posizione di premio (Top 8, Top 16, ecc.)
3. Inserisci il tuo record finale (Win/Loss/Draw)
4. Premi "Calculate Probability"
5. Visualizza i risultati con tutte le soglie e le probabilità

### Modalità torneo in diretta
1. Attiva il toggle "Tournament in progress"
2. Inserisci i risultati round per round
3. Visualizza:
   - Consigli strategici (draw o play?)
   - Probabilità di fare la posizione di premio
   - Quanti win ti servono per essere sicuro
   - Stima dell'OMW% basata sugli avversari affrontati

## Struttura del progetto

```
mtg-top8-calculator/
├── index.html              # Pagina principale (Top 8 Calculator)
├── day2.html               # Pagina alternativa (Day 2 Calculator)
├── script.js               # Logica del Top 8 Calculator
├── day2.js                 # Logica del Day 2 Calculator
├── style.css               # Stili globali
├── manifest.json           # Manifesto PWA (icone, nome, colori)
├── service-worker.js       # Service Worker (cache e offline)
└── README.md               # Questo file
```

## Tecnologie utilizzate

- **HTML5** - Struttura semantica
- **CSS3** - Design moderno e responsive
- **Vanilla JavaScript** - Senza dipendenze
- **PWA (Progressive Web App)** - Installabile e offline-first
- **Service Worker** - Cache intelligente e funzionamento offline

## Calcoli matematici

### Formula del Threshold
Il threshold (numero di punti minimo) è calcolato in modo proporzionale:

```
prizePercentage = prizePosition / numPlayers

Se >= 50%:   basethreshold = maxPoints * 0.4
Se >= 25%:   basethreshold = maxPoints * 0.5
Se >= 12.5%: basethreshold = maxPoints * 0.65
Se >= 6.25%: basethreshold = maxPoints * 0.75
Altrimenti:  basethreshold = maxPoints * 0.83
```

### Probabilità
La probabilità si basa sulla differenza tra i punti attuali e il threshold:

```
Differenza >= 6: 100%
Differenza >= 3: 98%
Differenza >= 1: 92%
Differenza = 0:  75%
Differenza -1:   50%
Differenza -2:   25%
...
Differenza <= -5: 0%
```

I tiebreaker (OMW%) possono aumentare/diminuire la probabilità di ±15% nella zona critica.

## Deployment

### Localmente
Semplicemente apri `index.html` in un browser moderno.

### Su un server
1. Carica i file su un hosting (Netlify, Vercel, GitHub Pages, etc.)
2. Assicurati che il server supporti i mimetype corretti:
   - `manifest.json` → `application/manifest+json`
   - `service-worker.js` → `application/javascript`
3. HTTPS è **obbligatorio** per il Service Worker (eccetto localhost)

## Browser supportati

- Chrome 54+
- Firefox 52+
- Safari 11.1+
- Edge 79+

## Note importanti

- Le probabilità sono **stime** basate su matematica svizzera standard
- I tiebreaker reali (OMW%, GW%, OGW%) possono variare
- Questa è una tool **informativa**, non garantisce i risultati
- Funziona completamente offline una volta installata

## License

Open source - feel free to use and modify!

---

**Domande o suggerimenti?** Puoi migliorare questo tool aggiungendo nuove funzionalità o correggendo eventuali errori.
