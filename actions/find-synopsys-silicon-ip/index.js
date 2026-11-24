const DATA = Array.from(require('./data.json'))

// action.params; params_binding is {} so every param is context only.
const PARAMS = [
    { name: 'query', type: 'string', required: false },
    { name: 'ip_category', type: 'string', required: false },
    { name: 'application', type: 'string', required: false },
    { name: 'protocol_standard', type: 'string', required: false },
]
const BINDING = {}

function typeOk(value, type) {
    if (type === 'string') return typeof value === 'string'
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'boolean') return typeof value === 'boolean'
    return true
}

function toNumber(value) {
    if (typeof value === 'number') return value
    if (typeof value !== 'string') return NaN
    let s = value.replace(/[^\d.,-]/g, '')
    if (s.includes(',') && s.includes('.')) {
        s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
    } else if (s.includes(',')) {
        s = s.replace(',', '.')
    }
    return s === '' ? NaN : Number(s)
}

function itemMatches(item, value) {
    if (item === null || item === undefined) return false
    if (typeof value === 'number') return toNumber(item) === value
    if (typeof value === 'string') {
        const want = value.trim().toLowerCase()
        if (String(item).trim().toLowerCase() === want) return true
        return value.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)
            .some((v) => String(item).trim().toLowerCase() === v)
    }
    return item === value
}

function fieldMatches(field, value) {
    if (field === null || field === undefined) return false
    if (Array.isArray(field)) return field.some((item) => itemMatches(item, value))
    return itemMatches(field, value)
}

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name) && input[p.name] !== undefined) known[p.name] = input[p.name]
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
        const value = known[param]
        if (value === undefined || value === null || value === '') continue
        records = records.filter((r) => r && fieldMatches(r[field], value))
    }

    const n = records.length
    const text = n === 0
        ? 'No matching Synopsys products found.'
        : `Found ${n} Synopsys product${n === 1 ? '' : 's'} across design, verification and silicon IP.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
