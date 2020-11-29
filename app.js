const inject = require('seacreature/lib/inject')
const { parentPort } = require('worker_threads')

inject('pod', async ({ app, hub, log }) => {
  app.use(async (req, res, next) => {
    req.token = null
    const token = req.headers['x-access-token']
      || req.headers['authorization']
      || req.query.token
    if (token) req.token = token
    next()
  })

  if (parentPort)
    parentPort.on('message', async msg => {
      const { e, p } = JSON.parse(msg)
      await hub.emit(e, p)
    })
  app.get('/', inject.one('req.token'), (req, res) => {
    res.send('ok')
  })
})