const inject = require('seacreature/lib/inject')
const express = require('express')
const compression = require('compression')
const bodyParser = require('body-parser')
const cors = require('cors')
const mutunga = require('http-mutunga')
const pjson = require('../package.json')

inject('ctx', async () => {
  const app = express()
  const httpServer = mutunga(app)
  httpServer.setTimeout(5 * 60 * 1000)

  app.options('*', cors({ origin: true }))
  app.use(cors({ origin: true }))
  app.use(compression())
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
  app.use(bodyParser.json({ limit: '50mb' }))
  app.set('json spaces', 2)
  app.enable('trust proxy')

  return { app, httpServer }
})

inject('pod', async ({ httpServer, app, hub, startup }) => {
  const release = startup.retain()
  const port = process.env.PORT || 8081
  httpServer.listen(port, async () => {
    // json 404
    app.use((req, res) => res.status(404).send({ message: 'Not Found' }))
    release()
    const { address, port } = httpServer.address()
    hub.on('shutdown', () => httpServer.terminate())
    console.log(`${pjson.name}@${pjson.version} ${address}:${port}`)
  })
})