// controls.js — reads the left Controls panel (type/layer, speed/sweep, pattern) and keeps its labels in step:
// "Turn time 8–30 s" for Space. There is no Source switch (removed at the owner's request, 2026-11-15, with crop
// and volume): no file = the built-in sample; a chosen file (stage drop zone or "Change file") = upload, shown as
// "Your file: name" with "Use sample instead". Calls onChange(what) so the app can re-render.
const $ = (id) => document.getElementById(id);
const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

export function initControls(onChange) {
  const vt = $('video-type'), speed = $('video-speed'), sweep = $('picture-sweep');

  function syncVideo() {
    const space = vt.value === 'space';
    $('video-speed-label').textContent = space ? 'Turn time (seconds per turn)' : 'Scan speed (seconds per sweep)';
    if (space && (+speed.min !== 8)) { speed.min = 8; speed.max = 30; speed.value = 12; }
    if (!space && (+speed.min !== 2)) { speed.min = 2; speed.max = 10; speed.value = 4; }
    $('video-speed-out').textContent = speed.value + ' s';
    $('space-turns-field').hidden = !space;
    $('video-help').textContent = space ? 'A radar line turns from the centre. Each star it touches makes a short "tink".' : 'A line moves left to right. Only the part under the line makes sound.';
    showFile('video');
  }
  function syncPicture() {
    $('picture-sweep-out').textContent = sweep.value + ' s';
    showFile('picture');
  }
  function showFile(kind) {
    const f = $(`${kind}-file`).files[0];
    $(`${kind}-file-row`).hidden = !f;
    $(`${kind}-file-name`).textContent = f ? f.name : '';
  }
  for (const kind of ['video', 'picture']) {
    $(`${kind}-file`).addEventListener('change', () => { showFile(kind); onChange(`${kind}-file`); });
    $(`${kind}-use-sample`).addEventListener('click', () => { $(`${kind}-file`).value = ''; showFile(kind); onChange(`${kind}-file`); });
  }

  vt.addEventListener('change', () => { syncVideo(); onChange('video-type'); });
  speed.addEventListener('input', () => { $('video-speed-out').textContent = speed.value + ' s'; });
  speed.addEventListener('change', () => onChange('video-speed'));
  $('space-turns').addEventListener('change', () => onChange('video-speed'));

  $('picture-layer').addEventListener('change', () => onChange('picture-layer'));
  sweep.addEventListener('input', () => { $('picture-sweep-out').textContent = sweep.value + ' s'; });
  sweep.addEventListener('change', () => onChange('picture-sweep'));
  document.querySelectorAll('input[name="pattern"]').forEach((r) => r.addEventListener('change', () => onChange('pattern')));

  syncVideo(); syncPicture();

  return {
    video: () => ({ type: vt.value, source: $('video-file').files[0] ? 'upload' : 'sample', file: $('video-file').files[0] || null, P: +speed.value, turns: +$('space-turns').value }),
    picture: () => ({ layer: $('picture-layer').value, source: $('picture-file').files[0] ? 'upload' : 'sample', file: $('picture-file').files[0] || null, sweep: +sweep.value, pattern: radio('pattern') }),
  };
}
