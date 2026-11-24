const DATA = Array.from(require('./data.json'))

const PARAMS = [{ name: 'credit_card_ids', type: 'string', required: true }]
const BOUND_FIELD = 'credit_card_id'

const norm = (v) => String(v).trim().toLowerCase()

const fieldValues = (record) => {
    const v = record == null ? null : record[BOUND_FIELD]
    if (v === null || v === undefined) return []
    return (Array.isArray(v) ? v : [v]).filter((x) => x !== null && x !== undefined).map(norm)
}

const reply = (text, known, records) => ({
    content: [{ type: 'text', text }],
    structuredContent: { arguments: known, records },
})

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name)) known[p.name] = input[p.name]
    }

    for (const p of PARAMS) {
        const v = known[p.name]
        if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
            if (p.required) return reply(`Missing required parameter: ${p.name}.`, known, [])
            continue
        }
        if (typeof v !== p.type) {
            return reply(`Parameter ${p.name} must be a ${p.type}.`, known, [])
        }
    }

    const raw = known.credit_card_ids
    const whole = norm(raw)
    let wanted
    if (DATA.some((r) => fieldValues(r).includes(whole))) {
        wanted = [whole]
    } else {
        wanted = raw.split(',').map(norm).filter(Boolean)
    }

    const records = []
    for (const w of wanted) {
        for (const r of DATA) {
            if (!records.includes(r) && fieldValues(r).includes(w)) records.push(r)
        }
    }

    if (records.length === 0) {
        return reply('No SecurBank credit cards match those identifiers.', known, [])
    }
    if (records.length !== 2) {
        return reply(`Found ${records.length} SecurBank credit card${records.length === 1 ? '' : 's'}; choose exactly two to compare.`, known, records)
    }
    return reply('Comparing 2 SecurBank credit cards side by side.', known, records)
}
