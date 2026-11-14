# Eris — presenza olografica 3D

Eris è un ologramma animato ricostruito dal nuovo riferimento frontale fornito, realizzato con Three.js e servito come sito statico da `public`. Il volto metallico frontale, gli occhi turchesi, i circuiti e i riflessi corallo usano direttamente i pixel del riferimento `public/assets/eris-hologram-reference.jpeg`.

## Modello e animazioni

`public/avatar.js` genera una superficie volumetrica ad anelli a partire dal contorno del soggetto. La superficie visibile è mappata sulle coordinate della fotografia originale, con profondità stimata da `eris-hologram-depth.png`. Un guscio posteriore completa il volume e permette la rotazione a 360°, senza i precedenti limiti di orientamento. I lati e il retro sono approssimazioni artistiche: le superfici non visibili riutilizzano dettagli dei cavi del collo della foto senza ripetere un secondo volto. Non è una scansione anatomica e la fedeltà è massima dalla vista originale; durante la rotazione sono possibili stiramenti della texture.

I filamenti periferici del nuovo riferimento sono conservati su una superficie trasparente separata, con filamenti distribuiti in profondità e deformazione reattiva. Le animazioni di occhi, palpebre e bocca agiscono localmente sulla texture e sulla superficie, senza sostituire i tratti con elementi geometrici estranei. Scansioni luminose, bordi azzurri, particelle e base di proiezione completano l’effetto olografico.

Il trascinamento e le frecce ruotano il modello; la rotazione automatica compie giri completi a 360°. Rotella e tasti `+`/`-` regolano lo zoom, mentre «Ripristina vista» torna alla posizione iniziale. Il movimento verticale è limitato per mantenere il busto leggibile. Su touch, il trascinamento all’interno della scena controlla il modello; la pagina scorre dalle aree circostanti.

Occhi, palpebre, labbra e capelli si animano: lo sguardo segue il puntatore, i filamenti reagiscono all’inerzia e all’ascolto, e la bocca si apre durante la sintesi vocale. Il movimento della bocca è ritmico, senza sincronizzazione fonetica. «Prova sguardo e sorriso» funziona anche senza voce. I cursori regolano l’illuminazione del volto e quella di profondità.

Le animazioni spontanee rispettano la preferenza di movimento ridotto e possono essere disattivate. Il rendering si sospende quando la pagina è nascosta o la scena è fuori schermo. I comandi richiesti esplicitamente restano disponibili.

## Comandi e telefono

Sono disponibili comandi locali scritti e vocali: `ciao`, `ruota`, `fermati`, `ripristina`, `luce morbida`, `luce intensa`, `ascolta` e `sorridi`. Non è collegata una chat AI. Le risposte vocali usano SpeechSynthesis e una voce italiana, quando installata; in assenza di sintesi restano leggibili.

Il microfono e i sensori vengono richiesti solo dai relativi pulsanti. Il riconoscimento vocale del browser può usare servizi online. Microfono, sintesi e sensori si interrompono quando la pagina passa in secondo piano. La compatibilità dipende dal browser e dal dispositivo.

Se WebGL non è disponibile, compare il ritratto originale con un messaggio e un pulsante per riprovare. Il riferimento è sempre accessibile dal collegamento nell’intestazione. La fotografia e la maschera di rilievo sono risorse attive della ricostruzione. Il precedente GLB resta disponibile come risorsa separata e non viene caricato.

La maschera di profondità e dei filamenti si rigenera con `python scripts/prepare-reference.py`. Il profilo misurato del nuovo riferimento è riportato nello script e in `public/avatar.js`; entrambi vanno aggiornati se cambia il soggetto. Le coordinate di occhi e labbra negli shader sono registrate sulla stessa immagine. Le immagini e le maschere del precedente ritratto restano come risorse storiche e non vengono caricate dalla scena.

## Sviluppo e verifiche

Netlify pubblica `public`, senza comando di build. Restano disponibili `/eris` e `/anteprima`. Per lo sviluppo locale: `netlify dev --port 8889`.

Verificati in Chromium con Playwright: caricamento WebGL senza errori JavaScript o shader, rotazione automatica, ripristino, espressione, controllo da tastiera, cursore della luce e layout a 390 px senza scorrimento orizzontale. Sintassi JavaScript verificata con `node --check`. Voce, permessi e sensori nativi richiedono una prova su un dispositivo fisico.
