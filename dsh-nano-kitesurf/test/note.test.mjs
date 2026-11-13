import assert from 'node:assert/strict'
import test from 'node:test'
import { batchNote, designNote, multiNote } from '../src/shared/note.js'

const element = {
  tag: 'a',
  selector: 'a#learn.more',
  text: 'Learn more '.repeat(40),
  box: { x: 10.4, y: 20.6, width: 80.2, height: 18.1 },
  style: { color: 'rgb(0, 0, 238)', fontSize: '16px', backgroundColor: '', display: 'inline', position: '', fontFamily: '' },
  componentStack: null,
}

test('design note stays under the budget and drops empty styles', () => {
  const note = designNote(element, { url: 'https://example.com/', comment: 'make the link larger' })
  assert.ok(note.startsWith('[kitesurf]'))
  assert.match(note, /el: a#learn\.more/)
  assert.match(note, /ask: make the link larger/)
  assert.match(note, /box: 10,21 80x18/)
  assert.match(note, /color=rgb\(0, 0, 238\)/)
  assert.doesNotMatch(note, /backgroundColor=/)
  assert.doesNotMatch(note, /fontFamily=/)
  assert.match(note, /stack: none/)
  const textLine = note.split('\n').find((line) => line.startsWith('text: '))
  assert.ok(textLine)
  assert.ok(textLine.length <= 'text: '.length + 80)
  assert.ok(note.length <= 640)
})

test('a page-root hit does not quote the whole document', () => {
  const note = designNote({
    tag: 'html',
    selector: 'html',
    text: 'This domain is for use in documentation examples without needing permission. '.repeat(8),
    style: { color: 'rgb(0, 0, 0)', backgroundColor: 'rgba(0, 0, 0, 0)', position: 'static', fontSize: '16px' },
    componentStack: null,
  })
  assert.match(note, /hit: page root/)
  assert.doesNotMatch(note, /^text:/m)
  assert.doesNotMatch(note, /backgroundColor=/)
  assert.doesNotMatch(note, /position=/)
  assert.match(note, /fontSize=16px/)
  assert.ok(note.length < 240)
})

test('several notes leave as one batch, not eight messages', () => {
  const one = designNote({ tag: 'p', selector: 'p', text: 'Hello', componentStack: null })
  const two = designNote({ tag: 'area', box: { x: 1, y: 2, width: 3, height: 4 }, componentStack: null })
  const batch = batchNote([one, two])
  assert.match(batch, /\[kitesurf batch 2\]/)
  assert.equal(batchNote([one]), one)
  assert.ok(batch.length <= 1600)
})

test('an image note keeps alt and a short src, not a data url', () => {
  const note = designNote({
    tag: 'img',
    selector: 'img.hero',
    alt: 'Red crane',
    src: 'https://images.example/crane.jpg?size=large',
    text: '',
    componentStack: null,
  })
  assert.match(note, /alt: Red crane/)
  assert.match(note, /src: https:\/\/images.example\/crane.jpg/)
  assert.doesNotMatch(designNote({ tag: 'img', src: 'data:image/png;base64,aaaa', componentStack: null }), /src: data:/)
})

test('a shift-drag is an arrow, not a text dump', () => {
  const note = designNote({
    tag: 'arrow',
    text: 'should not appear',
    from: { x: 10, y: 20 },
    to: { x: 80, y: 90 },
    componentStack: null,
  })
  assert.match(note, /mark: arrow/)
  assert.match(note, /line: 10,20 80,90/)
  assert.doesNotMatch(note, /should not appear/)
  assert.doesNotMatch(note, /box:/)
})

test('a dragged area is a box, not a DOM dump', () => {
  const note = designNote({
    tag: 'area',
    selector: 'area',
    box: { x: 10, y: 20, width: 120, height: 40 },
    text: 'should not appear',
    componentStack: null,
  }, { comment: 'tighten this group' })
  assert.match(note, /mark: area/)
  assert.match(note, /box: 10,20 120x40/)
  assert.match(note, /ask: tighten this group/)
  assert.doesNotMatch(note, /should not appear/)
  assert.doesNotMatch(note, /el: area/)
})

test('iframe and empty box are explicit, not a DOM dump', () => {
  const note = designNote({ tag: 'iframe', selector: 'iframe', box: { x: 0, y: 0, width: 0, height: 0 }, componentStack: null })
  assert.match(note, /limit: iframe script is not inspected/)
  assert.match(note, /box: 0,0 empty/)
})

test('an alt-drag ellipse is a marked box, not a DOM dump', () => {
  const note = designNote({
    tag: 'ellipse',
    selector: 'area',
    box: { x: 10, y: 20, width: 120, height: 40 },
    text: 'should not appear',
    componentStack: null,
  }, { comment: 'ring this cluster' })
  assert.match(note, /mark: ellipse/)
  assert.match(note, /box: 10,20 120x40/)
  assert.match(note, /ask: ring this cluster/)
  assert.doesNotMatch(note, /should not appear/)
})

test('shift-click multi-select folds into one numbered note', () => {
  const first = { tag: 'button', selector: 'button.save', text: 'Save', box: { x: 1, y: 2, width: 60, height: 24 }, style: {}, componentStack: null }
  const second = { tag: 'button', selector: 'button.cancel', text: 'Cancel', box: { x: 70, y: 2, width: 70, height: 24 }, style: {}, componentStack: null }
  const note = multiNote([first, second], { url: 'https://example.com/', comment: 'make these equal width' })
  assert.match(note, /\[kitesurf\]/)
  assert.match(note, /els: 2/)
  assert.match(note, /el1: button\.save/)
  assert.match(note, /el2: button\.cancel/)
  assert.match(note, /box1: 1,2 60x24/)
  assert.match(note, /box2: 70,2 70x24/)
  assert.match(note, /ask: make these equal width/)
  assert.ok(note.length <= 1280)
})

test('multiNote of one delegates to designNote', () => {
  const only = { tag: 'p', selector: 'p', text: 'one', box: { x: 0, y: 0, width: 10, height: 10 }, style: {}, componentStack: null }
  assert.equal(multiNote([only], {}), designNote(only, {}))
  // Empty still yields the note header plus the stack: none line designNote emits.
  assert.equal(multiNote([], {}), '[kitesurf]\nstack: none')
})
