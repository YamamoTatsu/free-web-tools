'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { evaluate } = require('../kurashi/rack-fit/app.js');

function check(width, depth, height, opening, walls='yes', span=true) {
  return Object.fromEntries(evaluate({width,depth,height,opening,walls,span}).map(p=>[p.id,p]));
}
test('40 x 31 x 35, opening 40: HB-6049 only',()=>{
  const r=check(40,31,35,40);
  assert.equal(r.nitori.candidate,false);
  assert.equal(r.hb6049.candidate,true);
  assert.equal(r.ssrex.candidate,false);
});
test('Nitori is support-pending when walls are unknown',()=>{
  const r=check(40,35,36,40,'unknown');
  assert.equal(r.nitori.candidate,true);
  assert.equal(r.nitori.needsSupportCheck,true);
});
test('Nitori excluded without required wall supports',()=>{
  const r=check(40,35,36,40,'no');
  assert.equal(r.nitori.candidate,false);
});
test('SSR-EX is a candidate only when width and entry allow',()=>{
  const r=check(55,32,35,55,'yes');
  assert.equal(r.ssrex.candidate,true);
});
test('invalid measurements are rejected',()=>{
  assert.throws(()=>evaluate({width:'',depth:31,height:35,opening:40,walls:'yes',span:true}));
  assert.throws(()=>evaluate({width:0,depth:31,height:35,opening:40,walls:'yes',span:true}));
});
