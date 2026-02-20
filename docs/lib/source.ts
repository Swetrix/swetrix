import { docs } from 'fumadocs-mdx:collections/server';
import { loader } from 'fumadocs-core/source';

const SLUG_MAP: Record<string, string[]> = {
  'introduction': [],

  // Root files with custom slugs
  'add-script': ['install-script'],
  'script-reference': ['swetrix-js-reference'],
  'integration-guides': ['integrations'],

  // Integration special cases
  'integrations/google-tag-manager': ['gtm-integration'],
  'integrations/google-search-console': ['integrations', 'google-search-console'],

  // API files → flat URLs
  'api/stats': ['statistics-api'],
  'api/events': ['events-api'],
  'api/admin': ['admin-api'],

  // Site settings → flat URLs
  'sitesettings/how-to-access-site-settings': ['how-to-access-site-settings'],
  'sitesettings/project-configuration': ['project-configuration-and-security'],
  'sitesettings/how-to-invite-users-to-your-website': [
    'how-to-invite-users-to-your-website',
  ],
  'sitesettings/transfer-ownership': [
    'how-to-transfer-ownership-of-your-website',
  ],
  'sitesettings/embed-your-analytics-dashboard-into-your-website': [
    'how-to-embed',
  ],
  'sitesettings/get-analytics-email-reports': ['get-analytics-email-reports'],
  'sitesettings/get-traffic-alerts': ['get-traffic-alerts'],
  'sitesettings/reset-sites-data': ['reset-sites-data'],
  'sitesettings/annotations': ['annotations'],

  // Account settings → mixed flat/nested URLs
  'accountsettings/two-factor-authentication': [
    'settings',
    '2-factor-authentication',
  ],
  'accountsettings/teams-and-integrations': ['teams-api-integrations'],
  'accountsettings/api-keys': ['settings', 'api-keys'],
  'accountsettings/email-reports': ['email-reports'],
  'accountsettings/change-email': ['settings', 'change-email'],
  'accountsettings/change-password': ['settings', 'change-password'],
  'accountsettings/delete-account': ['settings', 'delete-account'],
  'accountsettings/other-settings': ['settings', 'other-settings'],

  // Billing → flat URLs
  'billing/upgrade-from-trial': [
    'upgrade-from-trial-to-a-paid-subscription',
  ],
  'billing/exceeding-plan-limits': ['exceeding-plan-limits'],
  'billing/update-subscription': ['update-your-subscription'],
  'billing/cancel-subscription': ['cancel-your-subscription'],
  'billing/faq': ['billing-faq'],

  // Adblockers
  'adblockers/how-to-deal-with-adblockers': ['adblockers', 'how-to'],

  // Contribute
  'contribute/how-to': ['contribute'],
};

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
  slugs(file) {
    const p = file.path
      .replace(/\.(mdx|md)$/, '')
      .replace(/\/index$/, '');

    if (p in SLUG_MAP) return SLUG_MAP[p];

    // Generic integration pattern: integrations/name → name-integration
    if (p.startsWith('integrations/') && p !== 'integrations') {
      const name = p.replace('integrations/', '');
      return [name + '-integration'];
    }

    return undefined;
  },
});
