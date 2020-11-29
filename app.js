const inject = require('seacreature/lib/inject')
const { parentPort } = require('worker_threads')

const history_lines = process.env.HISTORY_LINES
  ? Number(process.env.HISTORY_LINES)
  : 10

inject('pod', async ({ app, hub, log, startup }) => {
  const worker_logs = new Map()
  const worker_state = new Map()

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
      if (!worker_logs.has(req.query.app)) return res.send([])
      return res.send(worker_logs.get(req.query.app))
    }
    res.send(Array.from(worker_logs.entries()))
  })

  app.get('/state', inject.one('req.token'), (req, res) => {
    if (req.query.app) {
      if (!worker_state.has(req.query.app)) return res.status(400).send('Unknown app')
      return res.send(worker_state.get(req.query.app))
    }
    res.send(Array.from(worker_state.entries()).reduce((res, [app, state]) => {
      res[app] = state
      return res
    }, {}))
  })

  ;(async () => {
    await startup.released()
    parentPort.postMessage(JSON.stringify({ e: 'subscribe_stdout'}))
    parentPort.postMessage(JSON.stringify({ e: 'subscribe_stderr'}))
    parentPort.postMessage(JSON.stringify({ e: 'subscribe_state'}))
  })()

  const add = (level, spec, data) => {
    if (data.length > 0 && data[0] == '{') data = JSON.parse(data)
    if (!worker_logs.has(spec.name)) worker_logs.set(spec.name, [])
    const lines = worker_logs.get(spec.name)
    lines.push({
      level,
      ts: new Date().getTime() / 1000,
      data
    })
    if (lines.length > history_lines)
      worker_logs.set(spec.name, lines.slice(-history_lines))
  }

  hub.on('worker.stdout', ({ spec, data }) => add('info', spec, data))
  hub.on('worker.stderr', ({ spec, data }) => add('error', spec, data))
  hub.on('worker.state', ({ spec, state }) => worker_state.set(spec.name, state))
})