const $ = selector => document.querySelector(selector);
const stage = $('.stage');
const status = $('#status');
const reply = $('#reply');
const listenButton = $('#listen');
const motionButton = $('#motion');
const rotateButton = $('#rotate');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let avatar;
let recognition;
let recognitionTimer;
let attentiveTimer;
let voiceTimer;
let commandTimer;
let voiceVersion = 0;
let motionTimer;
let motionActive = false;
let sensorReceived = false;
let previousGravity;
let motionRequest = 0;
let rotating = false;
let utterance;
let micStarting = false;

function setStatus(text, state = 'ready') {
  status.textContent = text;
  stage.dataset.state = state;
  document.querySelector('.controls').dataset.state = state;
  document.querySelector('.console').dataset.state = state;
}
function setListening(active) {
  avatar.state.listening = active;
  const recording = Boolean(active && (recognition || micStarting));
  listenButton.setAttribute('aria-pressed', String(recording));
  listenButton.textContent = recording ? 'Interrompi ascolto' : 'Parla con Eris';
}
function stopRecognition() {
  clearTimeout(recognitionTimer);
  micStarting = false;
  if (recognition) {
    const current = recognition;
    recognition = null;
    current.onend = current.onresult = current.onerror = current.onstart = null;
    try { current.abort(); } catch { /* Already stopped by the browser. */ }
  }
  if (avatar) setListening(false);
}
function stopSpeaking() {
  voiceVersion++;
  clearTimeout(voiceTimer);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  utterance = null;
  if (avatar) avatar.state.speaking = false;
}
function speak(text) {
  stopSpeaking();
  reply.textContent = text;
  if (!('speechSynthesis' in window)) {
    setStatus('Voce non disponibile · risposta scritta');
    return;
  }
  const version = voiceVersion;
  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'it-IT';
  utterance.rate = .94;
  const voices = speechSynthesis.getVoices();
  const italian = voices.find(v => v.lang.startsWith('it'));
  if (italian) utterance.voice = italian;
  let started = false;
  utterance.onstart = () => {
    if (version !== voiceVersion) return;
    started = true;
    avatar.state.speaking = true;
    setStatus('Eris sta parlando', 'speaking');
  };
  const finish = () => {
    if (version !== voiceVersion) return;
    clearTimeout(voiceTimer);
    avatar.state.speaking = false;
    setStatus('Sono qui · pronta ad ascoltarti');
  };
  utterance.onend = finish;
  utterance.onerror = () => {
    finish();
    setStatus('Voce non disponibile · risposta scritta');
  };
  speechSynthesis.speak(utterance);
  voiceTimer = setTimeout(() => {
    if (version !== voiceVersion) return;
    if (!started) {
      stopSpeaking();
      setStatus('Voce non disponibile · risposta scritta');
    }
  }, 5000);
}
function setRotation(value) {
  rotating = value;
  avatar.setRotation(value);
  rotateButton.textContent = value ? 'Ferma rotazione' : 'Avvia rotazione';
  rotateButton.setAttribute('aria-pressed', String(value));
}
function setLight(id, value) {
  $(`#${id}`).value = value;
  $(`#${id}-value`).textContent = `${value}%`;
  if (id === 'light') avatar.setLight(value / 100);
  else avatar.setDepth(value / 100);
}
function executeCommand(raw) {
  const text = raw.trim().toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!text) return;
  stopRecognition(); stopSpeaking();
  clearTimeout(attentiveTimer); clearTimeout(commandTimer);
  setListening(true);
  setStatus('Ti ascolto', 'listening');
  avatar.impulse(.35, .12, .18);
  reply.textContent = `Hai detto: «${raw.trim()}»`;
  commandTimer = setTimeout(() => {
    setListening(false);
    if (/ferma|stop|basta/.test(text)) {
      setRotation(false);speak('Mi fermo. Sono qui.');
    } else if (/ruota|gira/.test(text)) {
      setRotation(true);speak('Certo. La mia proiezione segue il movimento.');
    } else if (/ripristina|reset|iniziale/.test(text)) {
      setRotation(false);avatar.reset();speak('Eccomi, di nuovo davanti a te.');
    } else if (/luce.*(morbida|bassa)|meno luce/.test(text)) {
      setLight('light', 35);setLight('depth', 45);speak('Una luce piu morbida, per incontrarci.');
    } else if (/luce.*(intensa|forte)|piu luce/.test(text)) {
      setLight('light', 85);setLight('depth', 90);speak('Ho aumentato la luce del volto e la luce di profondita.');
    } else if (/sorrid|sorriso|sguardo|occhi/.test(text)) {
      avatar.express();speak('Eccomi.');
    } else if (/ciao|salve|buon/.test(text)) {
      speak('Ciao, sono Eris. Il mio sguardo ti segue, e i miei capelli rispondono al movimento.');
    } else if (/ascolta|ascolto|eris/.test(text)) {
      setListening(true);setStatus('Sono qui · ti ascolto', 'listening');
      reply.textContent = 'Sono in attenzione. Premi «Parla con Eris» per usare il microfono, oppure scrivi un comando.';
      attentiveTimer = setTimeout(() => {setListening(false);setStatus('Sono qui · pronta ad ascoltarti');}, 4500);
    } else {
      speak('Posso salutarti, ruotare, fermarmi e cambiare le luci. Prova a chiedermelo.');
    }
  }, 650);
}
function startListening() {
  if (recognition || micStarting) {
    clearTimeout(attentiveTimer);clearTimeout(commandTimer);
    stopRecognition();setStatus('Ascolto interrotto');return;
  }
  stopSpeaking();clearTimeout(commandTimer);clearTimeout(attentiveTimer);setListening(false);
  if (!Recognition) {
    reply.textContent = 'Questo browser non supporta il riconoscimento vocale. Scrivi un comando qui sopra.';
    $('#command').focus();return;
  }
  micStarting = true;
  recognition = new Recognition();
  const current = recognition;
  current.lang = 'it-IT';
  current.continuous = false;
  current.interimResults = true;
  current.onstart = () => {
    if (recognition !== current) return;
    micStarting = false;setListening(true);setStatus('Ti ascolto · parla adesso', 'listening');
    reply.textContent = 'Puoi dire «ciao», «ruota», «fermati», «luce morbida» o «luce intensa».';
    avatar.impulse(.35, .1, .25);
  };
  current.onresult = event => {
    const result = event.results[event.resultIndex];
    if (!result) return;
    $('#command').value = result[0].transcript;
    if (result.isFinal) executeCommand(result[0].transcript);
  };
  current.onerror = event => {
    const messages = {
      'not-allowed': 'Microfono non autorizzato. Puoi abilitare il permesso nelle impostazioni del browser o scrivere un comando.',
      'service-not-allowed': 'Servizio vocale non consentito. Scrivi un comando.',
      'audio-capture': 'Nessun microfono disponibile. Scrivi un comando.',
      'no-speech': 'Non ho sentito una voce. Riprova oppure scrivi un comando.',
      network: 'Riconoscimento vocale non raggiungibile. Controlla la connessione o scrivi un comando.'
    };
    stopRecognition();setStatus('Ascolto terminato');reply.textContent = messages[event.error] || 'Ascolto interrotto. Riprova o scrivi un comando.';
  };
  current.onend = () => {
    if (recognition !== current) return;
    stopRecognition();setStatus('Sono qui · pronta ad ascoltarti');
  };
  try {
    current.start();setStatus('Richiesta accesso al microfono…');
    recognitionTimer = setTimeout(() => {stopRecognition();setStatus('Ascolto terminato');reply.textContent = 'Premi «Parla con Eris» per riprendere.';}, 20000);
  } catch {
    stopRecognition();setStatus('Microfono non disponibile');reply.textContent = 'Usa un comando scritto o riprova dal pulsante del microfono.';
  }
}
function onMotion(event) {
  const a = event.acceleration;
  let x, y, z;
  if (a && [a.x,a.y,a.z].every(v => typeof v === 'number' && Number.isFinite(v))) {
    ({x,y,z} = a);
  } else {
    const gravity = event.accelerationIncludingGravity;
    if (!gravity || ![gravity.x,gravity.y,gravity.z].every(v => typeof v === 'number' && Number.isFinite(v))) return;
    if (!previousGravity) {previousGravity = {x:gravity.x,y:gravity.y,z:gravity.z};return;}
    x=gravity.x-previousGravity.x;y=gravity.y-previousGravity.y;z=gravity.z-previousGravity.z;
    previousGravity={x:gravity.x,y:gravity.y,z:gravity.z};
  }
  if (!sensorReceived) {
    sensorReceived = true;clearTimeout(motionTimer);
    $('#sensor-status').textContent = 'Sensori attivi. Muovi delicatamente il telefono: i capelli seguono il gesto.';
  }
  // Rotate the accelerometer frame when the phone is held in landscape.
  const angle = (screen.orientation?.angle ?? window.orientation ?? 0)*Math.PI/180;
  avatar.impulse((x*Math.cos(angle)-y*Math.sin(angle))*.025,(x*Math.sin(angle)+y*Math.cos(angle))*.018,z*.025);
}
function disableMotion(message = 'Risposta al movimento disattivata.') {
  motionRequest++;
  clearTimeout(motionTimer);window.removeEventListener('devicemotion',onMotion);
  motionActive=false;sensorReceived=false;previousGravity=null;
  motionButton.textContent='Attiva movimento';motionButton.setAttribute('aria-pressed','false');motionButton.disabled=false;
  $('#sensor-status').textContent=message;
}
async function toggleMotion() {
  if(motionActive){disableMotion();return;}
  if(!window.isSecureContext || !window.DeviceMotionEvent){$('#sensor-status').textContent='Sensori non disponibili qui. Puoi muovere i capelli trascinando Eris.';return;}
  const request = ++motionRequest;
  motionButton.disabled=true;
  try {
    if(typeof DeviceMotionEvent.requestPermission==='function') {
      const permission=await DeviceMotionEvent.requestPermission();
      if(request !== motionRequest)return;
      if(permission!=='granted'){disableMotion('Permesso ai sensori negato. La rotazione con il tocco resta disponibile.');return;}
    }
    if(request !== motionRequest)return;
    motionActive=true;motionButton.disabled=false;motionButton.textContent='Disattiva movimento';motionButton.setAttribute('aria-pressed','true');
    $('#sensor-status').textContent='Attendo i sensori del telefono…';
    window.addEventListener('devicemotion',onMotion,{passive:true});
    motionTimer=setTimeout(()=>{if(!sensorReceived)disableMotion('Nessun dato dai sensori. Su questo dispositivo usa il tocco per muovere Eris.');},4500);
  } catch {disableMotion('Non riesco ad attivare i sensori. Usa il tocco per muovere Eris.');}
}
function showError() {
  stopRecognition();stopSpeaking();
  $('#loading').hidden=true;$('#error').hidden=false;
  setStatus('Ologramma non disponibile · foto originale');
  if(avatar){disableMotion('');avatar.dispose();avatar=null;}
  document.querySelectorAll('button:not(#retry), .settings input, #command').forEach(el=>el.disabled=true);
}
$('#retry').addEventListener('click',()=>location.reload());
try {
  const {createAvatar}=await import('./avatar.js');
  avatar=await createAvatar($('#viewport'));
  $('#loading').hidden=true;
  document.querySelectorAll('button, .settings input, #command').forEach(el=>el.disabled=false);
  $('#animate').checked=!reducedMotion.matches;
  setLight('light',65);setLight('depth',70);
  setStatus('Sono qui · pronta ad ascoltarti');
  if(!Recognition){listenButton.disabled=true;listenButton.textContent='Usa i comandi scritti';}
  $('#viewport').addEventListener('avatar-error',showError);
  $('#rotate').addEventListener('click',()=>setRotation(!rotating));
  $('#reset').addEventListener('click',()=>{setRotation(false);avatar.reset();});
  $('#listen').addEventListener('click',startListening);
  $('#motion').addEventListener('click',toggleMotion);
  $('#speak').addEventListener('click',()=>executeCommand('ciao'));
  $('#express').addEventListener('click',()=>avatar.express());
  $('#command-form').addEventListener('submit',event=>{event.preventDefault();const value=$('#command').value.trim();if(value)executeCommand(value);});
  for(const id of ['light','depth']) $(`#${id}`).addEventListener('input',event=>setLight(id,Number(event.target.value)));
  $('#animate').addEventListener('change',event=>{avatar.state.spontaneous=event.target.checked;});
  reducedMotion.addEventListener('change',event=>{if(!avatar)return;avatar.state.spontaneous=!event.matches;$('#animate').checked=!event.matches;if(event.matches)setRotation(false);});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){clearTimeout(commandTimer);clearTimeout(attentiveTimer);stopRecognition();stopSpeaking();if(avatar && (motionActive || motionButton.disabled))disableMotion();}
    else if(avatar)setStatus('Sono qui · pronta ad ascoltarti');
  });
  window.addEventListener('pagehide',()=>{clearTimeout(commandTimer);clearTimeout(attentiveTimer);stopRecognition();stopSpeaking();if(avatar && (motionActive || motionButton.disabled))disableMotion();});
} catch {
  showError();
}
