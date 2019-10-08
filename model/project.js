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
            if (!loginUser.isadmin) {
                this.sql += ` AND users.userid IN (SELECT userid FROM members WHERE projects.projectid IN (SELECT projectid FROM members WHERE userid = $2) )`;
                arrData.push(loginUser.userid);
            }
            return this.pool.query(this.sql, arrData);
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
    static updateProjectMembers(pool, projectid, membersArr = [], projectName) {
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
    static filterMember(pool, sql, withWhere, formFilter = [], activeQuery = [], limit = 3, offset = 0, usePagination = false) {
        let activeFilter = [];
        let filterValue = [];
        for (let item of formFilter) {
            if (item.value && activeQuery.includes(item.name)) {
                activeFilter.push(item.dbquery.replace('$', `$${activeFilter.length + 1}`));
                filterValue.push(item.value);
            }
        }
        if (activeFilter != undefined && activeFilter.length > 0) {
            if (withWhere)
                sql += ` AND ${activeFilter.join(" AND ")}`;
            else
                sql += ` WHERE ${activeFilter.join(" AND ")}`;
        }
        if (usePagination) {
            sql += `ORDER BY members.id ASC LIMIT ${limit} OFFSET ${offset}`;
        }
        return pool.query(sql, filterValue);
    }

    static countUser(pool, formFilter = [], activeQuery = [], projectid) {
        let sqlCountMembers = `SELECT COUNT(DISTINCT userid) FROM members INNER JOIN users USING (userid) WHERE projectid = ${projectid}`;
        let withWhere = true;
        return Project.filterMember(pool, sqlCountMembers, withWhere, formFilter, activeQuery)
    }

    static membersList(pool, formFilter = [], activeQuery = [], projectid, limit, offset) {
        let sqlGetMembers = `SELECT members.id, users.userid, CONCAT(firstname, ' ', lastname) as name, role, generalrole FROM users INNER JOIN members USING (userid) WHERE members.projectid = ${projectid} `;
        let withWhere = true;
        let usePagination = true;
        return Project.filterMember(pool, sqlGetMembers, withWhere, formFilter, activeQuery, limit, offset, usePagination);
    }

    static updateMembersOptions(pool, options = []) {
        let sqlUpdateOptions = `UPDATE users SET membersopt = $1 WHERE userid = $2`;
        return pool.query(sqlUpdateOptions, options);
    }

    static userNotAssigned(pool, projectid) {
        let sqlUser = `SELECT DISTINCT users.userid, CONCAT(firstname,' ',lastname) as fullname FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) WHERE userid NOT IN (SELECT DISTINCT userid FROM members WHERE projectid = $1)`;
        return pool.query(sqlUser, [projectid]);
    }

    // ADD MEMBERS MODEL
    static countMembersAssigned(pool, projectid) {
        let sqlCount = `SELECT COUNT(DISTINCT userid) FROM members WHERE projectid = $1`;
        return pool.query(sqlCount, [projectid]);
    }

    static addUser(pool, userData, projectid) {
        let Column = ['projectid', ...Object.keys(userData)];
        let columnValues = [projectid, ...Object.values(userData)];
        let dummy = ['$1', '$2'];
        (Column.length > 2) ? dummy.push('$3') : '';
        let sqlAddUser = `INSERT INTO members(${Column.join(', ')}) VALUES (${dummy})`;
        return pool.query(sqlAddUser, columnValues);
    }

    // DELETE MEMBERS MODEL
    static deleteMembers(pool, memberid) {
        let sqlDelete = `DELETE FROM members WHERE id = $1`;
        return pool.query(sqlDelete, [memberid]);
    }

    static countBefore(pool, memberid, projectid) {
        let sqlCount = `SELECT COUNT(DISTINCT userid) FROM members WHERE id <= $1 AND projectid = $2`;
        return pool.query(sqlCount, [memberid, projectid]);
    }

    // EDIT MEMBERS MODEL
    static editMembers(pool, role, memberid) {
        let sqlEditMember = `UPDATE members SET role = $1 WHERE id = $2`;
        return pool.query(sqlEditMember, [role, memberid]);
    }

    static renderMembers(pool, projectid, userid) {
        let sqlGetMember = `SELECT members.*, CONCAT(firstname,' ',lastname) AS fullname FROM members INNER JOIN users USING (userid) WHERE projectid = $1 AND userid = $2`;
        return pool.query(sqlGetMember, [projectid, userid]);
    }

    // ========================================= ISSUES ==============================================================
    static filterIssues(pool, sql, formFilter = [], activeQuery = [], limit = 3, offset = 0, usePagination = false) {
        let activeFilter = [];
        let filterValue = [];
        for (let item of formFilter) {
            if (item.value && activeQuery.includes(item.name)) {
                activeFilter.push(item.dbquery.replace('$', `$${activeFilter.length + 1}`));
                filterValue.push(item.value);
            }
        }
        if (activeFilter != undefined && activeFilter.length > 0) {
            sql += ` AND ${activeFilter.join(" AND ")}`;
        }
        if (usePagination) {
            sql += `ORDER BY i1.issueid ASC LIMIT ${limit} OFFSET ${offset}`;
        }
        return pool.query(sql, filterValue);
    }

    static countIssues(pool, formFilter = [], filterQuery = [], projectid) {
        let sqlCountIssue = `SELECT COUNT(DISTINCT i1.issueid) FROM issues as i1 WHERE i1.projectid = ${projectid}`;
        return this.filterIssues(pool, sqlCountIssue, formFilter, filterQuery);
    }

    static renderIssues(pool, formFilter = [], filterQuery = [], projectid, limit, offset) {
        let sqlGetIssues = `SELECT i1.* , CONCAT(u1.firstname,' ',u1.lastname) as assigneename, CONCAT(u2.firstname,' ',u2.lastname) AS authorname, i2.subject AS parenttaskname
        FROM issues as i1 LEFT JOIN users as u1 ON u1.userid = i1.assignee LEFT JOIN users as u2 ON u2.userid = i1.author LEFT JOIN issues AS i2 ON i2.issueid = i1.parenttask WHERE i1.projectid = ${projectid}`;
        return this.filterIssues(pool, sqlGetIssues, formFilter, filterQuery, limit, offset, true);
    }

    static updateIssuesOptions(pool, options = []) {
        let sqlUpdateOptions = `UPDATE users SET issuesopt = $1 WHERE userid = $2`;
        return pool.query(sqlUpdateOptions, options);
    }

    static getAssigneeUser(pool, projectid) {
        let sqlUser = `SELECT DISTINCT users.userid, CONCAT(firstname,' ',lastname) as fullname FROM users INNER JOIN members USING (userid) WHERE users.userid IN (SELECT userid FROM members WHERE projectid = $1)`;
        return pool.query(sqlUser, [projectid]);
    }

    static getParentIssue(pool, projectid, issueid = 0) {
        let sqlIssue = `SELECT DISTINCT issueid, subject FROM issues WHERE projectid = $1`;
        if (issueid > 0)
            sqlIssue += ` AND issueid != ${issueid}`;
        return pool.query(sqlIssue, [projectid]);
    }

    static countAfterAddEdit(pool, projectid, issueid = null, afterEdit = false) {
        let sqlCount = `SELECT COUNT(DISTINCT issueid) FROM issues WHERE projectid = $1 `
        let Constraint = [projectid];
        if (afterEdit) {
            sqlCount += `AND issueid <= $2`;
            Constraint.push(issueid);
        }
        return pool.query(sqlCount, Constraint);
    }

    static addIssue(pool, data) {
        let datakeys = Object.keys(data);
        let datavalues = Object.values(data);
        let arrBinding = datakeys.map((value, index) => {
            return `$${index + 1}`;
        })

        let sqlCount = `INSERT INTO issues (${datakeys.join(', ')}) VALUES (${arrBinding.join(', ')})`;
        return pool.query(sqlCount, datavalues);
    }

    static renderIssuesEdit(pool, projectid, issueid) {
        let sqlGetIssues = `SELECT i1.* , CONCAT(u1.firstname,' ',u1.lastname) as assigneename, CONCAT(u2.firstname,' ',u2.lastname) AS authorname, i2.subject AS parenttaskname
        FROM issues as i1 LEFT JOIN users as u1 ON u1.userid = i1.assignee LEFT JOIN users as u2 ON u2.userid = i1.author LEFT JOIN issues AS i2 ON i2.issueid = i1.parenttask WHERE i1.projectid = $1 AND i1.issueid = $2`;
        return pool.query(sqlGetIssues, [projectid, issueid]);
    }

    static updateIssues(pool, data, issueid) {
        return new Promise((resolve, reject) => {

            let closeddate = false;
            if (data.status == 'Closed') {
                closeddate = true;
            }
            let dataKeys = Object.keys(data);
            let dataValues = Object.values(data);
            let arrBinding = dataKeys
                .filter((value, index) => {
                    return dataValues[index] != '';
                }).map((value, index) => {
                    return `${value} = $${index + 1}`;
                })

            data = dataKeys.reduce((obj, key, index) => {
                if (dataValues[index] != '')
                    obj[key] = dataValues[index];
                return obj;
            }, {})

            dataValues = Object.values(data);
            let sqlUpdateIssue = `UPDATE issues SET ${arrBinding.join(', ')}, updateddate = now()${(closeddate) ? ', closeddate = now() ' : ' '}WHERE issueid = $${arrBinding.length + 1}`;

            pool.query(sqlUpdateIssue, [...dataValues, issueid]).then(() => {
                resolve(data);
            }).catch(err => reject(err));
        })
    }

    static deleteIssue(pool, issueid){
        let sqlDeleteIssue = `DELETE FROM issues WHERE issueid = $1 AND closeddate is null`;
        return pool.query(sqlDeleteIssue, [issueid]);
    }

    static addActivity(pool, Data, oldData, projectid, userid) {
        let title = `[${Data.tracker}] ${Data.subject} #${projectid} (${Data.status})`;
        let doneString = (oldData.done == Data.done) ? `${Data.done} not changed` : `${oldData.done} --> ${Data.done}`;
        let spentString = (oldData.spenttime == Data.spenttime) ? `${Data.spenttime} not changed` : `${oldData.spenttime} --> ${Data.spenttime}`;
        let description = `Done (%): ${doneString}. Spent time (hours): ${spentString}.`;
        let author = userid;
        let Column = ['projectid', 'title', 'description', 'author'];
        let sqlAuthor = `INSERT INTO activity(${Column.join(', ')}) VALUES ($1, $2, $3, $4)`;
        return pool.query(sqlAuthor, [projectid, title, description, author]);
    }
    
    static viewActivity(pool, projectid){
        let sqlActivity = `SELECT title, description, 
        (time AT TIME ZONE 'Asia/Jakarta' AT time zone 'utc')::time as time,
        (time AT TIME ZONE 'Asia/Jakarta' AT TIME ZONE 'utc')::DATE AS date, 
        CONCAT(firstname,' ',lastname) as author_name 
        FROM activity LEFT JOIN users 
        ON activity.author = users.userid
        WHERE projectid = $1
        ORDER BY activity.time DESC`;
        return pool.query(sqlActivity, [projectid]);
    }
    
    static overviewMember(pool, projectid){
        let sqlMembersList = `SELECT CONCAT(firstname,' ',lastname) AS fullname FROM members INNER JOIN users USING (userid) WHERE projectid = $1`;
        return pool.query(sqlMembersList, [projectid]);
    }

    static overviewIssues(pool, projectid){
        let sqlIssue = `SELECT tracker,
        COUNT(CASE WHEN tracker = 'Bug' THEN 1 END) AS totalbug,
        COUNT(CASE WHEN tracker = 'Feature' THEN 1 END) AS totalfeature,
        COUNT(CASE WHEN tracker = 'Support' THEN 1 END) AS totalsupport,
        COUNT(CASE WHEN tracker = 'Bug' AND status != 'Closed' THEN 1 END) AS bug,
        COUNT(CASE WHEN tracker = 'Feature' AND status != 'Closed' THEN 1 END) AS feature,
        COUNT(CASE WHEN tracker = 'Support' AND status != 'Closed' THEN 1 END) AS support
        FROM issues
        WHERE projectid = $1
        GROUP BY tracker`
        return pool.query(sqlIssue, [projectid]);
    }
    
}