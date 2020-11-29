const inject = require('seacreature/lib/inject')
const { parentPort } = require('worker_threads')

const history_lines = process.env.HISTORY_LINES
  ? Number(process.env.HISTORY_LINES)
  : 10

inject('pod', async ({ app, hub, log, startup }) => {
  const logs = new Map()

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

  app.get('/logs', inject.one('req.token'), (req, res) => {
    if (req.query.app) {
      if (!logs.has(req.query.app)) return res.send([])
      return res.send(logs.get(req.query.app))
    }
    res.send(Array.from(logs.entries()))
  })

  ;(async () => {
    await startup.released()
    parentPort.postMessage(JSON.stringify({ e: 'subscribe_stdout'}))
    parentPort.postMessage(JSON.stringify({ e: 'subscribe_stderr'}))
  })()

  const add = (level, spec, data) => {
    if (data.length > 0 && data[0] == '{') data = JSON.parse(data)
    if (!logs.has(spec.name)) logs.set(spec.name, [])
    const lines = logs.get(spec.name)
    lines.push({
      level,
      ts: new Date().getTime() / 1000,
      data
    })
    if (lines.length > history_lines)
      logs.set(spec.name, lines.slice(-history_lines))
  }

  hub.on('worker.stdout', ({ spec, data }) => add('info', spec, data))
  hub.on('worker.stderr', ({ spec, data }) => add('error', spec, data))
})