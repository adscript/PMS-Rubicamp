var express = require('express');
var router = express.Router();
const pool = require('../util/connect');
const isLoggedIn = require('../middleware/auth').isLoggedin;
const isAdmin = require('../middleware/auth').isAdmin;
const Project = require('../model/project');

// ==================================== LOAD PROJECT PAGE ===============================================================================
router.get('/', isLoggedIn, function (req, res) {
  let filterQuery = req.query.checkBox || [];

  let formFilter = [{ name: "ID", type: "number", value: req.query.ID, dbquery: "projects.projectid = $" },
  { name: "Name", type: "text", value: req.query.Name, dbquery: "POSITION( $ IN projects.name ) > 0" },
  { name: "Member", type: "select", select: ["opt1", "opt2", "opt3"], value: req.query.Member, dbquery: `projectid IN (SELECT projectid FROM members WHERE userid = $)`, selectitem: ['userid', 'fullname'] }];

  let currentPage = Number(req.query.page) || 1;
  let limit = 3;
  let offset = (currentPage - 1) * limit;
  let query = req.query;
  let loggedInUser = req.session.user;

  let projectModel = new Project(pool, formFilter, filterQuery, limit);
  const memberList = Project.getAllMember(pool);
  const totalProject = projectModel.getAllConstraint(loggedInUser).getNumofPage();
  const projectMemberList = projectModel.getProjectMemberList(offset);

  Promise.all([memberList, projectMemberList, totalProject]).then(results => {
    const [members, projects, totalProject] = results.map(element => element.rows);
    const totalPage = Math.ceil(totalProject[0].count / limit);
    formFilter[2].select = members;
    res.render('projects',
      {
        formOptions: ['ID', 'Name', 'Members'],
        filterQuery, formFilter, loggedInUser, query, currentPage, projects, totalPage,
        currentURL: "projects",
        optTable: "projectopt",
        url: req.url,
        messages: req.flash('berhasil')[0]
      }
    );
  }).catch(err => console.log(err));
});

// ========================================== APPLY OPTIONS ======================================================
router.post('/', (req, res) => {
  let [checkedID, checkedName, checkedMembers] = [false, false, false];
  if (req.body.checkopt) {
    if (!(req.body.checkopt instanceof Array))
      req.body.checkopt = [req.body.checkopt];
    checkedID = (req.body.checkopt.includes('ID'))
    checkedName = (req.body.checkopt.includes('Name'))
    checkedMembers = (req.body.checkopt.includes('Members'))
  }
  let options = [JSON.stringify({ "ID": checkedID, "Name": checkedName, "Members": checkedMembers }), req.session.user.userid];

  //model -> project.js
  //save options setting for user
  Project.updateOptions(pool, options).then(() => {
    req.session.user.projectopt = JSON.parse(options[0]);
    res.redirect('projects');
  }).catch(err => console.log(err));
})

// ============================== LOAD ADD PROJECT ==================================
router.get('/add', isLoggedIn, isAdmin, (req, res) => {
  Project.getAllMember(pool).then((memberList) => {
    res.render('projects/add', {
      loggedInUser: req.session.user,
      currentURL: 'projects',
      Members: memberList.rows,
      messages: req.flash('gagal')[0]
    });
  }).catch(err => console.log(err));
});

// =============================== POST ADD PROJECT ===================================
router.post('/add', (req, res) => {
  let message = [];

  (req.body.projectName) ? "" : message.push('Name');
  (req.body.checkBox) ? "" : message.push('Members');
  if (message.length > 0) {
    req.flash('gagal', `${message.join(' and ')} can't be empty`);
    res.redirect('/projects/add');
  } else {
    let countPage = new Project(pool);
    let usersid = (req.body.checkBox.length == 1) ? [req.body.checkBox] : req.body.checkBox;
    Project.addProject(pool, req.body.projectName).then(() => {
      Project.addMember(pool, usersid, req.body.projectName).then((messages) => {
        countPage.getNumofPage().then((count) => {
          let limit = 3;
          req.flash('berhasil', messages);
          res.redirect(`/projects?page=${Math.ceil(count.rows[0].count / limit)}`);
        }).catch(err => console.log(err));
      }).catch(err => console.log(err));
    }).catch(err => console.log(err));
  }
});

// GET /projects/edit/:projectid
// POST /projects/edit/:projectid

// ================================= DELETE PROJECT ====================================
router.get('/delete/:projectid', isLoggedIn, isAdmin, (req, res) => {
  const {projectid} = req.params;
  let countPage = new Project(pool);
  countPage.getNumofPage(projectid).then((count) => {
    Project.deleteProject(pool, projectid).then((messages) => {
      let limit = 3;
      req.flash('berhasil', messages);
      res.redirect(`/projects?page=${Math.ceil(count.rows[0].count / limit)}`);
    }).catch(err => console.log(err));
  }).catch(err => console.log(err));
});



// GET /projects/overview/:projectid

// GET /projects/activity/:projectid

// GET /projects/members/:projectid
// GET /projects/members/:projectid/add
// POST /projects/members/:projectid/add
// GET /projects/members/:projectid/edit/:memberid
// POST /projects/members/:projectid/edit/:memberid
// GET /projects/members/:projectid/delete/:memberid

router.get('/overview', (req, res, next) => {
  res.render('projects/overview');
});

module.exports = router;