const router = require('express').Router();
const passport = require('passport');

const Account = require('../../models/account');

const { attachToken } = require('./utils');

// username available
router.get('/username/available/:username', (req, res) => {
  const { username } = req.params;
  Account.findOne({ username }, ( _, r) => res.json({ available: !r }))
});

// email available
router.get('/email/available/:email', (req, res) => {
  const { email } = req.params;
  Account.findOne({ email }, ( _, r) => res.json({ available: !r }))
});

// register
router.post('/register', (req, res) => {
  const { email, username, name, password } = req.body;

  Account.register(
    new Account({ email, username, name, lvl: 'user' }),
    password,
    (error, account) => {
      if (error) return res.status(422).json({ error });
      attachToken(account, res);
    }
  );
});

// login
router.post('/login', passport.authenticate('local'), (req, res) => {
  attachToken(req.user, res);
});


// view user profile
router.get('/page/:user', (req, res) => {
  Account.findOne({ username: req.params.user }, (error, user) => {
    if (error) return res.json({ error });
    const { name, username, image } = user._doc;
    res.json({ name, username, image });
  });
})


// view personal page
router.get('/self', (req, res) => {

})

module.exports = router;
