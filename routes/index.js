const { get } = require('server/router')
const { render } = require('server/reply')

const CHANNELS = require('../channels.json').data

module.exports = [
  get('/', ctx => render('index.pug',
    {
      feeds: CHANNELS,
      loggedIn: (ctx.cookies.rt_access_token)
    }
  ))
]
