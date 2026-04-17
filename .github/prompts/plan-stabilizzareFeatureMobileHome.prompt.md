## Plan: Stabilizzare Feature Mobile Home

Obiettivo: risolvere su Android Chrome i due sintomi confermati (dati persi dopo refresh e layout sovrapposto) nella Home, con una correzione mobile-first completa ma a basso rischio di regressioni su desktop/PWA.

**Steps**
1. Fase 1 - Baseline e criteri di accettazione
Definire una checklist di riproduzione su Home (portrait/landscape, refresh, toggle in-progress, quick actions, clear data) e i criteri di successo: persistenza stabile dei campi, nessuna sovrapposizione UI a 320-412px, nessun blocco su tap rapidi. Questa fase blocca tutte le successive.

2. Fase 2 - Hardening persistenza dati (dipende da 1)
Introdurre un livello di accesso storage robusto in script.js, sostituendo accessi diretti a localStorage con wrapper sicuri (try/catch + validazione JSON + fallback in-memory quando storage non disponibile/quota piena). Garantire che save/load/clear non interrompano il flusso UI e che i default vengano applicati solo su stato realmente vuoto/corrotto.

3. Fase 3 - Layout mobile-first Home (dipende da 1, parallel con 2)
Rifinire breakpoint e componenti critici in style.css: campi numerici, griglie record, tracker round, tabelle e toast, ottimizzando per larghezze 320-480px senza introdurre regressioni oltre 600px. Ridurre cause di overlap (spinners input, min-width rigidi, padding eccessivi, colonne non adattive).

4. Fase 4 - Interazioni touch e fluidità (dipende da 2 e 3)
Aggiornare gestione eventi nei controlli round/quick actions in script.js per comportamento affidabile su touch (pointer/touch strategy coerente), evitare ritardi percepiti e ridurre jank da rebuild frequenti. Rimuovere/attenuare smooth scroll aggressivo nei punti di auto-scroll per migliorare stabilità su mobile.

5. Fase 5 - Robustezza PWA su mobile (dipende da 2, parallel con 3)
Rafforzare service-worker.js con versione cache aggiornata e fallback HTML offline più utile; verificare coerenza di registrazione SW in index.html e percorsi cacheati. Ridurre rischio di stato vecchio o fallback testuale non gestibile su telefono.

6. Fase 6 - Verifica end-to-end e regressione (dipende da 4 e 5)
Eseguire test manuali su Android Chrome reale + emulazione (360x800, 375x667, 412x915), includendo refresh multipli, chiusura/riapertura tab, rotazione schermo, modalità offline, tap rapidi round tracker e calcolo risultati. Validare che i dati persistano e il layout resti integro in tutte le combinazioni principali.

**Relevant files**
- c:/Users/Raffaghello/Desktop/mtg-top8-calculator/script.js — storage key flow (saveTournamentData/loadTournamentData/clearTournamentData), round tracker (buildRoundTracker/onRoundBtnClick), auto-scroll e listener input.
- c:/Users/Raffaghello/Desktop/mtg-top8-calculator/style.css — breakpoint max-width 600 e nuovi breakpoint 480/380 per input/tabelle/quick actions/toast.
- c:/Users/Raffaghello/Desktop/mtg-top8-calculator/index.html — attributi input mobili e coerenza registrazione service worker lato pagina Home.
- c:/Users/Raffaghello/Desktop/mtg-top8-calculator/service-worker.js — strategia cache/fallback offline/versioning.

**Verification**
1. Test persistenza: impostare valori in Home, ricaricare 5 volte, chiudere e riaprire tab, verificare mantenimento di players/prize/toggle/record/roundResults.
2. Test layout: controllare Home a 320, 360, 375, 412 px in portrait e landscape; nessun overlap su input, tracker, tabelle, pulsanti CTA.
3. Test interazione: 20 tap rapidi su round tracker/quick action; nessun tap perso, nessun freeze visibile, record coerente.
4. Test PWA offline: con SW attivo passare offline e ricaricare; niente pagina bianca, fallback leggibile, ritorno online senza stato incoerente.
5. Test regressione desktop: larghezze >= 1024, flusso completo invariato (calcolo, strategie, tabella soglie, clear data).

**Decisions**
- Incluso: solo Home (index/script/style/service worker) come richiesto.
- Escluso: interventi funzionali su Day2, salvo eventuale allineamento minimo di utility condivise se emerge dipendenza tecnica.
- Approccio: correzione completa mobile-first, non patch minima.

**Further Considerations**
1. Se vuoi, possiamo includere anche un banner non invasivo quando il salvataggio fallisce (quota/storage bloccato), utile per diagnosi utente finale.
2. Se prevedi update frequenti, conviene introdurre versione schema dati (es. v2) per migrazioni sicure tra release.
3. Se l’app verrà usata spesso in venue con rete debole, valutare precache più esplicito delle risorse critiche della Home.