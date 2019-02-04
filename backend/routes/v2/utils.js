const jwt = require('jsonwebtoken');
const sanitize = require('mongo-sanitize');
const passport = require('passport');

const attachToken = (account, res) => {
  const { hash, salt, ...sharables } = account._doc;
  const token = jwt.sign(sharables, res.app.locals.jwtOptions.secretOrKey);
  res.set({ 'Authorization': 'Bearer '+token });
  res.json(sharables);
}

const sanitization = (req, res, next) => {
  req.params = sanitize(req.params);
  req.body = sanitize(req.body);
  next();
}

function maybe(path, obj, other = undefined) {
  let p = typeof path === 'string' ? path.split('.') : path;
  return p.reduce((result, next) => result && result[next] !== 'undefined' ? result[next] : undefined, obj) || other;
}

const auth = passport.authenticate('jwt', { session: false });

module.exports = {
  attachToken,
  sanitization,
  auth,
  maybe
}
