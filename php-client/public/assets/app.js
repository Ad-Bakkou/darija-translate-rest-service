const source = document.getElementById('text');
const feedback = document.getElementById('feedback');
const count = () => { document.getElementById('count').textContent = `${[...source.value].length.toLocaleString()} / 5,000`; };
source.addEventListener('input', count); count();
document.getElementById('translate-form').addEventListener('submit', event => {
  if (!source.value.trim() || [...source.value].length > 5000) {
    event.preventDefault(); feedback.textContent = 'Enter nonblank English text, up to 5,000 Unicode code points.'; return;
  }
  document.getElementById('translate').disabled = true;
  feedback.textContent = 'Translating into Moroccan Darija…';
});
window.addEventListener('pageshow', () => { document.getElementById('translate').disabled = false; });
document.getElementById('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(document.getElementById('result').textContent); feedback.textContent = 'Translation copied.'; }
  catch { feedback.textContent = 'Clipboard unavailable. Select the result and copy it manually.'; }
});
