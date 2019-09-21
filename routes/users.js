var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  let formFilter = ['ID', 'Email', 'Name'];
  let formOptions = [...formFilter, 'Type', 'Role'];
  res.render('users', {
      formFilter,
      formOptions,
      formTypes : ['number', 'email', 'text']
  });
});

module.exports = router;
