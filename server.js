const server = require('server')
const { get } = server.router
const axios = require('axios')

const channels = [
  'Rooster Teeth',
  'Achievement Hunter',
  'The Know',
  'FunHaus'
]

const rt = axios.create({
  baseURL: 'http://roosterteeth.com/api/internal'
})

server([
  get('/', ctx => 404),
  get('/:channel.json', async ctx => {
    if (ctx.params.channel < 0 || ctx.params.channel > channels.length) return 404
    var feed = {
      version: 'https://jsonfeed.org/version/1',
      title: channels[ctx.params.channel],
      items: []
    }

    await rt.get('/episodes/recent', {
      params: {
        channel: ctx.params.channel,
        limit: 24
      }
    }).then(response => {
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
          'content_html': `<a target="_blank" href="${url}"><img src="${image}"></a><p>${e.attributes.description}</p>`
        })
      })
    })

    return feed
  })
])
