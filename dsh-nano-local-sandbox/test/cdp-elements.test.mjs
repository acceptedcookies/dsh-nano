import assert from 'node:assert/strict'
import test from 'node:test'
import { readElements } from '../src/host/cdp-elements.js'

test('readElements returns computed styles and matched rules for a selector', async () => {
  const calls = []
  const client = {
    async send(method, params) {
      calls.push(method)
      if (method === 'DOM.enable' || method === 'CSS.enable') return {}
      if (method === 'Target.getTargets') return { targetInfos: [{ type: 'page', targetId: 'p', sessionId: 's' }] }
      if (method === 'DOM.getDocument') return { root: { nodeId: 1, localName: 'html', children: [{ nodeId: 2, localName: 'p' }] } }
      if (method === 'DOM.querySelector') {
        assert.equal(params.selector, 'p')
        return { nodeId: 2 }
      }
      if (method === 'CSS.getMatchedStylesForNode') {
        return { matchedCSSRules: [{ rule: { selectorList: { selectors: [{ text: 'p' }] } } }] }
      }
      if (method === 'CSS.getComputedStyleForNode') {
        return { computedStyle: [{ name: 'color', value: 'rgb(0, 0, 0)' }, { name: 'display', value: 'block' }, { name: 'font-size', value: '16px' }] }
      }
      return {}
    },
  }
  const data = await readElements(client, { selector: 'p' })
  assert.equal(data.count, 2)
  assert.equal(Object.keys(data.computed).length > 2, true)
  assert.equal(data.matched.matched[0].selector, 'p')
  assert.equal(calls.includes('CSS.getComputedStyleForNode'), true)
})
