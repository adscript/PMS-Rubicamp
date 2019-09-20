// Members, Issue, Activity dan Overview Disini 

//STRUKTUR
// '/' 
// '/ADD' GET DAN POST
// '/edit/:projectid' GET DAN POST
// '/delete/:projectid' Get

//OVERVIEW
// GET '/overview/:projectid' tampilan saja

//ACTIVITY
// GET '/activity/:projectid'

//MEMBER
// GET '/members/:projectid'
// GET '/members/:projectid/add'
// GET '/members/:projectid/edit/:userid'

//SELECT userid, CONCAT(firstname, ' ', lastname) FROM users => QUERY member difilter

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('projects');
});

module.exports = router;
