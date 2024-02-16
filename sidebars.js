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
        items: ['integrations/wordpress', 'integrations/webflow', 'integrations/framer', 'integrations/wix', 'integrations/ghost', 'integrations/django', 'integrations/sveltekit'],
      },
      'troubleshooting',
    ],
    'Site settings': [
      'sitesettings/how-to-access-site-settings',
      'sitesettings/how-to-invite-users-to-your-website',
      'sitesettings/embed-your-analytics-dashboard-into-your-website',
      'sitesettings/get-analytics-email-reports',
      'sitesettings/reset-sites-data',
    ],
    'Billing & Subscription': [
      'billing/exceeding-plan-limits',
      'billing/update-subscription',
      'billing/cancel-subscription',
      'billing/faq',
    ],
    'Affiliate program': [
      'affiliate/about',
      'affiliate/terms',
    ],
    'Extensions SDK': [
      'ext-sdk-introduction',
      'ext-sdk-faq',
      'ext-sdk-reference',
    ],
    'API': [
      'api/stats',
      'api/events',
      'api/admin',
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
    'Contribute': [
      'contribute/how-to',
    ],
  },
}
