const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/apply-for-securbank-credit-card/index.js')

test('opens the selected native form without downloading a definition', async () => {
    const result = await handler()
    assert.deepEqual(result, {
        content: [{ type: 'text', text: "Showing the Apply for SecurBank credit card form for the user to fill in and submit." }],
        _meta: { render: 'native-embed', formPageUrl: "https://www.securbankdemo.com/content/forms/af/securebank/credit-card", formId: "L2NvbnRlbnQvZm9ybXMvYWYvc2VjdXJlYmFuay9jcmVkaXQtY2FyZA==" }
    })
    assert.deepEqual(await handler({ formPageUrl: 'not-a-page', formId: 'other' }), result)
})
