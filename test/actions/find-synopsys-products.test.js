const test = require('node:test')
const assert = require('node:assert/strict')

const handler = require('../actions/find-synopsys-products/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/find-synopsys-products.json')
const fixture = require('../fixture.json')

const DATA = fixture.dataset.records
const ids = (res) => res.structuredContent.records.map((r) => r.id)

test('example arguments reproduce eds/find-synopsys-products.json', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
    assert.deepEqual(ids(res), example.record_ids)
})

test('content[0] is a text item', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('no required params: empty call returns every record in source order', async () => {
    const required = fixture.action.params.filter((p) => p.required)
    assert.equal(required.length, 0)
    const res = await handler({})
    assert.deepEqual(res.structuredContent, { arguments: {}, records: DATA })
})

test('invalid type returns empty records and names the param', async () => {
    const res = await handler({ limit: 'five' })
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /limit/)
    const res2 = await handler({ product_family: 5 })
    assert.deepEqual(res2.structuredContent.records, [])
    assert.match(res2.content[0].text, /product_family/)
})

test('no-match call keeps the same top-level keys', async () => {
    const res = await handler({ product_family: 'Nonexistent Family' })
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.deepEqual(res.structuredContent.records, [])
    assert.deepEqual(res.structuredContent.arguments, { product_family: 'Nonexistent Family' })
})

test('product_family filters on its own, case-insensitively', async () => {
    const res = await handler({ product_family: 'silicon ip' })
    const want = DATA.filter((r) => r.product_family === 'Silicon IP').map((r) => r.id)
    assert.ok(want.length > 0)
    assert.deepEqual(ids(res), want)
})

test('industry filters on the industries list on its own', async () => {
    const res = await handler({ industry: 'Automotive' })
    const want = DATA.filter((r) => (r.industries || []).includes('Automotive')).map((r) => r.id)
    assert.ok(want.length > 0)
    assert.deepEqual(ids(res), want)
})

test('comma-separated product_family selects both families', async () => {
    const res = await handler({ product_family: 'Verification, AI & Machine Learning' })
    const want = DATA.filter((r) => ['Verification', 'AI & Machine Learning'].includes(r.product_family)).map((r) => r.id)
    assert.deepEqual(ids(res), want)
})

test('comma-separated industry selects records with either value', async () => {
    const res = await handler({ industry: 'Medical,Storage' })
    const want = DATA.filter((r) => (r.industries || []).some((i) => i === 'Medical' || i === 'Storage')).map((r) => r.id)
    assert.ok(want.length >= 2)
    assert.deepEqual(ids(res), want)
})

test('bound params combine', async () => {
    const res = await handler({ product_family: 'Silicon Design', industry: 'HPC' })
    assert.deepEqual(ids(res), ['synopsys-products-3', 'synopsys-products-4'])
})

test('unbound params are context only and unknown keys are dropped', async () => {
    const res = await handler({ product_family: 'Silicon Design', query: 'zzz', limit: 1, bogus: true })
    assert.deepEqual(res.structuredContent.arguments, { product_family: 'Silicon Design', query: 'zzz', limit: 1 })
    assert.deepEqual(res.structuredContent.records, expected.records)
})

test('records are whole objects from the dataset', async () => {
    const res = await handler({ industry: 'HPC' })
    for (const r of res.structuredContent.records) {
        assert.deepEqual(r, DATA.find((d) => d.id === r.id))
    }
    assert.equal(res.structuredContent.compare_options, undefined)
})
