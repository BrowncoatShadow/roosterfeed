const server = require('server')
const { get } = server.router
const { render } = server.reply
const axios = require('axios')
const episodeHtml = require('pug').compileFile('views/episode.pug')

const URL = process.env.PROJECT_DOMAIN ? `https://${process.env.PROJECT_DOMAIN}.glitch.me` : 'http://localhost:3000'
const SITE_URL = 'https://roosterteeth.com'
const API_URL = 'https://svod-be.roosterteeth.com'

var CHANNELS
axios.get(API_URL + '/api/v1/channels')
  .then(response => {
    CHANNELS = response.data.data
  })

function addToQueue (uuid, token) {
  return axios({
    method: 'post',
    baseURL: 'https://lists.roosterteeth.com/api/v1/watchlist/add',
    params: {
      item_uuid: uuid,
      item_type: 'episode'
    },
    headers: {
      'Authorization': 'Bearer ' + token,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'
    }
  })
}

const feedMiddleware = async ctx => {
  var site = CHANNELS.find(f => f.attributes.slug === ctx.params.feed)
  if (typeof site === 'undefined') return 404

  var feed = {
    version: 'https://jsonfeed.org/version/1',
    title: site.attributes.name,
    home_page_url: SITE_URL + '/channel/' + site.attributes.slug,
    feed_url: URL + '/' + site.attributes.slug + '.json',
    items: []
  }

  await axios({
    method: 'get',
    baseURL: API_URL + site.links.episodes,
    params: {
      per_page: 30
    }
  })
  .then(response => {
    response.data.data.forEach(e => {
      feed.items.push({
        id: e.id,
        url: SITE_URL + e.canonical_links.self,
        'date_published': e.attributes.sponsor_golive_at,
        title: e.attributes.title,
        image: e.included.images[0].attributes.large,
        summary: e.attributes.caption,
        'content_text': e.attributes.description,
        'content_html': episodeHtml({
          url: SITE_URL + e.canonical_links.self,
          image: e.included.images[0].attributes.large,
          description: e.attributes.description,
          queueUrl: ctx.query.token ? `${URL}/queue?uuid=${e.uuid}&token=${ctx.query.token}` : null
        })
      })
    })
  })

  return feed
}

const queueMiddleware = async ctx => {
  if (!(ctx.query.uuid && ctx.query.token)) return 400
  return addToQueue(ctx.query.uuid, ctx.query.token)
    .then(response => response.data.success ? 'Episode added to queue.' : response.data)
    .catch(error => error.response ? error.response.data.error : error.message)
}

server([
  get('/', ctx => render('index.pug', { baseUrl: URL, feeds: CHANNELS, token: ctx.query.token })),
  get('/:feed.json', feedMiddleware),
  get('/queue', queueMiddleware)
])
