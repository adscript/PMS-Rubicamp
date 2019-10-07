var express = require('express');
var router = express.Router();
const pool = require('../util/connect');
const isLoggedIn = require('../middleware/auth').isLoggedin;
const isAdmin = require('../middleware/auth').isAdmin;
const Project = require('../model/project');
var moment = require('moment');
const path = require('path');
moment().format();


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

// ================================ GET EDIT PROJECT ======================================= 
router.get('/edit/:projectid', isLoggedIn, (req, res) => {
  const projectid = req.params.projectid;
  let loggedInUser = req.session.user;
  let allMembers = Project.getAllMember(pool);
  let allProjectData = Project.dataProject(pool, projectid);
  Promise.all([allMembers, allProjectData]).then((results) => {
    const [membersRow, projectData] = results;
    let Members = membersRow.rows;
    let projectName = projectData.projectName;
    let projectMembers = projectData.userid;
    let membersID = projectMembers.map(user => {
      return user.userid;
    })
    res.render('projects/edit', {
      currentURL: 'projects',
      loggedInUser, Members, projectName, projectMembers, membersID,
      messages: req.flash('gagal')[0]
    })
  }).catch(err => console.log(err));
});

// =================================== POST EDIT PROJECT ROUTER ================================
router.post('/edit/:projectid', (req, res) => {
  const projectid = req.params.projectid;
  let message = [];
  let loggedInUser = req.session.user;
  (req.body.projectName) ? "" : message.push('Name');
  (req.body.checkBox) ? "" : message.push('Members');
  if (message.length > 0) {
    req.flash('gagal', `${message.join(' and ')} can't be empty`);
    res.redirect('/projects/edit');
  } else {
    let countPage = new Project(pool);
    let membersArr = (req.body.checkBox.length == 1) ? [req.body.checkBox] : req.body.checkBox;
    Project.updateProjectName(pool, projectid, req.body.projectName).then(() => {
      Project.updateProjectMembers(pool, projectid, membersArr, req.body.projectName).then(messages => {
        countPage.getNumofPage(projectid, loggedInUser).then((count) => {
          let limit = 3;
          req.flash('berhasil', messages);
          res.redirect(`/projects?page=${Math.ceil(count.rows[0].count / limit)}`);
        }).catch(err => console.log(err));
      }).catch(err => console.log(err));
    }).catch(err => console.log(err));
  }
})


