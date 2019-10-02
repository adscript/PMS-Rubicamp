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
        if (this.activeFilter != undefined) {
            if (this.activeFilter.length > 0) {
                this.sql += " WHERE " + this.activeFilter.join(" AND ");
            }
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

    getNumofPage(projectid, loginUser) {
        let sqlCountPage = `SELECT COUNT(DISTINCT projectid) ${this.joinQuery}`;
        this.sql = sqlCountPage;
        if (projectid) {
            let arrData = [projectid]
            this.sql += ` WHERE members.projectid <= $1`;
            if(!loginUser.isadmin){
                this.sql += ` AND users.userid IN (SELECT userid FROM members WHERE projects.projectid IN (SELECT projectid FROM members WHERE userid = $2) )`;
                arrData.push(loginUser.userid);
            }
            return this.pool.query(this.sql,arrData);
        }
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

    // ================================= ADD NEW PROJECT ===================================
    // SAVE PROJECT NAME
    static addProject(pool, projectName) {
        let sqlAddProject = `INSERT INTO projects (name) VALUES ($1)`;
        return pool.query(sqlAddProject, [projectName]);
    }
    // SAVE PROJECT MEMBER
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
                pool.query(sqlAddMembers).then(() => {
                    resolve(`Project ${projectName} added successfully`);
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        });
    }

    // ====================================== DELETE PROJECT ========================================
    static deleteProject(pool, projectid) {
        return new Promise((resolve, reject) => {
            let sqlGetProjectName = `SELECT name FROM projects WHERE projectid = $1`;
            pool.query(sqlGetProjectName, [projectid]).then(projectName => {
                let sqlDeleteProject = `DELETE FROM projects WHERE projectid = $1`;
                projectName = projectName.rows[0].name;
                pool.query(sqlDeleteProject, [projectid]).then(() => {
                    resolve(`Project ${projectName} with ID = ${projectid} delete successfully`);
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        })
    }

    // ======================================= GET EDIT PROJECT =======================================
    static dataProject(pool, projectid) {
        let sqlProjectName = `SELECT name FROM projects WHERE projectid = $1`;
        let sqlMembers = `SELECT userid FROM members WHERE projectid = $1`;
        return new Promise((resolve, reject) => {
            pool.query(sqlProjectName, [projectid]).then(projectName => {
                projectName = projectName.rows[0].name;
                pool.query(sqlMembers, [projectid]).then(userid => {
                    userid = userid.rows;
                    resolve({ projectName, userid });
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        })
    }

    // ======================================== POST EDIT PROJECT ======================================
    // UPDATE PROJECT NAME
    static updateProjectName(pool, projectid, projectName) {
        let sqlProjectName = `UPDATE projects SET name = $1 WHERE projectid = $2`;
        return pool.query(sqlProjectName, [projectName, projectid]);
    }

    //UPDATE PROJECT MEMBER
    static updateProjectMembers(pool, projectid, membersArr = [], projectName){
        return new Promise((resolve, reject) => {
            let sqlDelete = `DELETE FROM members WHERE projectid = $1`;
            pool.query(sqlDelete, [projectid]).then(() => {
                let sqlAddMembers = `INSERT INTO members (projectid, userid) VALUES `;
                let userArray = [];
                membersArr.forEach((userid) => {
                    userArray.push(`(${projectid}, ${userid})`);
                })
                sqlAddMembers += userArray.join(', ');
                pool.query(sqlAddMembers).then(() => {
                    resolve(`Project ${projectName} edited successfully`);
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        })
    }

    // ========================================== GET MEMBERS PROJECT OVERVIEW ==================================
    static filterMember(pool, sql, withWhere, formFilter = [], activeQuery = [], limit = 3, offset = 0 , usePagination = false){
        let activeFilter = [];
        let filterValue = [];
        for (let item of formFilter) {
            if (item.value && activeQuery.includes(item.name)) {
                activeFilter.push(item.dbquery.replace('$', `$${activeFilter.length + 1}`));
                filterValue.push(item.value);
            }
        }
        if (activeFilter != undefined && activeFilter.length > 0) {
            if(withWhere)
                sql += ` AND ${activeFilter.join(" AND ")}`;
            else
                sql += ` WHERE ${activeFilter.join(" AND ")}`;
        }
        if(usePagination){
            sql += `ORDER BY members.id ASC LIMIT ${limit} OFFSET ${offset}`;
        }
        return pool.query(sql,filterValue);
    }
    
    static countUser(pool, formFilter = [], activeQuery = [], projectid){
        let sqlCountMembers = `SELECT COUNT(DISTINCT userid) FROM members INNER JOIN users USING (userid) WHERE projectid = ${projectid}`;
        let withWhere = true;
        return Project.filterMember(pool, sqlCountMembers, withWhere, formFilter, activeQuery)
    }

    static membersList(pool, formFilter = [], activeQuery = [], projectid, limit, offset){
        let sqlGetMembers = `SELECT members.id, users.userid, CONCAT(firstname, ' ', lastname) as name, role, generalrole FROM users INNER JOIN members USING (userid) WHERE members.projectid = ${projectid} `;
        let withWhere = true;
        let usePagination = true;
        return Project.filterMember(pool, sqlGetMembers, withWhere, formFilter, activeQuery, limit, offset, usePagination); 
    }

    static updateMembersOptions(pool, options = []) {
        let sqlUpdateOptions = `UPDATE users SET membersopt = $1 WHERE userid = $2`;
        return pool.query(sqlUpdateOptions, options);
    }

    static userNotAssigned(pool, projectid){
        let sqlUser = `SELECT DISTINCT users.userid, CONCAT(firstname,' ',lastname) as fullname FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) WHERE userid NOT IN (SELECT DISTINCT userid FROM members WHERE projectid = $1)`;
        return pool.query(sqlUser, [projectid]);
    }

    // ADD MEMBERS MODEL
    static countMembersAssigned(pool, projectid){
        let sqlCount = `SELECT COUNT(DISTINCT userid) FROM members WHERE projectid = $1`;
        return pool.query(sqlCount, [projectid]);
    }

    static addUser(pool, userData, projectid){
        let Column = ['projectid', ...Object.keys(userData)];
        let columnValues = [projectid, ...Object.values(userData)];
        let dummy = ['$1','$2'];
        (Column.length > 2) ? dummy.push('$3') : '';
        let sqlAddUser = `INSERT INTO members(${Column.join(', ')}) VALUES (${dummy})`;
        return pool.query(sqlAddUser, columnValues);
    }

    // DELETE MEMBERS MODEL
    static deleteMembers(pool, memberid){
        let sqlDelete = `DELETE FROM members WHERE id = $1`;
        return pool.query(sqlDelete, [memberid]);
    }

    static countBefore(pool, memberid, projectid){
        let sqlCount = `SELECT COUNT(DISTINCT userid) FROM members WHERE id <= $1 AND projectid = $2`;
        return pool.query(sqlCount,[memberid, projectid]);
    }

    // EDIT MEMBERS MODEL
    static editMembers(pool, role, memberid){
        let sqlEditMember = `UPDATE members SET role = $1 WHERE id = $2`;
        return pool.query(sqlEditMember, [role, memberid]);
    }
    
    static renderMembers(pool, projectid, userid){
        let sqlGetMember = `SELECT members.*, CONCAT(firstname,' ',lastname) AS fullname FROM members INNER JOIN users USING (userid) WHERE projectid = $1 AND userid = $2`;
        return pool.query(sqlGetMember,[projectid, userid]); 
    }


}