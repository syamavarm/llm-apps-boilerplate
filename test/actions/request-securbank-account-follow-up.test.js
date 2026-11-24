const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/request-securbank-account-follow-up/index.js')

test('opens the selected native form without downloading a definition', async () => {
    const result = await handler()
    assert.deepEqual(result, {
        content: [{ type: 'text', text: "Showing the Request SecurBank account follow-up form for the user to fill in and submit." }],
        _meta: { render: 'native-embed', formPageUrl: "https://www.securbankdemo.com/accounts", formId: "L2NvbnRlbnQvc2VjdXJiYW5rL2VuL2FjY291bnRzL2pjcjpjb250ZW50L3Jvb3Qvc2VjdGlvbl8xMDIzNzI4MDI2L2Zvcm0=" }
    })
    assert.deepEqual(await handler({ formPageUrl: 'not-a-page', formId: 'other' }), result)
})
