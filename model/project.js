module.exports = class Project {

    constructor(pool, formFilter = [], activeQuery = [], limit = 3) {
        this.pool = pool;
        this.formFilter = formFilter;
        this.activeQuery = activeQuery;
        this.joinQuery = `FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid)`;
        this.limit = limit;
    }

    static getAllMember(pool) {
        let sqlListMember = "SELECT userid, CONCAT(firstname, ' ', lastname) as fullname FROM users";
        return pool.query(sqlListMember);
    }

    getAllConstraint(user = {}) {
        const subQuery = `projects.projectid IN (SELECT projectid FROM members WHERE userid = $)`;
        const userFilter = `users.userid IN (SELECT userid FROM members WHERE )`;
        let count = 1;
        let activeFilter = [];
        let filterValue = [];
        if (!user.isadmin) {
            filterValue = [user.userid, user.userid];
            activeFilter = [userFilter.replace('WHERE', `WHERE ${subQuery.replace('$', `$${count++}`)}`), subQuery.replace('$', `$${count++}`)];
        } else if (this.formFilter[2].value && this.activeQuery.includes(this.activeQuery.name)) {
            this.formFilter[2].dbquery.replace('projectid IN (SELECT projectid FROM members WHERE userid = $)', userFilter.replace('WHERE', `WHERE ${subQuery.replace('$', `$${count++}`)}`))
        }
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

    getConstraintQuery() {
        if (this.activeFilter.length > 0) {
            this.sql += " WHERE " + this.activeFilter.join(" AND ");
        }
        return this;
    }

    getClosingQuery(offset) {
        this.sql += `GROUP BY projects.projectid ORDER BY projects.projectid ASC LIMIT ${this.limit} OFFSET ${offset};`;
        return this;
    }

    startQuery(arrConstraint = []) {
        return this.pool.query(this.sql, arrConstraint);
    }

    getNumofPage() {
        let sqlCountPage = `SELECT COUNT(DISTINCT projectid) ${this.joinQuery}`;
        this.sql = sqlCountPage;
        return this.getConstraintQuery().startQuery(this.filterValue);
    }

    getProjectMemberList(offset) {
        let sqlProjectList = `SELECT projects.projectid, projects.name, STRING_AGG(CONCAT(firstname, ' ', lastname), ', ') as fullname ${this.joinQuery}`;
        this.sql = sqlProjectList;
        return this.getConstraintQuery().getClosingQuery(offset).startQuery(this.filterValue);
    }

    static updateOptions(pool, options = []) {
        let sqlUpdateOptions = `UPDATE users SET projectopt = $1 WHERE userid = $2`;
        return pool.query(sqlUpdateOptions, options);
    }

    static addProject(pool, projectName) {
        let sqlAddProject = `INSERT INTO projects (name) VALUES ($1)`;
        return pool.query(sqlAddProject, [projectName]);
    }

    static addMember(pool, usersid = [], projectName) {
        return new Promise((resolve, reject) => {
            let sqlGetProjectID = `SELECT MAX(projectid) AS projectid FROM projects`;
            pool.query(sqlGetProjectID).then((projectid) => {
                let sqlAddMembers = `INSERT INTO members (projectid, userid) VALUES `;
                let userArray = [];
                usersid.forEach((userid) => {
                    userArray.push(`(${projectid.rows[0].projectid}, ${userid})`);
                })
                sqlAddMembers += userArray.join(', ');
                pool.query(sqlAddMembers).then(()=>{
                    resolve(`Project ${projectName} added successfully`);
                }).catch(err=>reject(err));
            }).catch(err => reject(err));
        });

    }
}