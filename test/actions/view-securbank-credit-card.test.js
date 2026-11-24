const test = require('node:test')
const assert = require('node:assert/strict')

const handler = require('../actions/view-securbank-credit-card/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/view-securbank-credit-card.json')
const data = require('../actions/view-securbank-credit-card/data.json')

test('example arguments reproduce the canonical tool result', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
})

test('content[0] is a text block', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('missing credit_card_id returns no records and names the param', async () => {
    const res = await handler({})
    assert.deepEqual(res.structuredContent.records, [])
    assert.deepEqual(res.structuredContent.arguments, {})
    assert.match(res.content[0].text, /credit_card_id/)
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.equal(res.structuredContent.compare_options.length, data.length)
})

test('wrong type for credit_card_id is rejected and named', async () => {
    const res = await handler({ credit_card_id: 42 })
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /credit_card_id/)
})

test('no match returns the same top-level keys', async () => {
    const res = await handler({ credit_card_id: 'no-such-card' })
    assert.deepEqual(res.structuredContent.records, [])
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.deepEqual(Object.keys(res).sort(), ['content', 'structuredContent'])
})

test('credit_card_id filters on its own, case-insensitively', async () => {
    for (const record of data) {
        const res = await handler({ credit_card_id: record.credit_card_id.toUpperCase() })
        assert.deepEqual(res.structuredContent.records, [record])
    }
})

test('unknown keys are dropped from arguments', async () => {
    const res = await handler({ credit_card_id: 'apex-card', extra: 'x' })
    assert.deepEqual(res.structuredContent.arguments, { credit_card_id: 'apex-card' })
})

test('comma-separated credit_card_id selects both records', async () => {
    const res = await handler({ credit_card_id: 'low-rate-card, rewards-card' })
    assert.deepEqual(res.structuredContent.records.map((r) => r.id), ['credit-cards-3', 'credit-cards-4'])
})

test('compare_options leave out the requested record', async () => {
    const res = await handler({ credit_card_id: 'low-fee-card' })
    const ids = res.structuredContent.compare_options.map((o) => o.id)
    assert.ok(!ids.includes('credit-cards-5'))
    assert.equal(ids.length, data.length - 1)
    for (const o of res.structuredContent.compare_options) {
        assert.deepEqual(Object.keys(o).sort(), ['credit_card_id', 'id', 'name'])
    }
})
