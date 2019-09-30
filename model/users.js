module.exports = class Users {
    constructor(pool, formFilter = [], activeQuery = [], limit = 3) {
        this.pool = pool;
        this.formFilter = formFilter;
        this.activeQuery = activeQuery;
        this.limit = limit;
    }

    getAllUsers() {
        this.sql = `SELECT userid, email, CONCAT(firstname,' ',lastname) as fullname, isfulltime, generalrole FROM users`;
        this.countTable = false;
        return this;
    }

    getAllConstraint() {
        let activeFilter = [];
        let filterValue = [];
        for (let item of this.formFilter) {
            if (item.value && this.activeQuery.includes(item.name)) {
                activeFilter.push(item.dbquery.replace('$', `$${activeFilter.length + 1}`));
                filterValue.push(item.value);
            }
        }
        this.activeFilter = activeFilter;
        this.filterValue = filterValue;
        return this;
    }

    getConstraintQuery(offset) {
        this.activeQuery = (this.activeFilter.length) ? ` WHERE ${this.activeFilter.join(' AND ')}` : "";
        this.sql += this.activeQuery;
        this.sql += (this.countTable) ? "" : ` ORDER BY userid LIMIT ${this.limit} OFFSET ${offset}`;
        return this.pool.query(this.sql, this.filterValue);
    }

    getNumofPage() {
        this.sql = `SELECT COUNT(DISTINCT userid) FROM users`;
        this.countTable = true;
        return this;
    }

    static updateOptions(pool, options = []) {
        let sqlUpdateOptions = `UPDATE users SET usersopt = $1 WHERE userid = $2`;
        return pool.query(sqlUpdateOptions, options);
    }

    // ======================================= ADD USER ===========================================
    static addUser(pool, dataUser) {
        let sqlAddUser = `INSERT INTO users (firstname, lastname, email, password, generalrole, isfulltime, isadmin) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        return pool.query(sqlAddUser, dataUser);
    }

    static checkUniqueEmail(pool, email){
        let sqlCheckEmail = `SELECT COUNT(userid) FROM users WHERE email = $1`;
        return pool.query(sqlCheckEmail, [email]);
    }

    static countUserData(pool, userid) {
        let sqlCountData = ``;
        if (userid)
            sqlCountData = `SELECT COUNT(*) FROM users WHERE userid <= ${userid}`;
        else
            sqlCountData = `SELECT COUNT(*) FROM users`;
        return pool.query(sqlCountData);
    }

    // ========================================= DELETE USER ===================================================
    static deleteUser(pool, userid) {
        return new Promise((resolve, reject) => {
            let sqlGetUserName = `SELECT CONCAT(firstname,' ',lastname) AS fullname FROM users WHERE userid = $1`;
            pool.query(sqlGetUserName, [userid]).then(userName => {
                let sqlDeleteUser = `DELETE FROM users WHERE userid = $1`;
                userName = userName.rows[0].fullname;
                pool.query(sqlDeleteUser, [userid]).then(() => {
                    resolve(`${userName} deleted successfully`);
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        })
    }

    // ======================================== EDIT USER =======================================================
    static renderUserData(pool, userid) {
        let sqlGetUserData = `SELECT firstname, lastname, email, generalrole, isfulltime FROM users WHERE userid = $1`;
        return pool.query(sqlGetUserData, [userid]);
    }

    static postUserData(pool, data, userid){
        let colNames = Object.keys(data);
        let values = Object.values(data);
        let sqlUpdateUser = `UPDATE users SET ${colNames.map((col, index) => col + ' = $' + Number(index + 1)).join(', ')} WHERE userid = $${colNames.length + 1}`;
        return pool.query(sqlUpdateUser, [...values, userid]);
    }
}   