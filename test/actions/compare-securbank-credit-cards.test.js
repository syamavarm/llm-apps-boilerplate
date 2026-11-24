const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/compare-securbank-credit-cards/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/compare-securbank-credit-cards.json')
const DATA = require('../actions/compare-securbank-credit-cards/data.json')

const ids = (res) => res.structuredContent.records.map((r) => r.id)

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

test('missing required credit_card_ids returns no records and names the param', async () => {
    for (const args of [{}, undefined, { credit_card_ids: '' }, { credit_card_ids: null }]) {
        const res = await handler(args)
        assert.deepEqual(res.structuredContent.records, [])
        assert.match(res.content[0].text, /credit_card_ids/)
        assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    }
})

test('wrong type for credit_card_ids is rejected', async () => {
    const res = await handler({ credit_card_ids: 42 })
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /credit_card_ids/)
})

test('no-match call keeps the same top-level keys', async () => {
    const res = await handler({ credit_card_ids: 'no-such-card,another-missing' })
    assert.deepEqual(res.structuredContent.records, [])
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
})

test('credit_card_ids filters on credit_card_id by itself, case-insensitively', async () => {
    const res = await handler({ credit_card_ids: 'LOW-RATE-CARD' })
    assert.deepEqual(ids(res), ['credit-cards-4'])
    assert.deepEqual(res.structuredContent.records[0], DATA[3])
})

test('comma-separated value selects both records, in argument order, trimmed', async () => {
    const res = await handler({ credit_card_ids: ' the-ultimate-card , rewards-card ' })
    assert.deepEqual(ids(res), ['credit-cards-6', 'credit-cards-3'])
    assert.match(res.content[0].text, /2/)
})

test('unknown keys are dropped from arguments', async () => {
    const res = await handler({ credit_card_ids: 'apex-card,low-fee-card', extra: 'x' })
    assert.deepEqual(res.structuredContent.arguments, { credit_card_ids: 'apex-card,low-fee-card' })
    assert.deepEqual(ids(res), ['credit-cards-1', 'credit-cards-5'])
})

test('no compare_options key is added', async () => {
    const res = await handler({ credit_card_ids: 'rewards-card,low-rate-card' })
    assert.equal('compare_options' in res.structuredContent, false)
})
