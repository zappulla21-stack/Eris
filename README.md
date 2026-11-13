# Eris

Pagina statica per esplorare il modello 3D Happy2, con rotazione, zoom, ripristino della vista e download del file GLB. Interfaccia in italiano, utilizzabile con mouse, tocco e tastiera.

Netlify pubblica la cartella `public`, configurata in `netlify.toml`. Non è necessario un comando di build. Il file `public/index.html` è la pagina iniziale.

Il modello originale è contenuto in `Happy2 - Copia.zip` ed è stato estratto in `public/assets/happy2.glb` (circa 53 MB). Il primo caricamento può richiedere tempo sulle connessioni lente.

Il visualizzatore usa Google model-viewer 4.1.0, distribuito localmente in `public/vendor/model-viewer.min.js` (licenza Apache-2.0, riferimenti inclusi nel file).

La pagina si presenta come Eris ed è raggiungibile anche da `/eris` e `/anteprima`. Le regole in `netlify.toml` aprono la pagina iniziale anche per percorsi non corrispondenti a file esistenti, evitando una pagina 404 quando si entra da un collegamento di anteprima. I file statici esistenti continuano a essere serviti direttamente.
