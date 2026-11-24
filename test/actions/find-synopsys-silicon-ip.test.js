const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/find-synopsys-silicon-ip/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/find-synopsys-silicon-ip.json')
const fixture = require('../fixture.json')

const ids = (r) => r.structuredContent.records.map((x) => x.id)
const allIds = fixture.dataset.records.map((r) => r.id)

test('example arguments reproduce eds result exactly', async () => {
    const r = await handler(example.arguments)
    assert.deepEqual(r.structuredContent, expected)
    assert.deepEqual(ids(r), example.record_ids)
})

test('content[0] is a text item', async () => {
    const r = await handler(example.arguments)
    assert.equal(r.content[0].type, 'text')
    assert.equal(typeof r.content[0].text, 'string')
    assert.deepEqual(Object.keys(r.content[0]).sort(), ['text', 'type'])
})

test('no required params: empty call returns every record in source order', async () => {
    const r = await handler()
    assert.deepEqual(ids(r), allIds)
    assert.deepEqual(r.structuredContent.arguments, {})
})

test('unbound params are context only and never filter', async () => {
    const args = { query: 'zzz-no-such-thing', ip_category: 'Nope', application: 'Mars', protocol_standard: 'PCIe,CXL' }
    const r = await handler(args)
    assert.deepEqual(ids(r), allIds)
    assert.deepEqual(r.structuredContent.arguments, args)
})

test('unknown keys are dropped from arguments', async () => {
    const r = await handler({ query: 'DDR', bogus: 1 })
    assert.deepEqual(r.structuredContent.arguments, { query: 'DDR' })
})

test('wrong type is rejected naming the param, with the same keys as the example', async () => {
    const r = await handler({ protocol_standard: 42 })
    assert.deepEqual(r.structuredContent.records, [])
    assert.match(r.content[0].text, /protocol_standard/)
    assert.deepEqual(Object.keys(r.structuredContent).sort(), Object.keys(expected).sort())
})

test('records are the original data objects', async () => {
    const r = await handler({})
    assert.deepEqual(r.structuredContent.records, fixture.dataset.records)
    assert.ok(!('compare_options' in r.structuredContent))
})
