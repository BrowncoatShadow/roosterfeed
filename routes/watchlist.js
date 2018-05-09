const { get } = require('server/router')
const { cookie, redirect, send } = require('server/reply')
const axios = require('axios')

axios.interceptors.response.use(response => {
  return response
}, error => {
  var originalRequest = error.config
  console.log(originalRequest.data.grant_type)

  if (error.response.status === 401
      && !originalRequest._retry
      && !originalRequest.data.grant_type === "refresh_token" ) {
    originalRequest._retry = true

    return axios({
        method: 'post',
        url: process.env.RT_TOKEN_API,
        data: {
          client_id: process.env.CLIENT_ID,
          refresh_token: originalRequest._refreshToken,
          grant_type: "refresh_token"
        }
      })
      .then(({data}) => {
        originalRequest._newTokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token
        }
        originalRequest.headers['Authorization'] = 'Bearer ' + data.access_token
        return axios(originalRequest)
      })
  }

  return Promise.reject(error)
})

module.exports = [
  get('/watchlist', async ctx => {
    if (!(ctx.query.add)) return 400
    if (!(ctx.cookies.rt_access_token)) return redirect('/login?watchlist=' + ctx.query.add)

    var response = await axios({
        method: 'put',
        url: process.env.RT_WATCHLIST_API,
        params: {
          item_uuid: ctx.query.add,
          item_type: 'episode'
        },
        headers: {
          'Authorization': 'Bearer ' + ctx.cookies.rt_access_token
        },
        _refreshToken: ctx.cookies.rt_refresh_token
      })
      .then(response => response)
      .catch(error => 'redirect')

    if (response === 'redirect') return redirect('/login?watchlist=' + ctx.query.add)

    if (response.config._newTokens) {
      return cookie('rt_access_token', response.config._newTokens.accessToken)
        .cookie('rt_refresh_token', response.config._newTokens.refreshToken)
        .redirect(process.env.RT_WATCHLIST)
    }

    return redirect(process.env.RT_WATCHLIST)
  })
]
