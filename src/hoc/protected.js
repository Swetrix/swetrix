import { connectedRouterRedirect } from 'redux-auth-wrapper/history4/redirect'
import routes from 'routes'

export const isAuthenticated = connectedRouterRedirect({
	redirectPath: routes.signin,
	authenticatedSelector: state => state.auth.authenticated,
	wrapperDisplayName: 'userIsAuthenticated',
	allowRedirectBack: false
})

export const notAuthenticated = connectedRouterRedirect({
	redirectPath: (state) => {
		const path = state.auth.redirectPath
		return path || routes.dashboard
	},

	authenticatedSelector: state => !state.auth.authenticated,
	wrapperDisplayName: 'userIsNotAuthenticated',
	allowRedirectBack: false
})
