import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {TouchControls,touchAngle} from '../src/controls.ts';
test('slider traverses the same left-to-right aiming arc as desktop',()=>{
  assert.equal(touchAngle(0),-Math.PI+.08);
  assert.ok(Math.abs(touchAngle(50)+Math.PI/2)<1e-9);
  assert.ok(Math.abs(touchAngle(100)+.08)<1e-9);
  assert.equal(touchAngle(-10),touchAngle(0));assert.equal(touchAngle(110),touchAngle(100));
});
test('cover toggles independently of a held firing finger',()=>{
  const t=new TouchControls();t.firePointers.add(1);t.toggleCover();
  assert.equal(t.cover,true);assert.equal(t.firing,true);
  t.toggleCover();assert.equal(t.cover,false);assert.equal(t.firing,true);
  t.firePointers.delete(2);assert.equal(t.firing,true);
  t.firePointers.delete(1);assert.equal(t.firing,false);
});
test('pause or restart clears all touchscreen input state',()=>{
  const t=new TouchControls();t.toggleCover();t.firePointers.add(1);t.firePointers.add(2);t.reset();
  assert.equal(t.cover,false);assert.equal(t.firing,false);
});
