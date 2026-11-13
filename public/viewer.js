const model = document.querySelector('#model');
const status = document.querySelector('#status');
const rotate = document.querySelector('#rotate');
const reset = document.querySelector('#reset');
const error = document.querySelector('#error');
const loading = document.querySelector('#loading');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (reducedMotion.matches) model.removeAttribute('auto-rotate');
function updateRotation() {
  const active = model.hasAttribute('auto-rotate');
  rotate.setAttribute('aria-pressed', String(active));
  rotate.textContent = active ? 'Ferma rotazione' : 'Avvia rotazione';
}
updateRotation();
model.addEventListener('progress', ({ detail }) => {
  document.querySelector('#progress').style.transform = `scaleX(${detail.totalProgress})`;
});
model.addEventListener('load', () => {
  clearTimeout(componentTimeout);
  error.hidden = true;
  status.textContent = 'Pronto da esplorare';
  rotate.disabled = reset.disabled = false;
});
function showError() {
  loading.hidden = true;
  error.hidden = false;
  status.textContent = 'Caricamento non riuscito';
  rotate.disabled = reset.disabled = true;
}
model.addEventListener('error', showError);
const componentTimeout = setTimeout(() => {
  if (!customElements.get('model-viewer')) showError();
}, 15000);
rotate.addEventListener('click', () => {
  model.toggleAttribute('auto-rotate');
  updateRotation();
});
reset.addEventListener('click', () => {
  model.cameraOrbit = '0deg 75deg 105%';
  model.cameraTarget = 'auto auto auto';
  model.fieldOfView = 'auto';
  model.resetTurntableRotation(0);
});
document.querySelector('#retry').addEventListener('click', () => location.reload());
