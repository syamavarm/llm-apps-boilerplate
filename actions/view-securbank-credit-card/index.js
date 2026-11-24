const DATA = Array.from(require('./data.json'))

const PARAMS = [
    { name: 'credit_card_id', type: 'string', required: true },
]
const BINDING = { credit_card_id: 'credit_card_id' }
const COMPARE_FIELD = 'credit_card_id'

function isEmpty(value) {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
}

function norm(value) {
    return String(value).trim().toLowerCase()
}

function fieldMatches(fieldValue, wanted) {
    if (fieldValue === null || fieldValue === undefined) return false
    const items = Array.isArray(fieldValue) ? fieldValue : [fieldValue]
    return items.some((item) => item !== null && item !== undefined && wanted.has(norm(item)))
}

function matchesString(fieldValue, arg) {
    const whole = new Set([norm(arg)])
    if (fieldMatches(fieldValue, whole)) return true
    const parts = new Set(String(arg).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
    return parts.size > 0 && fieldMatches(fieldValue, parts)
}

function compareOptions(records) {
    const chosen = new Set(records)
    return DATA.filter((r) => !chosen.has(r) && !isEmpty(r[COMPARE_FIELD]))
        .map((r) => ({ id: r.id, name: r.name, [COMPARE_FIELD]: r[COMPARE_FIELD] }))
}

function result(text, known, records) {
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records, compare_options: compareOptions(records) },
    }
}

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name)) known[p.name] = input[p.name]
    }

    for (const p of PARAMS) {
        const value = known[p.name]
        if (p.required && (value === undefined || value === null || value === '')) {
            return result(`Missing required parameter: ${p.name}.`, known, [])
        }
        if (value !== undefined && value !== null && typeof value !== p.type) {
            return result(`Parameter ${p.name} must be a ${p.type}.`, known, [])
        }
    }

    const records = DATA.filter((record) => Object.entries(BINDING).every(([param, field]) => {
        if (known[param] === undefined || known[param] === null) return true
        return matchesString(record[field], known[param])
    }))

    if (records.length === 0) {
        return result(`No SecurBank credit card matches credit_card_id "${known.credit_card_id}".`, known, [])
    }
    const text = records.length === 1
        ? `Here are the published details for the SecurBank ${records[0].name}.`
        : `Found ${records.length} SecurBank credit cards.`
    return result(text, known, records)
}
