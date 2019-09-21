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
        else
            res.redirect('/');
    }
}