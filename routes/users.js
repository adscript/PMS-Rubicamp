var express = require('express');
var router = express.Router();
const pool = require('../util/connect');
const Auth = require('../middleware/auth');
const Users = require('../model/users');

/* =============================================== GET USERS LIST ========================================================================= */
router.get('/', Auth.isLoggedin, Auth.isAdmin, function(req, res, next) {
  let filterQuery = req.query.checkBox || [];
  let objType = [{'value': 'true', 'display': 'Fulltime'},{'value': 'false', 'display' : 'Parttime'}];
  let objRole = [{'value' : 'Software Developer' ,'display': 'Software Developer'}, {'value':'Manager', 'display' : 'Manager'}, {'value':'Quality Assurance', 'display':'Quality Assurance'}];
  let formFilter = [{ name: "ID", type: "number", value: req.query.ID, dbquery: "userid = $" },
                    { name: "Email", type: "text", value: req.query.Email, dbquery: "POSITION( $ IN email ) > 0" },
                    { name: "Name", type: "text", value: req.query.Name, dbquery: "POSITION( $ IN CONCAT(firstname,' ',lastname) ) > 0" },
                    { name: "Type", type: "select", select: objType, value: req.query.Type, dbquery: `isfulltime = $`, selectitem: ['value','display'] },
                    { name: "Role", type: "select", select: objRole, value: req.query.Role, dbquery: `generalrole = $`, selectitem: ['value','display'] }];
  let formOptions = ['ID', 'Email', 'Name', 'Type', 'Role'];
  let loggedInUser = req.session.user;
  let currentPage = Number(req.query.page) || 1;
  let limit = 3;
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
        url: req.url,
        messages: req.flash('berhasil')[0]
    });
  }).catch(err => console.log(err)) 
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

// ========================================= GET ADD USERS ==========================================================
router.get('/add', Auth.isLoggedin, Auth.isAdmin, (req,res) => {
  let loggedInUser = req.session.user;
  res.render('users/add', { 
    loggedInUser,
    currentURL : 'users',
    messages : req.flash('gagal')[0],
    query : req.body
  });
})

router.post('/add', Auth.isLoggedin, Auth.isAdmin, (req,res) => {
  let dataUser = Object.values(req.body);
  let loggedInUser = req.session.user;
  if(req.body.isfulltime)
    dataUser[5] = true;  
  else
    dataUser[5] = false;
  dataUser.push(false); //isAdmin ? default false;
  Users.checkUniqueEmail(pool, req.body.email).then((results) => {
    if(results.rows[0].count > 0){
      req.flash('gagal', `Email is already in use`);
      res.render('users/add', {
        loggedInUser,
        currentURL : 'users',
        messages : req.flash('gagal')[0],
        query : req.body
      });
    } else {
      Users.addUser(pool, dataUser).then(() => {
        Users.countUserData(pool).then((count) => {
          req.flash('berhasil', `User successfully added`);
          res.redirect(`/users?page=${Math.ceil(count.rows[0].count/3)}`);
        }).catch(err => console.log(err));
      }).catch(err => console.log(err));
    }
  }) 
})

// ============================================ DELETE USERS ==========================================
router.get('/delete/:userid', Auth.isLoggedin, Auth.isAdmin, (req,res) => {
  let userid = req.params.userid;
  let countData = Users.countUserData(pool, userid);
  let deleteUser = Users.deleteUser(pool, userid);
  Promise.all([countData, deleteUser]).then((results) => {
    let pages = Math.ceil(results[0].rows[0].count/3);
    let successMessage = results[1];
    req.flash('berhasil', successMessage);
    res.redirect(`/users?page=${pages}`);
  })
})

// =========================================== EDIT USERS =============================================
router.get('/edit/:userid', Auth.isLoggedin, Auth.isAdmin, (req,res) => {
  let userid = req.params.userid;
  let loggedInUser = req.session.user;
  Users.renderUserData(pool, userid).then((userData) => {
    let User = userData.rows[0];
    res.render(`users/edit`, {
      loggedInUser, User,
      messages : req.flash('gagal')[0],
      currentURL : 'users'
    })
  })
})

router.post('/edit/:userid', Auth.isLoggedin, Auth.isAdmin, (req,res) => {
  let userid = req.params.userid;
  let loggedInUser = req.session.user;
  let hasilForm = req.body;
  if(!hasilForm.password)
    delete hasilForm.password;
  if(!hasilForm.isfulltime)
    hasilForm.isfulltime = false;
  else
    hasilForm.isfulltime = true;
  Users.postUserData(pool, hasilForm, userid).then(() => {
    Users.countUserData(pool, userid).then((count)=>{
      let Page = Math.ceil(count.rows[0].count/3);
      req.flash('berhasil', `User Data Updated`);
      res.redirect(`/users?page=${Page}`);
    })
  })
})

module.exports = router;
