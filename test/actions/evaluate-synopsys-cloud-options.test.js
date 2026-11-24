const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/evaluate-synopsys-cloud-options/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/evaluate-synopsys-cloud-options.json')
const fixture = require('../fixture.json')

const ids = (r) => r.structuredContent.records.map((x) => x.id)

test('example arguments reproduce eds result exactly (parity)', async () => {
    const r = await handler(example.arguments)
    assert.deepEqual(r.structuredContent, expected)
    assert.deepEqual(ids(r), example.record_ids)
})

test('content[0] is a text block', async () => {
    const r = await handler(example.arguments)
    assert.equal(r.content[0].type, 'text')
    assert.equal(typeof r.content[0].text, 'string')
    assert.deepEqual(Object.keys(r.content[0]).sort(), ['text', 'type'])
})

test('no required params: empty call returns every record in source order', async () => {
    assert.equal(fixture.action.params.filter((p) => p.required).length, 0)
    const r = await handler({})
    assert.deepEqual(r.structuredContent.arguments, {})
    assert.deepEqual(ids(r), fixture.dataset.records.map((x) => x.id))
})

test('unknown keys are dropped from arguments', async () => {
    const r = await handler({ workload: 'Emulation', bogus: 1 })
    assert.deepEqual(r.structuredContent.arguments, { workload: 'Emulation' })
})

test('unbound params are context only and never filter', async () => {
    assert.deepEqual(fixture.action.params_binding, {})
    for (const p of fixture.action.params) {
        const r = await handler({ [p.name]: 'zzz-no-such-value, other' })
        assert.equal(r.structuredContent.records.length, fixture.dataset.records.length, p.name)
    }
})

test('wrong type returns empty records naming the param, with same keys', async () => {
    const r = await handler({ workload: 42 })
    assert.deepEqual(r.structuredContent.records, [])
    assert.match(r.content[0].text, /workload/)
    assert.deepEqual(Object.keys(r.structuredContent).sort(), Object.keys(expected).sort())
})

test('structuredContent has only arguments and records; records are whole DATA objects', async () => {
    const r = await handler({ capacity_pattern: 'Variable' })
    assert.deepEqual(Object.keys(r.structuredContent).sort(), ['arguments', 'records'])
    assert.deepEqual(r.structuredContent.records, fixture.dataset.records)
})
