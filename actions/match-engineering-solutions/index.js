const DATA = Array.from(require('./data.json'))

const PARAMS = [
    { name: 'engineering_goal', type: 'string', required: false },
    { name: 'industry', type: 'string', required: false },
    { name: 'lifecycle_stage', type: 'string', required: false },
    { name: 'current_environment', type: 'string', required: false },
]

// params_binding is empty: every param is context only and never filters.
const BINDING = {}

function typeOk(type, value) {
    if (type === 'string') return typeof value === 'string'
    if (type === 'integer') return Number.isInteger(value)
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'boolean') return typeof value === 'boolean'
    return true
}

function toNumber(v) {
    if (typeof v === 'number') return v
    if (typeof v !== 'string') return NaN
    let s = v.replace(/[^\d.,-]/g, '')
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
    return s === '' ? NaN : Number(s)
}

function scalarMatch(fieldValue, arg) {
    if (fieldValue === null || fieldValue === undefined) return false
    if (typeof arg === 'number') return toNumber(fieldValue) === arg
    if (typeof arg === 'string') {
        const f = String(fieldValue).trim().toLowerCase()
        const whole = arg.trim().toLowerCase()
        if (f === whole) return true
        return arg.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).includes(f)
    }
    return fieldValue === arg
}

function fieldMatch(fieldValue, arg) {
    if (Array.isArray(fieldValue)) return fieldValue.some((item) => scalarMatch(item, arg))
    return scalarMatch(fieldValue, arg)
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
        if (p.required && (known[p.name] === undefined || known[p.name] === null || known[p.name] === '')) {
            return {
                content: [{ type: 'text', text: `Missing required parameter: ${p.name}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
        if (known[p.name] !== undefined && known[p.name] !== null && !typeOk(p.type, known[p.name])) {
            return {
                content: [{ type: 'text', text: `Parameter ${p.name} must be a ${p.type}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
    }

    let records = DATA
    for (const [param, field] of Object.entries(BINDING)) {
        const value = known[param]
        if (value === undefined || value === null || value === '') continue
        records = records.filter((r) => r && fieldMatch(r[field], value))
    }

    const text = records.length
        ? `Found ${records.length} Synopsys solution area${records.length === 1 ? '' : 's'} for this engineering challenge.`
        : 'No Synopsys solution areas matched this engineering challenge.'
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
