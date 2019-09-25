var express = require('express');
var router = express.Router();
const pool = require('../util/connect');
const isLoggedIn = require('../middleware/auth').isLoggedin;
const Profile = require('../model/profile');

// GET profile page
router.get('/', isLoggedIn, function (req, res) {
  let loggedInUser = req.session.user;
  res.render('profile', {
    currentURL: 'profile',
    loggedInUser,
    messages: req.flash('updateprofile')[0],
  });
});

// POST profile page
router.post('/', isLoggedIn, (req, res) => {
  let formHasil = req.body;
  let loggedInUser = req.session.user;
  let changedText = ['First Name', 'Last Name', 'Password', 'Position', 'Type'];
  let formComponent = ['firstname', 'lastname', 'password', 'generalrole'];
  let queryComponent = ['firstname = $', 'lastname = $', 'password = $', 'generalrole = $', 'isfulltime = $']
  let activeValue = [];
  let activeQuery = [];
  let Component = [];
  let changed = [];
  let counter = 1;
  formComponent.forEach((item, index) => {
    let keyUpdated = Object.keys(formHasil)[index];
    if (formComponent.includes(`${keyUpdated}`) && formHasil[`${keyUpdated}`] && loggedInUser[`${keyUpdated}`] != formHasil[`${keyUpdated}`]) {
      changed.push(changedText[index]);
      Component.push(keyUpdated);
      activeValue.push(formHasil[`${item}`]);
      activeQuery.push(queryComponent[index].replace('$', `$${counter++}`));
    }
  });
  formHasil.isfulltime = (formHasil.isfulltime == 'on') ? true : false;
  if (loggedInUser.isfulltime != formHasil.isfulltime) {
    changed.push(changedText[counter + 3]);
    activeValue.push(formHasil.isfulltime);
    activeQuery.push(queryComponent[counter + 3].replace('$', `$${counter++}`));
  }

  if (counter > 1) {
    activeValue.push(loggedInUser.userid);
    Profile.updateProfile(pool, activeQuery, activeValue, counter).then(() => {
      req.flash('updateprofile', `${changed.join(', ')} Updated`);
      activeValue.forEach((key,index) => {
        req.session.user[Component[index]] = key; 
      })
      res.redirect('/profile');
    })
  } else {
    req.flash('updateprofile', `Nothing updated`);
    res.redirect('/profile');
  }
})

module.exports = router;
