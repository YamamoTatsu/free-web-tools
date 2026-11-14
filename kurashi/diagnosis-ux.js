'use strict';
// Presentation only: product dimensions, eligibility and outgoing URLs stay in each diagnostic.
(function () {
  const form = document.getElementById('fit-form');
  const results = document.getElementById('results');
  const status = document.getElementById('status');
  if (!form || !results || !status) return;
  const fields = Array.from(form.querySelectorAll('input[type="number"]'));
  const labels = {gap:'有効幅',width:'収納の有効内幅',depth:'有効奥行',height:'有効高さ',opening:'入口の有効幅'};
  status.tabIndex = -1;
  fields.forEach(function (field) {
    if (!field.id) field.id = 'fit-' + field.name;
    const error = document.createElement('span');
    error.id = field.id + '-error';
    error.className = 'field-error';
    error.hidden = true;
    field.insertAdjacentElement('afterend', error);
    field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
  });
  function clearErrors() {
    fields.forEach(function (field) {
      field.removeAttribute('aria-invalid');
      const error = document.getElementById(field.id + '-error');
      error.textContent = ''; error.hidden = true;
    });
  }
  function invalidate() {
    clearErrors();
    if (!results.childElementCount) return;
    results.replaceChildren();
    status.textContent = '入力を変更しました。候補を確認するボタンで、もう一度判定してください。';
  }
  form.addEventListener('input', invalidate);
  form.addEventListener('change', invalidate);
  form.addEventListener('submit', function (event) {
    clearErrors();
    let firstInvalid = null;
    fields.forEach(function (field) {
      const value = Number(field.value);
      if (field.value.trim() && Number.isFinite(value) && value >= Number(field.min) && value <= Number(field.max)) return;
      const error = document.getElementById(field.id + '-error');
      error.textContent = (labels[field.name] || '寸法') + 'を' + field.min + '〜' + field.max + 'cmで入力してください。';
      error.hidden = false;
      field.setAttribute('aria-invalid', 'true');
      if (!firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      event.preventDefault(); event.stopImmediatePropagation();
      results.replaceChildren();
      status.textContent = '入力を確認してください。エラーのある項目を直してから再判定できます。';
      firstInvalid.focus();
    }
  }, true);
  // Registered after each page's calculation handler so keyboard users reach the result.
  form.addEventListener('submit', function () { status.focus({preventScroll:true}); });
  const example = document.getElementById('example');
  if (example) example.addEventListener('click', function () {
    clearErrors();
    status.textContent = '入力例の結果です。ご自身の採寸値へ変更して再判定してください。 ' + status.textContent;
    status.focus({preventScroll:true});
  });
})();
