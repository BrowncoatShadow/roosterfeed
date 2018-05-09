const { get, post } = require('server/router')
const { render, cookie, redirect } = require('server/reply')
const axios = require('axios')

module.exports = [
  get('/login', ctx => render('login', { watchlist: ctx.query.watchlist })),

  post('/login', async ctx => {
    var tokens = await axios({
        method: 'post',
        url: process.env.RT_TOKEN_API,
        data: {
          client_id: process.env.CLIENT_ID,
          grant_type: 'password',
          scope: 'user public',
          username: ctx.data.username,
          password: ctx.data.password
        }
      })
      .then(({ data }) => data)

    var response = cookie('rt_access_token', tokens.access_token)
      .cookie('rt_refresh_token', tokens.refresh_token)

    if (ctx.data.watchlist) {
      return response.redirect('/watchlist?add=' + ctx.data.watchlist)
    }

    return response.redirect('/')
  }),

  get('/logout', ctx => cookie('rt_access_token', '', { maxAge: 0 })
    .cookie('rt_refresh_token', '', { maxAge: 0 })
    .redirect('/'))
]