// ================================= DELETE PROJECT ====================================
router.get('/delete/:projectid', isLoggedIn, isAdmin, (req, res) => {
  const { projectid } = req.params;
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
router.get('/overview:projectid', isLoggedIn, isAdmin, (req, res, next) => {
  let projectid = req.params.projectid;

  res.render('projects/overview/index', {
    currentURL: 'overview',
    loggedInUser: req.session.user
  });

});



// GET /projects/activity/:projectid

// =========================================== GET MEMBERS PAGE ====================================================
router.get('/members/:projectid', isLoggedIn, (req, res) => {
  let projectid = req.params.projectid;
  let filterQuery = req.query.checkBox || [];

  let objPosition = [{ 'value': 'Software Developer', 'display': 'Software Developer' }, { 'value': 'Manager', 'display': 'Manager' }, { 'value': 'Quality Assurance', 'display': 'Quality Assurance' }];
  let formFilter = [{ name: "ID", type: "number", value: req.query.ID, dbquery: "users.userid = $" },
  { name: "Name", type: "text", value: req.query.Name, dbquery: "POSITION( $ IN CONCAT(firstname,' ',lastname) ) > 0" },
  { name: "Position", type: "select", select: objPosition, value: req.query.Position, dbquery: `users.generalrole = $`, selectitem: ['value', 'display'] }];
  let formOptions = ['ID', 'Name', 'Position'];
  let loggedInUser = req.session.user;
  let currentPage = Number(req.query.page) || 1;
  let limit = 3;
  let offset = (currentPage - 1) * limit;
  let query = req.query;

  let countUser = Project.countUser(pool, formFilter, filterQuery, projectid);
  let memberList = Project.membersList(pool, formFilter, filterQuery, projectid, limit, offset);

  Promise.all([memberList, countUser]).then(results => {
    const [Members, totalMembers] = results.map(element => element.rows);
    const totalPage = Math.ceil(totalMembers[0].count / limit);
    res.render('projects/members', {
      formOptions, filterQuery, formFilter, loggedInUser, query, currentPage, Members, totalPage, projectid,
      currentURL: "members",
      optTable: "membersopt",
      url: req.url,
      messages: req.flash('berhasil')[0],
      addNotif: req.flash('failed')[0]
    })
  }).catch(err => console.log(err));
})

// ========================================== POST MEMBERS OVERVIEW OPTIONS ========================================================
router.post('/members/:projectid', (req, res) => {
  let projectid = req.params.projectid;
  let [checkedID, checkedName, checkedPosition] = [false, false, false];
  if (req.body.checkopt) {
    if (!(req.body.checkopt instanceof Array))
      req.body.checkopt = [req.body.checkopt];
    checkedID = (req.body.checkopt.includes('ID'));
    checkedName = (req.body.checkopt.includes('Name'));
    checkedPosition = (req.body.checkopt.includes('Position'));
  }
  let options = [JSON.stringify({ "ID": checkedID, "Name": checkedName, "Position": checkedPosition }), req.session.user.userid];
  //model -> project.js
  //save options setting for user
  Project.updateMembersOptions(pool, options).then(() => {
    req.session.user.membersopt = JSON.parse(options[0]);
    res.redirect(`/projects/members/${projectid}`);
  }).catch(err => console.log(err));
})

// ====================================== GET PROJECTS ADD MEMBERS IN OVERVIEW ==================================================
router.get('/members/:projectid/add', isLoggedIn, (req, res) => {
  let projectid = req.params.projectid;
  Project.userNotAssigned(pool, projectid).then(results => {
    let Users = results.rows;
    if (Users.length > 0) {
      res.render(`projects/members/add`, {
        currentURL: 'members',
        loggedInUser: req.session.user,
        projectid, Users,
        messages: req.flash('berhasil')[0]
      })
    } else {
      req.flash('failed', 'Cant Add More User, All Users assigned');
      res.redirect(`/projects/members/${projectid}`);
    }
  })
})

// POST /projects/members/:projectid/add
router.post('/members/:projectid/add', isLoggedIn, (req, res) => {
  let projectid = req.params.projectid;
  let userData = req.body;
  let limit = 3;
  Project.addUser(pool, userData, projectid).then(() => {
    Project.countMembersAssigned(pool, projectid).then((count) => {
      req.flash('berhasil', `User with id = ${userData.userid} added successfully`);
      res.redirect(`/projects/members/${projectid}?page=${Math.ceil(count.rows[0].count / limit)}`);
    })
  })
})

// GET /projects/members/:projectid/edit/:memberid
router.get('/members/:projectid/edit/:userid', isLoggedIn, (req, res) => {
  let { projectid, userid } = req.params;
  Project.renderMembers(pool, projectid, userid).then((result) => {
    let userData = result.rows[0];
    let loggedInUser = req.session.user;
    res.render('projects/members/edit', {
      userData, loggedInUser, projectid, userid,
      currentURL: 'members',
    });
  })
})


// POST /projects/members/:projectid/edit/:memberid
router.post('/members/:projectid/edit/:userid', isLoggedIn, (req, res) => {
  let { projectid, userid } = req.params;
  let { roleawal, role, memberid } = req.body;
  let limit = 3;
  Project.countBefore(pool, memberid, projectid).then(count => {
    let Page = Math.ceil(count.rows[0].count / limit);
    if (!role || role == roleawal) {
      req.flash('failed', `Position not changed`)
      res.redirect(`/projects/members/${projectid}?page=${Page}`)
    } else {
      Project.editMembers(pool, role, memberid).then(() => {
        req.flash('berhasil', `User position successfully changed from ${roleawal} to ${role}`)
        res.redirect(`/projects/members/${projectid}?page=${Page}`);
      })
    }
  })
})



// GET /projects/members/:projectid/delete/:memberid
router.get('/members/:projectid/delete/:memberid', isLoggedIn, (req, res) => {
  let { projectid, memberid } = req.params;
  let limit = 3;
  let Count = Project.countBefore(pool, memberid, projectid);
  let Deleted = Project.deleteMembers(pool, memberid);

  Promise.all([Count, Deleted]).then(results => {
    let Page = Math.ceil(results[0].rows[0].count / limit);
    req.flash('berhasil', `User Members Deleted Successfully`)
    res.redirect(`/projects/members/${projectid}?page=${Page}`);
  })

});

// GET ISSUES PAGE
router.get('/issues/:projectid', isLoggedIn, (req, res) => {
  let projectid = req.params.projectid;
  let filterQuery = req.query.checkBox || [];

  let objTracker = [{ 'value': 'Bug', 'display': 'Bug' }, { 'value': 'Feature', 'display': 'Feature' }, { 'value': 'Support', 'display': 'Support' }];
  let formFilter = [{ name: "ID", type: "number", value: req.query.ID, dbquery: "i1.issueid = $" },
  { name: "Subject", type: "text", value: req.query.Subject, dbquery: "POSITION( LOWER($) IN LOWER(i1.subject) ) > 0" },
  { name: "Tracker", type: "select", select: objTracker, value: req.query.Tracker, dbquery: `i1.tracker = $`, selectitem: ['value', 'display'] }];
  let formOptions = ['ID', 'Subject', 'Tracker', 'Description', 'Status', 'Priority', 'Assignee', 'Start Date', 'Due Date', 'Estimate Time', 'Done', 'Author'];
  let loggedInUser = req.session.user;
  let currentPage = Number(req.query.page) || 1;
  let limit = 3;
  let offset = (currentPage - 1) * limit;
  let query = req.query;

  let countIssues = Project.countIssues(pool, formFilter, filterQuery, projectid);
  let issuesList = Project.renderIssues(pool, formFilter, filterQuery, projectid, limit, offset);

  Promise.all([issuesList, countIssues]).then(results => {
    const [Issues, totalIssues] = results.map(element => element.rows);
    const totalPage = Math.ceil(totalIssues[0].count / limit);
    res.render('projects/issues', {
      formOptions, filterQuery, formFilter, loggedInUser, query, currentPage, Issues, totalPage, projectid, moment,
      currentURL: "issues",
      optTable: "issuesopt",
      url: req.url,
      messages: req.flash('berhasil')[0],
      addNotif: req.flash('failed')[0]
    })
  }).catch(err => console.log(err));
})


// =============================================== POST ISSUES FORM ================================================================
router.post('/issues/:projectid', isLoggedIn, (req, res) => {
  let projectid = req.params.projectid;
  let [checkedID, checkedSubject, checkedTracker, checkedDescription, checkedStatus, checkedPriority, checkedAssignee, checkedStartDate, checkedDueDate, checkedEstTime, checkedDone, checkedAuthor] = [false, false, false, false, false, false, false, false, false, false, false, false];
  if (req.body.checkopt) {
    if (!(req.body.checkopt instanceof Array))
      req.body.checkopt = [req.body.checkopt];
    checkedID = req.body.checkopt.includes('ID');
    checkedSubject = (req.body.checkopt.includes('Subject'));
    checkedTracker = (req.body.checkopt.includes('Tracker'));
    checkedDescription = (req.body.checkopt.includes('Description'));
    checkedStatus = (req.body.checkopt.includes('Status'));
    checkedPriority = (req.body.checkopt.includes('Priority'));
    checkedAssignee = (req.body.checkopt.includes('Assignee'));
    checkedStartDate = (req.body.checkopt.includes('Start Date'));
    checkedDueDate = (req.body.checkopt.includes('Due Date'));
    checkedEstTime = (req.body.checkopt.includes('Estimate Time'));
    checkedDone = (req.body.checkopt.includes('Done'));
    checkedAuthor = (req.body.checkopt.includes('Author'));
  }
  let options = [JSON.stringify({ "ID": checkedID, "Subject": checkedSubject, "Tracker": checkedTracker, "Description": checkedDescription, "Status": checkedStatus, "Priority": checkedPriority, "Assignee": checkedAssignee, "Start Date": checkedStartDate, "Due Date": checkedDueDate, "Estimate Time": checkedEstTime, "Done": checkedDone, "Author": checkedAuthor }), req.session.user.userid];
  //model -> project.js
  //save options setting for user
  Project.updateIssuesOptions(pool, options).then(() => {
    req.session.user.issuesopt = JSON.parse(options[0]);
    res.redirect(`/projects${req.body.lasturl}`);
  }).catch(err => console.log(err));
})

// ADD ISSUE
router.get('/issues/:projectid/add', isLoggedIn, (req, res) => {
  let projectid = req.params.projectid;
  let loggedInUser = req.session.user;
  let Users = Project.getAssigneeUser(pool, projectid);
  let Issues = Project.getParentIssue(pool, projectid);
  Promise.all([Users, Issues]).then(results => {
    res.render('projects/issues/add.ejs', {
      currentURL: "issues",
      loggedInUser, projectid,
      Users: results[0].rows,
      Issues: results[1].rows,
      messages: req.flash('berhasil')[0]
    })
  })
})

router.post('/issues/:projectid/add', isLoggedIn, (req, res) => {
  let projectid = req.params.projectid;
  let loggedInUser = req.session.user;
  let Data = { ...req.body, 'author': loggedInUser.userid, 'projectid': projectid };
  (Data.parenttask || Data.parenttask.length === 0) ? delete Data.parenttask : '';
  if (req.files) {
    let File = req.files.uploadFile;
    let nameUnique = moment().format('YYYY-MM-DD_HH-mm-ss-SSS');
    let fileName = `${nameUnique}-${File.name.split(' ').join('-')}`
    let uploadPath = path.join(__dirname, '..', 'public', 'uploads', fileName);
    Data = { ...Data, 'files': `/uploads/${fileName}`, 'filename': `${File.name}` };
    let addIssue = Project.addIssue(pool, Data);
    let count = Project.countAfterAddEdit(pool, projectid);
    Promise.all([addIssue, count]).then(results => {
      File.mv(uploadPath, (err) => {
        if (err) throw err;
        req.flash('berhasil', `File uploaded, Issue added successfully `);
        res.redirect(`/projects/issues/${projectid}?page=${Math.ceil(results[1].rows[0].count / 3)}`);
      })
    })
  } else {
    let addIssue = Project.addIssue(pool, Data);
    let count = Project.countAfterAddEdit(pool, projectid);
    Promise.all([addIssue, count]).then(results => {
      req.flash('berhasil', `Issue added successfully`);
      res.redirect(`/projects/issues/${projectid}?page=${Math.ceil(results[1].rows[0].count / 3)}`);
    })
  }
})

// EDIT ISSUE
router.get('/issues/:projectid/edit/:issueid', isLoggedIn, (req, res) => {
  let { projectid, issueid } = req.params;
  let loggedInUser = req.session.user;
  let getParentIssue = Project.getParentIssue(pool, projectid, issueid);
  let getAssigneeUser = Project.getAssigneeUser(pool, projectid);
  let renderIssueEdit = Project.renderIssuesEdit(pool, projectid, issueid);
  Promise.all([getParentIssue, getAssigneeUser, renderIssueEdit]).then(Results => {
    res.render('projects/issues/edit.ejs', {
      currentURL: "issues",
      loggedInUser, projectid, moment,
      Issue: Results[2].rows[0],
      Issues: Results[0].rows,
      Users: Results[1].rows,
      messages: req.flash('berhasil')[0]
    })
  }).catch(err => console.log(err));
})

// POST EDIT ISSUE
router.post('/issues/:projectid/edit/:issueid', isLoggedIn, (req, res) => {
  let { projectid, issueid } = req.params;
  let loggedInUser = req.session.user;

  let oldData = JSON.parse(req.body.oldData);
  let Data = req.body;
  delete Data.oldData;
  oldData.startdate = moment(oldData.startdate).format('YYYY-MM-DD');
  oldData.duedate = moment(oldData.duedate).format('YYYY-MM-DD');
  Data.startdate = moment(Data.startdate, 'MM/DD/YYYY').format('YYYY-MM-DD');
  Data.duedate = moment(Data.duedate, 'MM/DD/YYYY').format('YYYY-MM-DD');

  let changedFile = ((req.files) ? req.files.uploadFile.name : '');
  console.log(changedFile);
  if (req.files && changedFile != oldData.filename) {
    console.log('Beda');
    let File = req.files.uploadFile;
    let nameUnique = moment().format('YYYY-MM-DD_HH-mm-ss-SSS');
    let fileName = `${nameUnique}-${File.name.split(' ').join('-')}`
    let uploadPath = path.join(__dirname, '..', 'public', 'uploads', fileName);
    Data = { ...Data, 'files': `/uploads/${fileName}`, 'filename': `${File.name}` };
    let count = Project.countAfterAddEdit(pool, projectid, issueid, true);
    let editIssue = Project.updateIssues(pool, Data, issueid);

    Promise.all([count, editIssue]).then(results => {
      let changedData = Object.keys(Data).filter(key => {
        return (Data[key] != oldData[key] && Data[key] != '' && !['files', 'filename'].includes(key));
      }).join(', ');
      File.mv(uploadPath, (err) => {
        if (err) return err;
        Project.addActivity(pool, Data, oldData, projectid, loggedInUser.userid).then(() => {
          let notif = (changedData.length == 0) ? 'File changed and uploaded' : `${changedData} and File changed`
          req.flash('berhasil', `${notif}`);
          res.redirect(`/projects/issues/${projectid}?page=${Math.ceil(results[0].rows[0].count / 3)}`);
        })
      })
    }).catch(err => console.log(err));
  } else {
    let count = Project.countAfterAddEdit(pool, projectid, issueid, true);
    let editIssue = Project.updateIssues(pool, Data, issueid);
    Promise.all([count, editIssue]).then((results) => {
      let changedData = Object.keys(Data).filter(key => {
        return (Data[key] != oldData[key] && Data[key] != '');
      }).join(', ')
      if (changedData.length == 0) {
        changedData = 'Nothing';
        req.flash('berhasil', `${changedData} changed`);
        res.redirect(`/projects/issues/${projectid}?page=${Math.ceil(results[0].rows[0].count / 3)}`);
      }
      else if (changedData.length > 0) {
        Project.addActivity(pool, Data, oldData, projectid, loggedInUser.userid).then(() => {
          req.flash('berhasil', `${changedData} changed`);
          res.redirect(`/projects/issues/${projectid}?page=${Math.ceil(results[0].rows[0].count / 3)}`);
        });
      }
    }).catch(err => res.render('error', { message: err, error: err }));
  }
})

// DELETE ISSUE
router.get('/issues/:projectid/delete/:issueid', isLoggedIn, (req, res) => {
  let { projectid, issueid } = req.params;
  let loggedInUser = req.session.user;
  let count = Project.countAfterAddEdit(pool, projectid, issueid, true);
  let deleteIssue = Project.deleteIssue(pool, issueid);

  Promise.all([count, deleteIssue]).then(results => {
    req.flash('berhasil', `Issue #${issueid} deleted`);
    res.redirect(`/projects/issues/${projectid}?page=${Math.ceil(results[0].rows[0].count / 3)}`);
  })
})

router.get('/activity/:projectid', isLoggedIn, (req, res) => {
  let projectid = req.params.projectid;
  let loggedInUser = req.session.user;
  Project.viewActivity(pool, projectid).then(activityList => {
    if (activityList.rows.length > 0) {
      activityList = activityList.rows.map(value => {
        value.date = moment(value.date).format('YYYY-MM-DD');
        value.time = moment(value.time, 'HH:mm:ss.SSS').format('HH:mm:ss');
        return value;
      });

      let allDate = activityList.map(value => value.date);
      let uniqueDate = allDate.filter((value, index) => allDate.indexOf(value) == index);
      let activityData = uniqueDate.map(date => {
        return {
          date, data: activityList.filter((value) => value.date == date)
        }
      })
      activityData = activityData.map((value) => {
        if (value.date == moment().format('YYYY-MM-DD'))
          value.date = 'Today';
        else if (value.date == moment().subtract(1, 'days').format('YYYY-MM-DD'))
          value.date = 'Yesterday';
        return value;
      })

      res.render('projects/activity', {
        currentURL: "activity",
        loggedInUser, projectid, moment, activityData,
        messages: req.flash('berhasil')[0]
      })
    } else {
      req.flash('berhasil', `Belum ada activity tersedia, silahkan lakukan edit issue untuk menambahkan activity`);
      let activityData = [];
      res.render('projects/activity', {
        currentURL: "activity",
        loggedInUser, projectid, moment, activityData,
        messages: req.flash('berhasil')[0]
      })
    }
  })

})


module.exports = router;