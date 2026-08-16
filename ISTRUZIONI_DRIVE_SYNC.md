# Valutazione render QUBLY - Drive + Google Sheets

Questa cartella e' pronta per essere caricata su Google Drive e usata da piu' PC.

## 1. Carica la cartella

Carica l'intera cartella `valutazione_render` su Google Drive, mantenendo tutti i file e sottocartelle.

Per usare l'interfaccia, il modo piu' stabile e' installare Google Drive per desktop sui PC, sincronizzare la cartella e aprire `index.html` dalla cartella locale sincronizzata.

## 2. Crea il Google Sheet dei voti

1. Crea un nuovo Google Sheet.
2. Apri `Estensioni > Apps Script`.
3. Cancella il codice iniziale.
4. Incolla tutto il contenuto di `apps-script/Code.gs`.
5. Salva il progetto.

## 3. Pubblica lo script

1. In Apps Script premi `Distribuisci > Nuova distribuzione`.
2. Tipo: `App web`.
3. Esegui come: `Me`.
4. Accesso: `Chiunque`.
5. Autorizza lo script.
6. Copia l'URL della Web App.

Il token interno e' gia' impostato in `sync-config.js` e in `apps-script/Code.gs`.

## 4. Collega l'interfaccia

Apri `sync-config.js` e incolla l'URL copiato nel campo `webAppUrl`.

Esempio:

```js
webAppUrl: "https://script.google.com/macros/s/....../exec",
```

## 5. Migra i voti locali esistenti

Apri `index.html` sul PC che contiene gia' i voti salvati, per esempio quelli di Vlad.

Quando la sync e' configurata, premi `Carica locali`. I dati locali vengono copiati nel Google Sheet e diventano visibili dagli altri PC.

## 6. Uso quotidiano

Ogni persona seleziona il proprio nome nell'interfaccia e vota normalmente. I voti e le classifiche vengono salvati nel Google Sheet. Gli altri PC li ricaricano automaticamente ogni pochi secondi.
