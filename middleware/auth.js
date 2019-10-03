module.exports = {
    isLoggedOut: (req, res, next) => {
        if (req.session.user)
            res.redirect('/projects');
        else
            next();
    },

    isLoggedin: (req, res, next) => {
        if (req.session.user)
            next();
        else{
            req.session.latestUrl = req.originalUrl;
            res.redirect('/');
        }
    },

    isAdmin: (req, res, next) => {
        if(req.session.user.isadmin)
            next();
        else
            res.redirect('/projects');
    }
}