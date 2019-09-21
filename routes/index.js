var express = require('express');
var router = express.Router();
const checkAuth = require('../middleware/auth').isLoggedOut;

const projectsRouter = require('./projects');
router.use('/projects', projectsRouter);

/* GET home page. */
router.get('/', checkAuth, (req, res, next) => {
  res.render('index', { messages : req.flash('info')[0] });
});

router.post('/validate', (req, res, next) => {
  const {email, password} = req.body;
  console.log(req.body);
  
  if(email == 'admin@adnan.com' && password == '1234'){
    req.session.user = {email};
    res.redirect('/projects');
  }
  else{
    req.flash('info', 'Wrong email or password');
    res.redirect('/');
  }
});

router.get('/logout', (req, res, next) => {
  req.session.destroy(err => {
    res.redirect('/');
  });
});

module.exports = router;
