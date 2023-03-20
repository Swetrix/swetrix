module.exports = {
  docs: {
    'Get Started': [
      'introduction',
      'add-script',
      'script-reference',
      'integration-guides',
      {
        type: 'category',
        label: 'Integrations',
        items: ['integrations/wordpress', 'integrations/webflow', 'integrations/wix', 'integrations/ghost', 'integrations/django', 'integrations/sveltekit'],
      }
    ],
    'Extensions SDK': [
      'ext-sdk-introduction',
      'ext-sdk-faq',
      'ext-sdk-reference',
    ],
    'API': [
      'api/stats',
    ],
    'CAPTCHA': [
      'captcha/introduction',
      'captcha/client-side-usage',
      'captcha/server-side-validation',
      'captcha/testing',
    ],
    'Self-hosting': [
      'selfhosting/how-to',
      'selfhosting/configuring',
    ],
  },
}
