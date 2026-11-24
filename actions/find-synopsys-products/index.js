const DATA = Array.from(require('./data.json'))

const PARAMS = [
    { name: 'query', type: 'string', required: false },
    { name: 'product_family', type: 'string', required: false },
    { name: 'industry', type: 'string', required: false },
    { name: 'limit', type: 'integer', required: false },
]

const BINDING = {
    product_family: 'product_family',
    industry: 'industries',
}

function typeOk(type, value) {
    if (type === 'string') return typeof value === 'string'
    if (type === 'integer') return Number.isInteger(value)
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'boolean') return typeof value === 'boolean'
    return true
}

function norm(value) {
    return String(value).trim().toLowerCase()
}

function scalarMatches(fieldValue, wanted) {
    if (fieldValue === null || fieldValue === undefined) return false
    if (typeof fieldValue === 'object') return false
    return norm(fieldValue) === wanted
}

function fieldMatches(fieldValue, wanted) {
    if (Array.isArray(fieldValue)) return fieldValue.some((item) => scalarMatches(item, wanted))
    return scalarMatches(fieldValue, wanted)
}

function stringMatches(fieldValue, argValue) {
    const whole = norm(argValue)
    if (whole && fieldMatches(fieldValue, whole)) return true
    if (!argValue.includes(',')) return false
    return argValue
        .split(',')
        .map((part) => norm(part))
        .filter((part) => part !== '')
        .some((part) => fieldMatches(fieldValue, part))
}

function result(text, known, records) {
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const param of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, param.name) && input[param.name] !== undefined) {
            known[param.name] = input[param.name]
        }
    }

    for (const param of PARAMS) {
        const present = Object.prototype.hasOwnProperty.call(known, param.name) && known[param.name] !== null
        if (param.required && !present) {
            return result(`Missing required parameter: ${param.name}.`, known, [])
        }
        if (present && !typeOk(param.type, known[param.name])) {
            return result(`Invalid parameter ${param.name}: expected ${param.type}.`, known, [])
        }
    }

    const filters = Object.keys(BINDING).filter(
        (name) => typeof known[name] === 'string' && known[name].trim() !== ''
    )

    const records = DATA.filter((record) =>
        filters.every((name) => stringMatches(record ? record[BINDING[name]] : undefined, known[name]))
    )

    const text = records.length === 0
        ? 'No Synopsys products matched this search.'
        : `Found ${records.length} Synopsys product${records.length === 1 ? '' : 's'}.`
    return result(text, known, records)
}
