import test from 'node:test';
import assert from 'node:assert/strict';
import { degreeMathMarkup, degreeTextMarkup } from '../src/ui/degree-math.js';

test('degree expressions render as MathML with relation, sum, subtraction and readable reduction term', () => {
  const markup=degreeMathMarkup('Deg(Q) ≤ deg(A) + deg(B) − r_red');
  assert.match(markup,/^<math[^>]*>/);
  assert.match(markup,/<mi mathvariant="normal">deg<\/mi>/);
  assert.match(markup,/<mo>≤<\/mo>/);
  assert.match(markup,/<mo>\+<\/mo>/);
  assert.match(markup,/<mtext>redukcje<\/mtext>/);
  assert.match(markup,/aria-label="Deg\(Q\) ≤ deg\(A\) \+ deg\(B\) − redukcje"/);
});

test('unsupported prose is left to the caller as plain text', () => {
  assert.equal(degreeMathMarkup('Stopień normy obu gałęzi'),null);
});

test('formula identifiers are escaped before being placed in MathML', () => {
  assert.match(degreeMathMarkup('Deg(<img>) = 0'),/&lt;img&gt;/);
  assert.doesNotMatch(degreeMathMarkup('Deg(<img>) = 0'),/<img>/);
});

test('circle and conic degree formulas render grouped sums rather than raw text',()=>{
  const markup=degreeMathMarkup('Deg(ω) ≤ 2(deg(C)+deg(A)+deg(B)) − r_red');
  assert.ok(markup);
  assert.match(markup,/<mn>2<\/mn><mo>\(<\/mo>/);
  assert.match(markup,/<mo>\)<\/mo><mo>−<\/mo>/);
});

test('degree notation covers fractions, angle expressions, indexed names and prose',()=>{
 for(const formula of ['(deg A+deg B)/2','deg ∠(ℓ,m) + deg ∠(k,n)','deg(ω) = 6 − 2 − 0 = 4','deg(2γ) = 4'])assert.ok(degreeMathMarkup(formula),formula);
 assert.match(degreeMathMarkup('deg C₁ + deg C₂'),/<msub><mi>C<\/mi><mn>1<\/mn><\/msub>/);
 const prose=degreeTextMarkup('Dla stałej stożkowej: deg(pary) = deg(punktu).');
 assert.equal((prose.match(/<math /g)||[]).length,2);
 assert.match(prose,/Dla stałej stożkowej:/);
 assert.doesNotMatch(degreeTextMarkup('<script>alert(1)</script> deg(A)'),/<script>/);
});

test('animation names and nested custom labels remain math in formulas and prose',()=>{
 for(const name of ['O_c1','ρ_A_2','P(A, B)','Q′','c_ω']){
  const rendered=degreeMathMarkup(`deg(${name}) ≤ 2deg(O_c1) − redukcje`);
  assert.ok(rendered,name);assert.match(rendered,/<msub>/);
  assert.match(degreeTextMarkup(`Wynik: deg(${name}).`),/<math /);
 }
 assert.ok(degreeMathMarkup('deg(ρ_A) = max(deg(ρ_A[1]), deg(ρ_A[2]))'));
});
