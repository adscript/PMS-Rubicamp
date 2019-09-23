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
const pool = require('../util/connect');
const isLoggedIn = require('../middleware/auth').isLoggedin;
const Project = require('../model/project');

/* GET home page. */
router.get('/', isLoggedIn, function (req, res, next) {
  let filterQuery = req.query.checkBox || [];
  let formFilter = [{ name: "ID", type: "number", value: req.query.ID, dbquery: "projects.projectid = $" },
                    { name: "Name", type: "text", value: req.query.Name, dbquery: "POSITION( $ IN projects.name ) > 0" },
                    { name: "Member", type: "select", select: ["opt1", "opt2", "opt3"], value: req.query.Member, dbquery: `projectid IN (SELECT projectid FROM members WHERE userid = $)` }];                 
                    
  let currentPage = Number(req.query.page) || 1;                    
  let limit = 3;
  let offset = (currentPage - 1) * limit;
  let query = req.query;
  let loggedInUser = req.session.user;
  
  let projectModel = new Project(pool, formFilter, filterQuery, limit);
  const memberList = projectModel.getAllMember();
  const totalProject = projectModel.getAllConstraint(loggedInUser).getNumofPage();
  const projectMemberList = projectModel.getProjectMemberList(offset);
  
  Promise.all([memberList, projectMemberList, totalProject]).then(results => {
    const [members, projects, totalProject] = results.map(element => element.rows);
    const totalPage = Math.ceil(totalProject / limit);
    formFilter[2].select = members;
    console.log(projects[0].projectid);
    res.render('projects',
    {
      formOptions: ['ID', 'Name', 'Members'],
      filterQuery, formFilter, loggedInUser, query, currentPage, projects, totalPage,
      currentURL: "project",
    }
  );
  }).catch(err => console.log(err));
});

router.get('/overview', (req, res, next) => {
  res.render('projects/overview');
});

router.get('/add', (req, res, next) => {
  res.render('projects/add');
});

module.exports = router;