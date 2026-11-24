const DATA = Array.from(require('./data.json'))

const PARAMS = [
    { name: 'query', type: 'string', required: false },
    { name: 'product_type', type: 'string', required: false },
]
const BINDING = { product_type: 'product_type' }

const norm = (v) => String(v).trim().toLowerCase()

function valueMatches(fieldValue, arg) {
    if (fieldValue === undefined || fieldValue === null) return false
    const values = Array.isArray(fieldValue) ? fieldValue : [fieldValue]
    const candidates = [arg]
    if (typeof arg === 'string' && arg.includes(',')) {
        candidates.push(...arg.split(',').map((s) => s.trim()).filter(Boolean))
    }
    return values.some((v) => {
        if (v === undefined || v === null) return false
        return candidates.some((c) => {
            if (typeof c === 'number') {
                const n = typeof v === 'number' ? v : parseNumber(v)
                return n !== null && n === c
            }
            return norm(v) === norm(c)
        })
    })
}

function parseNumber(v) {
    if (typeof v === 'number') return v
    const s = String(v).replace(/[^\d.,-]/g, '')
    if (!s) return null
    let t = s
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.')
    else t = t.replace(/,/g, '')
    const n = Number(t)
    return Number.isFinite(n) ? n : null
}

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name)) known[p.name] = input[p.name]
    }
    const reject = (text) => ({
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records: [] },
    })
    for (const p of PARAMS) {
        const v = known[p.name]
        if (v === undefined || v === null || v === '') {
            if (p.required) return reject(`Missing required parameter: ${p.name}.`)
            continue
        }
        if (p.type === 'string' && typeof v !== 'string') {
            return reject(`Parameter ${p.name} must be a string.`)
        }
    }

    let records = DATA
    for (const [param, field] of Object.entries(BINDING)) {
        const v = known[param]
        if (v === undefined || v === null || v === '') continue
        records = records.filter((r) => valueMatches(r && r[field], v))
    }

    const n = records.length
    const text = n === 0
        ? 'No SecurBank financial products match this request.'
        : `Found ${n} SecurBank financial product${n === 1 ? '' : 's'}.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
