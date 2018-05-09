const { get } = require('server/router')
const { type } = require('server/reply')
const axios = require('axios')
const Feed = require('feed')
const episodeHtml = require('pug').compileFile('views/episode.pug')

const FEED_HOST = process.env.PROJECT_DOMAIN ? `https://${process.env.PROJECT_DOMAIN}.glitch.me` : 'http://localhost:3000'
const CHANNELS = require('../channels.json').data

module.exports = [
  get('/:feed/atom.xml', async ctx => {
    var site = CHANNELS.find(f => f.attributes.slug === ctx.params.feed)
    if (typeof site === 'undefined') return 404

    var feed = new Feed({
      title: site.attributes.name + ' Recent Videos',
      link: process.env.RT_HOST + '/channel/' + site.attributes.slug,
      generator: 'Rooster Feed'
    })

    await axios({
        method: 'get',
        url: process.env.RT_API + site.links.episodes,
        params: {
          per_page: 30
        }
      })
      .then(({ data }) => {
        data.data.forEach(e => {
          feed.addItem({
            title: e.attributes.title,
            id: e.id,
            link: process.env.RT_HOST + e.canonical_links.self,
            description: e.attributes.caption,
            content: episodeHtml({
              FEED_HOST,
              RT_HOST: process.env.RT_HOST,
              episode: e
            }),
            date: new Date(e.attributes.sponsor_golive_at),
            image: e.included.images[0].attributes.medium
          })
        })
      })

    return type('application/atom+xml').send(feed.atom1())
  })
]
