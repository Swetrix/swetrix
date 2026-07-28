/**
 * Variant keys for the server-side A/B tests we run on ourselves via Swetrix
 * experiments. These must match the variant keys of the matching experiment in
 * the Swetrix dashboard exactly.
 *
 * Variants are resolved in the loader, so the page is server-rendered in its
 * final form - no flash of the control arm, no client-side flicker.
 */

/**
 * Hero signup CTA. `control` is the plain "start a free trial" button;
 * `variant` replaces it with a "type your website" field that carries the
 * domain through signup and into onboarding.
 */
export const HERO_SIGNUP_EXPERIMENT = {
  control: 'control',
  siteInput: 'variant',
} as const
