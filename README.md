# Eris — presenza olografica

L’interfaccia presenta il volto della foto fornita dall’utente, con una resa olografica azzurra, dissolvenza dei bordi, una base di proiezione, particelle e illuminazione regolabile. Il precedente volto geometrico stilizzato è stato sostituito dal ritratto originale per mantenere profilo, proporzioni, occhi, circuiti e capelli riconoscibili.

## Resa del ritratto

Il ritratto è **2.5D**, con un rilievo stimato e un orientamento limitato a circa ±15° in orizzontale e ±5° in verticale. La foto viene proiettata su una superficie con profondità: non è un modello anatomico ricostruito a 360°. Questo limite è indicato anche nell’interfaccia. Il trascinamento, le frecce e la rotazione automatica orientano la proiezione; rotella e tasti `+`/`-` regolano lo zoom.

`public/assets/eris-portrait.png` conserva i pixel del riferimento originale a 740 × 740, convertito dall’allegato AVIF senza un’ulteriore compressione con perdita. `public/assets/eris-relief.png` contiene le maschere di rilievo, mobilità dei capelli e silhouette. Si rigenera con `python scripts/prepare-portrait.py`, che usa solo la libreria standard di Python. Le maschere sono registrate su questa specifica foto e vanno ridisegnate per un soggetto diverso.

`public/avatar.js` usa Three.js, servito localmente con licenza MIT, per la geometria, gli shader e le interazioni. La bocca e lo sguardo vengono animati deformando localmente i pixel della foto; le palpebre usano il dettaglio della superficie circostante. Il pulsante «Prova sguardo e sorriso» funziona anche senza sintesi vocale. Il movimento della bocca durante la voce è ritmico, senza allineamento fonetico. La risoluzione e le parti del volto disponibili restano quelle dell’immagine originale.

I capelli della foto si deformano con una maschera che mantiene fermi i punti di ancoraggio. Una molla smorzata riceve impulsi dall’orientamento e dai sensori; l’ascolto introduce un’ondulazione aggiuntiva. La luce del volto regola l’esposizione del ritratto, mentre la luce di profondità controlla l’alone posteriore, le particelle e la base di proiezione. Le animazioni spontanee seguono la preferenza di movimento ridotto e possono essere disattivate. Le interazioni richieste esplicitamente restano attive. Il rendering si sospende quando la pagina è nascosta o il ritratto è fuori schermo.

## Comandi e telefono

Sono disponibili comandi locali scritti e vocali: `ciao`, `ruota`, `fermati`, `ripristina`, `luce morbida`, `luce intensa`, `ascolta` e `sorridi`. Non è collegata una chat AI. Le risposte vocali usano SpeechSynthesis e una voce italiana, quando installata; in assenza di sintesi restano leggibili.

Il riconoscimento vocale usa SpeechRecognition/webkitSpeechRecognition in italiano. Il microfono viene richiesto solo dal pulsante, si ferma dopo un risultato o un errore e ha un limite di 20 secondi. Sono gestiti permessi negati, assenza di voce, assenza di microfono e problemi di rete. Il browser può usare un servizio online per il riconoscimento. I comandi scritti sono sempre l’alternativa disponibile.

«Attiva movimento» richiede il permesso DeviceMotion dove necessario e ascolta l’accelerometro in un contesto HTTPS. Sono gestiti anche i dati con gravità e l’orientamento orizzontale. In assenza di dati viene mostrato un messaggio e i sensori vengono disattivati. Voce, microfono e sensori si interrompono quando la pagina passa in secondo piano. Non è necessario agitare energicamente il telefono.

Se WebGL o il caricamento delle risorse non sono disponibili, viene mostrata la foto con un messaggio e un pulsante per riprovare. L’originale è anche accessibile dal collegamento nell’intestazione.

## Pubblicazione e verifiche

Netlify pubblica `public`, senza comando di build. Restano disponibili `/eris` e `/anteprima`. Per lo sviluppo locale: `netlify dev --port 8889`.

Verificati con Chromium/Playwright: caricamento degli shader e delle immagini, comandi, luci, orientamento, ripristino, tastiera, layout mobile a 390 px senza scorrimento orizzontale, movimento ridotto e fallback senza WebGL. Un confronto del rendering neutro con la foto ha confermato la conservazione dei dettagli del volto. Le prove sui pixel hanno verificato cambiamenti locali sulle labbra e sugli occhi, il movimento dei capelli con il volto fermo e la parallasse durante l’orientamento, senza errori JavaScript o shader.

Riconoscimento, sintesi e accelerometro sono stati verificati con API simulate, inclusi ascolto, parlato, permessi negati, arresto e dati dei sensori. Voce, permessi nativi e sensori richiedono ancora una prova su un telefono fisico.

Il GLB e il visualizzatore precedenti restano nel repository come risorse originali; non vengono caricati dalla nuova esperienza.
