const DATA = Array.from(require('./data.json'))

const PARAMS = [
    { name: 'spending_priority', type: 'string', required: false },
    { name: 'profession', type: 'string', required: false },
    { name: 'pays_balance_in_full', type: 'boolean', required: false },
    { name: 'annual_spend', type: 'number', required: false },
]

// action.params_binding is empty: every param is context only and never filters.
const BINDING = {}

function typeOk(type, value) {
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
    return typeof value === type
}

function toNumber(value) {
    if (typeof value === 'number') return value
    if (typeof value !== 'string') return NaN
    let s = value.replace(/[^0-9.,-]/g, '')
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
    return s === '' ? NaN : Number(s)
}

function matchOne(fieldValue, arg) {
    if (fieldValue === undefined || fieldValue === null) return false
    if (Array.isArray(fieldValue)) return fieldValue.some((item) => matchOne(item, arg))
    if (typeof arg === 'number') return toNumber(fieldValue) === arg
    if (typeof arg === 'boolean') return fieldValue === arg
    if (typeof arg === 'string') return String(fieldValue).trim().toLowerCase() === arg.trim().toLowerCase()
    return false
}

function matches(fieldValue, arg) {
    if (matchOne(fieldValue, arg)) return true
    if (typeof arg === 'string' && arg.includes(',')) {
        return arg.split(',').map((s) => s.trim()).filter(Boolean).some((part) => matchOne(fieldValue, part))
    }
    return false
}

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name) && input[p.name] !== undefined) {
            known[p.name] = input[p.name]
        }
    }

    for (const p of PARAMS) {
        if (p.required && !(p.name in known)) {
            return {
                content: [{ type: 'text', text: `Missing required parameter: ${p.name}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
    }
    for (const p of PARAMS) {
        if (p.name in known && known[p.name] !== null && !typeOk(p.type, known[p.name])) {
            return {
                content: [{ type: 'text', text: `Parameter ${p.name} must be a ${p.type}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
    }

    let records = DATA
    for (const [param, field] of Object.entries(BINDING)) {
        if (param in known && known[param] !== null) {
            records = records.filter((r) => matches(r ? r[field] : undefined, known[param]))
        }
    }

    const n = records.length
    const text = n === 0
        ? 'No SecurBank credit cards matched these answers.'
        : `Found ${n} SecurBank credit card${n === 1 ? '' : 's'} to review against your answers.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
