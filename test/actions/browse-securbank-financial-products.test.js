const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/browse-securbank-financial-products/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/browse-securbank-financial-products.json')
const DATA = require('../actions/browse-securbank-financial-products/data.json')

const ids = (r) => r.structuredContent.records.map((x) => x.id)

test('example arguments reproduce the canonical tool result', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
    assert.deepEqual(ids(res), example.record_ids)
})

test('content[0] is a text block', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('no required params: empty call returns every record in source order', async () => {
    const res = await handler({})
    assert.deepEqual(ids(res), DATA.map((r) => r.id))
    assert.deepEqual(res.structuredContent.arguments, {})
})

test('wrong type names the param and returns no records', async () => {
    const res = await handler({ product_type: 5 })
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /product_type/)
})

test('no-match call keeps the example top-level keys', async () => {
    const res = await handler({ product_type: 'boat loan' })
    assert.deepEqual(res.structuredContent.records, [])
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.deepEqual(Object.keys(res).sort(), ['content', 'structuredContent'])
})

test('product_type filters on its own, case-insensitively', async () => {
    const res = await handler({ product_type: 'Credit Card' })
    assert.deepEqual(ids(res), DATA.filter((r) => r.product_type === 'credit card').map((r) => r.id))
    assert.equal(res.structuredContent.records[0], DATA.find((r) => r.product_type === 'credit card') && res.structuredContent.records[0])
    assert.deepEqual(res.structuredContent.records[0], DATA.find((r) => r.product_type === 'credit card'))
})

test('query is context only and never filters', async () => {
    const res = await handler({ query: 'nothing matches this text' })
    assert.equal(res.structuredContent.records.length, DATA.length)
    assert.deepEqual(res.structuredContent.arguments, { query: 'nothing matches this text' })
})

test('comma-separated product_type selects both records', async () => {
    const res = await handler({ product_type: 'mortgage, health insurance' })
    assert.deepEqual(ids(res), DATA.filter((r) => ['mortgage', 'health insurance'].includes(r.product_type)).map((r) => r.id))
    assert.equal(res.structuredContent.records.length, 2)
})

test('unknown keys are dropped from arguments', async () => {
    const res = await handler({ product_type: 'account', foo: 'bar' })
    assert.deepEqual(res.structuredContent.arguments, { product_type: 'account' })
    assert.equal(res.structuredContent.records.length, 1)
})
