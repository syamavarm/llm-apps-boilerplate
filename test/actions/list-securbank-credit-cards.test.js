const test = require('node:test')
const assert = require('node:assert/strict')

const handler = require('../actions/list-securbank-credit-cards/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/list-securbank-credit-cards.json')
const fixture = require('../fixture.json')
const DATA = require('../actions/list-securbank-credit-cards/data.json')

test('example arguments return the canonical tool result (parity)', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
})

test('content[0] is a text block', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('data.json matches dataset.records verbatim', () => {
    assert.deepEqual(DATA, fixture.dataset.records)
})

test('no required params: an empty call returns every record in source order', async () => {
    assert.equal(fixture.action.params.filter((p) => p.required).length, 0)
    const res = await handler()
    assert.deepEqual(res.structuredContent, { arguments: {}, records: DATA })
})

test('params_binding is empty: unbound params are context only and never filter', async () => {
    assert.deepEqual(fixture.action.params_binding, {})
    const args = { query: 'zzz-no-such-card', category: 'nonexistent', limit: 1 }
    const res = await handler(args)
    assert.deepEqual(res.structuredContent.arguments, args)
    assert.deepEqual(res.structuredContent.records, DATA)
})

test('comma-separated string values do not filter (no bound string param)', async () => {
    const res = await handler({ category: `${DATA[0].category},${DATA[1].category}` })
    assert.deepEqual(res.structuredContent.records, DATA)
})

test('unknown keys are dropped from arguments', async () => {
    const res = await handler({ category: 'travel', foo: 'bar' })
    assert.deepEqual(res.structuredContent.arguments, { category: 'travel' })
})

test('wrong param type is rejected with records [] and same keys, naming the param', async () => {
    for (const [name, value] of [['limit', '3'], ['limit', 2.5], ['query', 5], ['category', true]]) {
        const res = await handler({ [name]: value })
        assert.deepEqual(res.structuredContent.records, [])
        assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
        assert.match(res.content[0].text, new RegExp(name))
    }
})

test('result has exactly the keys of the canonical result (no compare_options)', async () => {
    assert.equal(example.compare_field, undefined)
    const res = await handler({ query: 'travel' })
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.ok(!('compare_options' in res.structuredContent))
})

test('content is one short sentence that does not list records', async () => {
    const res = await handler({})
    assert.match(res.content[0].text, /^Found 6 SecurBank credit cards\.$/)
    for (const r of DATA) assert.ok(!res.content[0].text.includes(r.name))
})
