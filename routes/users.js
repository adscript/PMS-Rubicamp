var express = require('express');
var router = express.Router();
const pool = require('../util/connect');
const Auth = require('../middleware/auth');
const Users = require('../model/users');

/* =============================================== GET users listing. ========================================================================= */
router.get('/', Auth.isLoggedin, Auth.isAdmin, function(req, res, next) {
  let filterQuery = req.query.checkBox || [];
  let objType = [{'value': true, 'display': 'Fulltime'},{'value': false, 'display' : 'Parttime'}];
  let objRole = [{'value' : 'Programmer' ,'display': 'Programmer'}, {'value':'Manager', 'display' : 'Manager'}, {'value':'Quality Assurance', 'display':'Quality Assurance'}];
  let formFilter = [{ name: "ID", type: "number", value: req.query.ID, dbquery: "userid = $" },
                    { name: "Email", type: "text", value: req.query.Email, dbquery: "POSITION( $ IN email ) > 0" },
                    { name: "Name", type: "text", value: req.query.Name, dbquery: "POSITION( $ IN CONCAT(firstname,' ',lastname) ) > 0" },
                    { name: "Type", type: "select", select: objType, value: req.query.Type, dbquery: `isfulltime = $`, selectitem: ['value','display'] },
                    { name: "Role", type: "select", select: objRole, value: req.query.Role, dbquery: `generalrole = $`, selectitem: ['value','display'] }];

  let formOptions = ['ID', 'Email', 'Name', 'Type', 'Role'];
  let loggedInUser = req.session.user;
  let currentPage = Number(req.query.page) || 1;
  let limit = 2;
  let offset = (currentPage - 1) * limit;
  let query = req.query;

  let usersModel = new Users(pool, formFilter, filterQuery, limit);
  let totalUsers = usersModel.getNumofPage().getAllConstraint().getConstraintQuery(offset);
  let usersList = usersModel.getAllUsers().getConstraintQuery(offset);
  
  Promise.all([usersList, totalUsers]).then((results) => {
      const [users, totalUsers] = results.map(element => element.rows);
      const totalPage = Math.ceil(totalUsers[0].count / limit);
      res.render('users', {
        formFilter, formOptions, loggedInUser, filterQuery, totalPage, currentPage, query, users,
        formTypes : ['number', 'email', 'text'],
        optTable: "usersopt",
        currentURL : 'users',
        url: req.url
    });
  }) 
});

// ========================================= POST APPLY OPTIONS ====================================================
router.post('/', (req, res) => {
  let [checkedID, checkedEmail, checkedName, checkedType, checkedRole] = [false, false, false, false, false];
  if (req.body.checkopt){
    if (!(req.body.checkopt instanceof Array))
      req.body.checkopt = [req.body.checkopt];
      checkedID = (req.body.checkopt.includes('ID'));
      checkedEmail = (req.body.checkopt.includes('Email'));
      checkedName = (req.body.checkopt.includes('Name'));
      checkedType = (req.body.checkopt.includes('Type'));
      checkedRole = (req.body.checkopt.includes('Role'));
  }
  let options = [JSON.stringify({ "ID": checkedID, "Email": checkedEmail, "Name": checkedName, "Type": checkedType, "Role" : checkedRole}), req.session.user.userid];
  
  //model -> project.js
  //save options setting for user
  Users.updateOptions(pool, options).then(() => {
      req.session.user.usersopt = JSON.parse(options[0]);
      res.redirect('users');
  }).catch(err => console.log(err));
})



module.exports = router;
