const test = require('node:test')
const assert = require('node:assert/strict')

const handler = require('../actions/match-securbank-credit-card/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/match-securbank-credit-card.json')
const fixture = require('../fixture.json')

const ids = (res) => res.structuredContent.records.map((r) => r.id)
const allIds = fixture.dataset.records.map((r) => r.id)

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

test('no required params: an empty call returns every record in source order', async () => {
    assert.equal(fixture.action.params.filter((p) => p.required).length, 0)
    const res = await handler({})
    assert.deepEqual(res.structuredContent, { arguments: {}, records: fixture.dataset.records })
    const res2 = await handler()
    assert.deepEqual(ids(res2), allIds)
})

test('a rejected (wrong type) call returns the same top-level keys and names the param', async () => {
    const res = await handler({ annual_spend: 'lots' })
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /annual_spend/)
    const res2 = await handler({ pays_balance_in_full: 'yes' })
    assert.deepEqual(res2.structuredContent.records, [])
    assert.match(res2.content[0].text, /pays_balance_in_full/)
})

test('unbound params are context only and never filter', async () => {
    for (const args of [
        { spending_priority: 'lower fees' },
        { profession: 'nurse' },
        { pays_balance_in_full: false },
        { annual_spend: 1000 },
        { spending_priority: 'travel,rewards' },
    ]) {
        const res = await handler(args)
        assert.deepEqual(res.structuredContent.arguments, args)
        assert.deepEqual(ids(res), allIds)
    }
})

test('unknown keys are dropped and values pass through unchanged', async () => {
    const res = await handler({ profession: 'Content Creator', bogus: 1 })
    assert.deepEqual(res.structuredContent.arguments, { profession: 'Content Creator' })
    assert.ok(!('compare_options' in res.structuredContent))
})

test('records are whole dataset objects', async () => {
    const res = await handler({})
    res.structuredContent.records.forEach((r, i) => assert.deepEqual(r, fixture.dataset.records[i]))
})
