/*
 * contact-synopsys-sales: opens a form as a widget.
 *
 * The form is identified by an absolute URL: its headless JSON, or (FORM_EMBEDDED) the EDS page's
 * .plain.html whose form block embeds the published definition. The handler downloads it server-side,
 * so the form host needs no CORS setup for the widget's sandboxed iframe, and passes it to the widget
 * only (`_meta.formDefinition`), never to the model; the widget writes it into the page as <pre><code>,
 * which the site's form block loads. No inputSchema: with none, the MCP SDK passes the
 * request context first, so the handler deliberately reads no arguments.
 */
const FORM_URL = "https://llm-apps-synopsys-form--securbank--syamavarm.aem.page/eds-widgets/forms/contact-synopsys-sales.plain.html"
const FORM_EMBEDDED = true
const FORM_ORIGIN = "https://www.synopsys.com"
// Used when the live definition has no title of its own.
const FORM_TITLE = "Contact Synopsys sales"
// True only for a form codegen converted (Marketo): its submit action is an absolute Submission Service URL.
const FORM_CONVERTED = true
const TIMEOUT_MS = 10000
// A form definition is a few hundred KB at most; a larger response is not a form.
const MAX_BYTES = 2 * 1024 * 1024

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }

function decodeEntities (text) {
    return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, code) => {
        if (code[0] === '#') {
            const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
            return Number.isFinite(n) ? String.fromCodePoint(n) : match
        }
        return ENTITIES[code.toLowerCase()] ?? match
    })
}

/* The definition embedded in the page's first form block, decoded as the EDS form block does. */
function embeddedForm (html) {
    // `form` as one of the div's classes, as EDS writes a block ("form", "form contact-us").
    const block = html.search(/<div[^>]*\sclass="(?:[^"]*\s)?form(?:\s[^"]*)?"/)
    const match = block < 0 ? null : /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/.exec(html.slice(block))
    if (!match) throw new Error('the page has no embedded form definition')
    const content = decodeEntities(match[1]).trim()
    return content.startsWith('"') && content.endsWith('"') ? JSON.parse(JSON.parse(content)) : JSON.parse(content)
}

/* The response body as text, refused once it passes MAX_BYTES. */
async function readCapped (res) {
    if (Number(res.headers.get('content-length')) > MAX_BYTES) throw new Error(`form response is over ${MAX_BYTES} bytes`)
    if (!res.body) return ''
    const reader = res.body.getReader()
    const chunks = []
    let size = 0
    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_BYTES) {
            await reader.cancel()
            throw new Error(`form response is over ${MAX_BYTES} bytes`)
        }
        chunks.push(value)
    }
    return new TextDecoder().decode(Buffer.concat(chunks))
}

async function loadForm () {
    const accept = FORM_EMBEDDED ? 'text/html' : 'application/json'
    // No redirects: the handler downloads FORM_URL and nothing else.
    const res = await fetch(FORM_URL, { headers: { accept }, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`form URL returned HTTP ${res.status}`)
    const text = await readCapped(res)
    // Passed through as is: interpreting the form definition is the form block's job.
    return FORM_EMBEDDED ? embeddedForm(text) : JSON.parse(text)
}

module.exports = async () => {
    try {
        const started = Date.now()
        const formDefinition = await loadForm()
        console.log(`[contact-synopsys-sales] form loaded url=${FORM_URL} title="${formDefinition?.title}" ms=${Date.now() - started}`)
        return {
            // The model reads only the planner's title: the live definition's text never reaches it.
            content: [{ type: 'text', text: `Showing the ${FORM_TITLE} form for the user to fill in and submit.` }],
            _meta: { formDefinition, formOrigin: FORM_ORIGIN, formTitle: formDefinition?.title || FORM_TITLE, formConverted: FORM_CONVERTED }
        }
    } catch (error) {
        console.error(`[contact-synopsys-sales] ${error.message}`)
        return { isError: true, content: [{ type: 'text', text: 'The form could not be loaded right now. Please try again later.' }] }
    }
}
