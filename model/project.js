module.exports = class Project {
    
    constructor(pool, filter = [], activeQuery = [], limit = 3){
        this.pool = pool;
        this.filter = filter; 
        this.activeQuery = activeQuery;
        this.joinQuery = `FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid)`;
        this.limit = limit;
    }

    getAllMember(){
        let sqlListMember = "SELECT userid, CONCAT(firstname, ' ', lastname) as fullname FROM users";
        return this.pool.query(sqlListMember);
    }

    getAllConstraint(user = {}){
        const subQuery = `projects.projectid IN (SELECT projectid FROM members WHERE userid = $)`;
        const userFilter = `users.userid IN (SELECT userid FROM members WHERE )`;
        let count = 1;
        let activeFilter = [];
        let filterValue = [];
        if(!user.isadmin){
            filterValue = [user.userid, user.userid];
            activeFilter = [userFilter.replace('WHERE', `WHERE ${subQuery.replace('$',`$${count++}`)}`), subQuery.replace('$',`$${count++}`)];
        } else if(this.filter[2].value && this.activeQuery.includes(this.activeQuery.name)){
            this.filter[2].dbquery.replace('projectid IN (SELECT projectid FROM members WHERE userid = $)',userFilter.replace('WHERE', `WHERE ${subQuery.replace('$',`$${count++}`)}`))
        }
        for(let item of this.filter){
            if(item.value && this.activeQuery.includes(item.name)){
                activeFilter.push(item.dbquery.replace('$',`$${activeFilter.length + 1}`));
                filterValue.push(item.value);
            }
        }
        this.activeFilter = activeFilter;
        this.filterValue = filterValue;
        
        return this;
    }
    
    getConstraintQuery(){
        if(this.activeFilter.length > 0){
            this.sql += " WHERE " + this.activeFilter.join(" AND ");
        }
        return this;
        
    }

    getClosingQuery(offset){
        this.sql += `GROUP BY projects.projectid ORDER BY projects.projectid ASC LIMIT ${this.limit} OFFSET ${offset};`;
        return this;
    }

    startQuery(){
        return this.pool.query(this.sql, this.filterValue);
    }

    getNumofPage(){
        let sqlCountPage = `SELECT COUNT(DISTINCT projectid) ${this.joinQuery}`;
        this.sql = sqlCountPage;
        return this.getConstraintQuery().startQuery();
    }

    getProjectMemberList(offset){
        let sqlProjectList = `SELECT projects.projectid, projects.name, STRING_AGG(CONCAT(firstname, ' ', lastname), ', ') as fullname ${this.joinQuery}`;
        this.sql = sqlProjectList;
        return this.getConstraintQuery().getClosingQuery(offset).startQuery();
    }

}

// const konci = Project.getAllMember();
// const halaman = Project.getNumofPage();
// Promise.all([konci, halaman]).then(results => {

// })
