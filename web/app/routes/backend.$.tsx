import {
  data,
} from 'react-router'

// This route is only used for Swetrix CE installations.
// In theory, users should never hit this route because NGINX proxies all requests to the backend.
// However, if it's misconfigured, or they do hit it for some reason, we should throw an error.

const errorMessage =
  'Backend proxy is not configured. Ensure NGINX forwards /backend/* to the Swetrix API (swetrix-api) service.'

export async function action() {
	return data({ error: errorMessage }, { status: 418 })
}

export async function loader() {
  return data({ error: errorMessage }, { status: 418 })
}
