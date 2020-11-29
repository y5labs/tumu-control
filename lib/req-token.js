const inject = require('seacreature/lib/inject')

inject('pod', ({ log }) => {
  inject('req.token', (req, res, next) => {
    if (!req.token || req.token != process.env.ACCESS_TOKEN)
      return res.status(401).send({ message: 'Token is invalid' })
    next()
  })
})