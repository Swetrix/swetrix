import { types } from 'actions/auth/types'

const initialState = {
	redirectPath: null,
	authenticated: false,
	loading: true,
	user: null
}

export default (state = initialState, { type, payload }) => {
	switch (type) {

		default:
			return state
	}
}