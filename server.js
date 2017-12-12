const server = require('server')
const { get } = server.router
const { render } = server.reply
const axios = require('axios')
const pug = require('pug')

const URL = process.env.PROJECT_DOMAIN ? `https://${process.env.PROJECT_DOMAIN}.glitch.me` : 'http://localhost:3000'

const FEEDS = [
  { id: 0, name: 'roosterteeth', title: 'Rooster Teeth' },
  { id: 1, name: 'achievementhunter', title: 'Achievement Hunter' },
  { id: 2, name: 'theknow', title: 'The Know' },
  { id: 3, name: 'funhaus', title: 'Funhaus' },
  { id: 5, name: 'screwattack', title: 'Screw Attack' },
  { id: 6, name: 'cowchop', title: 'Cow Chop' },
  { id: 8, name: 'gameattack', title: 'Game Attack' },
  { id: 9, name: 'sugarpine7', title: 'Sugar Pine 7' }
]

const episodeHtml = pug.compileFile('views/episode.pug')

function getRecentEpisodes (id) {
  return axios({
    method: 'get',
    baseURL: 'http://roosterteeth.com/api/internal/episodes/recent',
    params: {
      channel: id,
      limit: 24
    }
  })
}

function addToQueue (episode, token) {
  return axios({
    method: 'post',
    baseURL: 'https://www.roosterteeth.com/api/v1/episodes',
    url: episode + '/add-to-queue',
    headers: {
      'Authorization': token,
      'User-Agent': 'Rooster Teeth/com.roosterteeth.roosterteeth (11; OS Version 9.3.2 (Build 13F69))'
    }
  })
}

const feedMiddleware = async ctx => {
  var site = FEEDS.find(f => f.name === ctx.params.feed)
  if (typeof site === 'undefined') return 404

  var feed = {
    version: 'https://jsonfeed.org/version/1',
    title: site.name,
    items: []
  }

  await getRecentEpisodes(site.id).then(response => {
    feed['home_page_url'] = 'https://' + response.data.data[0].attributes.channelUrl

    response.data.data.forEach(e => {
      var url = 'https://' + e.attributes.channelUrl + '/episode/' + e.attributes.slug
      var image = 'http:' + e.attributes.image

      feed.items.push({
        id: e.id,
        url: url,
        'date_published': e.attributes.releaseDate,
        title: e.attributes.title,
        image: image,
        summary: e.attributes.caption,
        'content_text': e.attributes.description,
        'content_html': episodeHtml({
          url: url,
          image: image,
          description: e.attributes.description,
          queueUrl: ctx.query.token ? `${URL}/queue?episode=${e.id}&token=${ctx.query.token}` : null
        })
      })
    })
  })

  return feed
}

const queueMiddleware = async ctx => {
  if (!(ctx.query.episode && ctx.query.token)) return 400
  return addToQueue(ctx.query.episode, ctx.query.token)
    .then(response => response.data.success ? 'Episode added to queue.' : response.data)
    .catch(error => error.response ? error.response.data.error : error.message)
}

server([
  get('/', ctx => render('index.pug', { feeds: FEEDS, token: ctx.query.token })),
  get('/:feed.json', feedMiddleware),
  get('/queue', queueMiddleware)
])
