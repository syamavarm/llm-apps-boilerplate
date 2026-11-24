const DATA = Array.from(require('./data.json'))

// action.params: name -> { type, required }
const PARAMS = {
    query: { type: 'string', required: false },
    category: { type: 'string', required: false },
    limit: { type: 'integer', required: false },
}

// action.params_binding is empty: no param filters records.
// Every param is context only, so every valid call returns all records in source order.
const BINDING = {}

function typeOk(type, value) {
    if (type === 'string') return typeof value === 'string'
    if (type === 'integer') return typeof value === 'number' && Number.isInteger(value)
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'boolean') return typeof value === 'boolean'
    return true
}

function norm(v) {
    return String(v).trim().toLowerCase()
}

function parseNum(v) {
    if (typeof v === 'number') return v
    if (typeof v !== 'string') return NaN
    let s = v.replace(/[^0-9.,-]/g, '')
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
    return s === '' ? NaN : Number(s)
}

function valueMatches(fieldValue, arg) {
    if (fieldValue === undefined || fieldValue === null) return false
    if (Array.isArray(fieldValue)) return fieldValue.some((item) => valueMatches(item, arg))
    if (typeof arg === 'number') return parseNum(fieldValue) === arg
    if (typeof arg === 'string') {
        if (norm(fieldValue) === norm(arg)) return true
        const parts = arg.split(',').map((p) => p.trim()).filter(Boolean)
        return parts.some((p) => norm(fieldValue) === p.toLowerCase())
    }
    return fieldValue === arg
}

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const name of Object.keys(PARAMS)) {
        if (Object.prototype.hasOwnProperty.call(input, name) && input[name] !== undefined) {
            known[name] = input[name]
        }
    }

    for (const [name, spec] of Object.entries(PARAMS)) {
        if (spec.required && !(name in known)) {
            return {
                content: [{ type: 'text', text: `Missing required parameter: ${name}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
        if (name in known && known[name] !== null && !typeOk(spec.type, known[name])) {
            return {
                content: [{ type: 'text', text: `Parameter ${name} must be of type ${spec.type}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
    }

    let records = DATA
    for (const [param, field] of Object.entries(BINDING)) {
        if (!(param in known) || known[param] === null) continue
        records = records.filter((r) => valueMatches(r[field], known[param]))
    }

    const n = records.length
    const text = n === 0
        ? 'No SecurBank credit cards matched.'
        : `Found ${n} SecurBank credit card${n === 1 ? '' : 's'}.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
