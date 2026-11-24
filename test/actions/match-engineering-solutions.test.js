const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/match-engineering-solutions/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/match-engineering-solutions.json')
const fixture = require('../fixture.json')

test('example arguments reproduce eds/match-engineering-solutions.json', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
    assert.deepEqual(res.structuredContent.records.map((r) => r.id), example.record_ids)
})

test('content[0] is a text block', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('no required params: empty call returns every record in dataset order', async () => {
    assert.equal(fixture.action.params.filter((p) => p.required).length, 0)
    const res = await handler({})
    assert.deepEqual(res.structuredContent.arguments, {})
    assert.deepEqual(res.structuredContent.records, fixture.dataset.records)
    const res2 = await handler()
    assert.deepEqual(res2.structuredContent.records, fixture.dataset.records)
})

test('unbound params are context only and never filter', async () => {
    assert.deepEqual(fixture.action.params_binding, {})
    for (const p of fixture.action.params) {
        const res = await handler({ [p.name]: 'zzz-no-such-value' })
        assert.deepEqual(res.structuredContent.arguments, { [p.name]: 'zzz-no-such-value' })
        assert.equal(res.structuredContent.records.length, fixture.dataset.records.length)
        assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    }
})

test('comma-separated values do not filter without a binding', async () => {
    const [a, b] = fixture.dataset.records
    const res = await handler({ industry: `${a.name},${b.name}` })
    assert.equal(res.structuredContent.records.length, fixture.dataset.records.length)
})

test('unknown keys are dropped; values pass unchanged', async () => {
    const res = await handler({ ...example.arguments, bogus: 1 })
    assert.deepEqual(res.structuredContent.arguments, example.arguments)
    assert.deepEqual(Object.keys(res.structuredContent).sort(), ['arguments', 'records'])
})

test('wrong type is rejected with empty records naming the param', async () => {
    const res = await handler({ industry: 42 })
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /industry/)
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
})

test('records are whole dataset objects', async () => {
    const res = await handler({})
    res.structuredContent.records.forEach((r, i) => assert.deepEqual(r, fixture.dataset.records[i]))
})
