const inject = require('seacreature/lib/inject')

inject('pod', ({ log }) => {
  inject('req.guard', fn => async (req, res, next) => {
    try {
      await fn(req, res, next)
    }
    catch (e) {
      log.error(e)
      res.status(500).send({
        error: true,
        message: 'An error occured. If this continues to happen please contact support.'
      })
    }
  })
})