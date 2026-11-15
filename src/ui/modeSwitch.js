// modeSwitch.js — the big "Video | Picture" segmented switch (native radio buttons in a radiogroup).
// Shows the controls form of the chosen mode and tells the app through a callback.
export function initModeSwitch(onChange) {
  const radios = [...document.querySelectorAll('input[name="mode"]')];
  const apply = () => {
    const mode = radios.find((r) => r.checked).value;
    document.querySelectorAll('.mode-form').forEach((f) => { f.hidden = f.dataset.mode !== mode; });
    document.body.dataset.mode = mode;
    onChange?.(mode);
  };
  radios.forEach((r) => r.addEventListener('change', apply));
  apply();
  return { get mode() { return radios.find((r) => r.checked).value; }, set(mode) { const r = radios.find((x) => x.value === mode); r.checked = true; apply(); } };
}
