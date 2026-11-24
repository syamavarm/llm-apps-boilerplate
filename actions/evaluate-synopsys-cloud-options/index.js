const DATA = Array.from(require('./data.json'))

const PARAMS = [
    { name: 'workload', type: 'string', required: false },
    { name: 'current_infrastructure', type: 'string', required: false },
    { name: 'capacity_pattern', type: 'string', required: false },
    { name: 'security_requirements', type: 'string', required: false },
]

// action.params_binding is empty: every param is context only and never filters.
const BINDING = {}

function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value !== 'string') return null
    let s = value.replace(/[^\d.,-]/g, '')
    if (!s) return null
    if (s.includes(',') && s.includes('.')) {
        s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
    } else if (s.includes(',')) {
        s = s.replace(',', '.')
    }
    const n = Number(s)
    return Number.isFinite(n) ? n : null
}

function valueMatches(fieldValue, wanted) {
    if (fieldValue === undefined || fieldValue === null) return false
    if (Array.isArray(fieldValue)) return fieldValue.some((item) => valueMatches(item, wanted))
    if (typeof wanted === 'number') {
        const n = parseNumber(fieldValue)
        return n !== null && n === wanted
    }
    return String(fieldValue).trim().toLowerCase() === String(wanted).trim().toLowerCase()
}

function argMatches(fieldValue, arg) {
    if (valueMatches(fieldValue, arg)) return true
    if (typeof arg === 'string' && arg.includes(',')) {
        return arg.split(',').map((s) => s.trim()).filter(Boolean).some((item) => valueMatches(fieldValue, item))
    }
    return false
}

function typeOk(value, type) {
    if (type === 'string') return typeof value === 'string'
    if (type === 'number' || type === 'integer') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'boolean') return typeof value === 'boolean'
    if (type === 'array') return Array.isArray(value)
    return true
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
        if (known[p.name] !== undefined && known[p.name] !== null && !typeOk(known[p.name], p.type)) {
            return {
                content: [{ type: 'text', text: `Parameter ${p.name} must be a ${p.type}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
    }

    let records = DATA
    for (const [param, field] of Object.entries(BINDING)) {
        const arg = known[param]
        if (arg === undefined || arg === null || arg === '') continue
        records = records.filter((r) => r && argMatches(r[field], arg))
    }

    const text = records.length
        ? `Found ${records.length} Synopsys Cloud deployment and licensing options to compare.`
        : 'No Synopsys Cloud options matched this request.'
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
