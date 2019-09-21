var express = require('express');
var router = express.Router();
const checkAuth = require('../middleware/auth').isLoggedOut;
const pool = require('../util/connect');

const projectsRouter = require('./projects');
router.use('/projects', projectsRouter);

/* GET home page. */
router.get('/', checkAuth, (req, res, next) => {
  res.render('index', { messages: req.flash('info')[0] });
});

// Validate After Submit Login Form
router.post('/validate', (req, res, next) => {
  const { email, password } = req.body;
  sql = "SELECT * FROM users WHERE email = $1 AND password = $2";
  pool.query(sql, [email, password]).then((queryResult) => {

    if (queryResult.rows[0]) { // Jika user terdaftar
      // Get all user data from db except password
      const userData = queryResult.rows[0];
      delete userData.password;
      req.session.user = userData;
      res.redirect('/projects');
    } else {
      req.flash('info', 'Wrong email or password');
      res.redirect('/');
    }
  });
});

router.get('/logout', (req, res, next) => {
  req.session.destroy(err => {
    res.redirect('/');
  });
});

module.exports = router;
