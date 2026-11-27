'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeParams, createTracker, EVENT_NAMES } = require('./diagnosis-events.js');

test('sanitizeParams keeps only whitelisted, well-formed parameters', () => {
  const clean = sanitizeParams({
    product: 'hb6049',
    placement: 'result_card',
    candidates: ['hb6049', 'ssrex'],
    candidate_count: 2,
    via_example: false,
    width: 40,
    depth: 31,
    email: 'a@example.com',
    candidates_extra: 'x'
  });
  assert.deepEqual(clean, {
    product: 'hb6049',
    placement: 'result_card',
    candidates: 'hb6049,ssrex',
    candidate_count: 2,
    via_example: false
  });
});

test('sanitizeParams drops malformed ids and non-object input', () => {
  assert.deepEqual(sanitizeParams(null), {});
  assert.deepEqual(sanitizeParams('x'), {});
  assert.deepEqual(sanitizeParams({ product: 'bad id!', candidates: ['ok_1', 'bad id', 42] }), { candidates: 'ok_1' });
});

test('tracker fires start and complete at most once, clicks every time', () => {
  const sent = [];
  const tracker = createTracker((name, params) => sent.push([name, params]), 'rack_fit');
  assert.equal(tracker.track('diagnosis_start', {}), true);
  assert.equal(tracker.track('diagnosis_start', {}), false);
  assert.equal(tracker.track('diagnosis_complete', { candidates: ['hb6049'], candidate_count: 1 }), true);
  assert.equal(tracker.track('diagnosis_complete', { candidates: ['hb6049'], candidate_count: 1 }), false);
  assert.equal(tracker.track('comparison_click', { product: 'hb6049', placement: 'result_card' }), true);
  assert.equal(tracker.track('comparison_click', { product: 'hb6049', placement: 'result_card' }), true);
  assert.equal(tracker.track('affiliate_click', { product: 'hb6049', placement: 'result_card' }), true);
  assert.equal(sent.length, 5);
  assert.equal(sent[0][1].diagnosis_page, 'rack_fit');
  assert.equal(sent[1][1].candidates, 'hb6049');
});

test('tracker rejects unknown events and never forwards measurement values', () => {
  const sent = [];
  const tracker = createTracker((name, params) => sent.push([name, params]), 'smartwagon_fit');
  assert.equal(tracker.track('page_view', {}), false);
  assert.equal(tracker.track('diagnosis_complete', { width: 40, height: 87, candidates: ['f2540'] }), true);
  assert.deepEqual(Object.keys(sent[0][1]).sort(), ['candidates', 'diagnosis_page', 'via_example']);
});

test('via_example is attached to completion after the example button is used', () => {
  const sent = [];
  const tracker = createTracker((name, params) => sent.push([name, params]), 'rack_fit');
  tracker.markExampleUsed();
  tracker.track('diagnosis_complete', { candidate_count: 1 });
  assert.equal(sent[0][1].via_example, true);
  assert.deepEqual(EVENT_NAMES, ['diagnosis_start', 'diagnosis_complete', 'comparison_click', 'affiliate_click']);
});
