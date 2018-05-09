const server = require('server')
const { error } = server.router
const { status } = server.reply

server({ security: { csrf: false } }, [
  require('./routes/index'),
  require('./routes/login'),
  require('./routes/watchlist'),
  require('./routes/feed'),
  error(ctx => status(500).send(ctx.error.message))
])
