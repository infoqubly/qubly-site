# Soluzione consigliata: pubblicare l'app come sito web gratuito

Google Drive non e' adatto a eseguire questa interfaccia direttamente:

- nel browser mostra `index.html` come anteprima/testo;
- con Drive per desktop alcuni file possono restare "solo online";
- se un'immagine non e' ancora scaricata sul PC, Chrome vede un file mancante.

Per farla funzionare subito su qualunque PC, pubblica questa cartella come sito statico gratuito.

Usa la versione con immagini originali PNG/JPG. Non usare la versione `WEB_OPTIMIZED`, perche' comprime le immagini e puo' alterare la valutazione della qualita' dei render.

## Opzione semplice: Netlify Drop

1. Apri <https://app.netlify.com/drop>
2. Trascina il file `QUBLY_valutazione_render_ORIGINAL_QUALITY_ZOOM_READY.zip`
3. Aspetta il caricamento.
4. Netlify ti dara' un URL tipo:

   `https://nome-casuale.netlify.app`

5. Apri quell'URL da tutti i PC.

Non serve Excel manuale: i voti continuano ad andare nel Google Sheet tramite Apps Script.

## Opzione piu' robusta: Cloudflare Pages

1. Apri Cloudflare Pages.
2. Crea un progetto con upload diretto.
3. Carica il contenuto della cartella o lo zip `QUBLY_valutazione_render_ORIGINAL_QUALITY_ZOOM_READY.zip`.
4. Usa l'URL generato da Cloudflare.

Questa opzione e' adatta alla versione originale: il file piu' grande del pacchetto e' sotto 25 MB.

## Importante

Prima di creare lo zip definitivo, verifica che `sync-config.js` contenga l'URL della Web App Google Apps Script:

```js
webAppUrl: "https://script.google.com/macros/s/.../exec",
```

Se `webAppUrl` e' vuoto, il sito mostra le immagini ma salva solo in locale.

## Privacy

Chi ha il link del sito puo' vedere le immagini e usare l'interfaccia. L'URL e' difficile da indovinare, ma non e' una protezione forte. Per un uso interno veloce e gratuito va bene; per dati riservati serve hosting con login.
