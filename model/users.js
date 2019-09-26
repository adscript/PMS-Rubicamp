module.exports = class Users {
    constructor(pool, formFilter = [], activeQuery = [], limit = 3){
        this.pool = pool;
        this.formFilter = formFilter; 
        this.activeQuery = activeQuery;
        this.limit = limit;
    }
    
    getAllUsers(){
        this.sql = `SELECT userid, email, CONCAT(firstname,' ',lastname) as fullname, isfulltime, generalrole FROM users`;
        this.countTable = false;
        return this;
    }

    getAllConstraint(){
        let activeFilter = [];
        let filterValue = [];
        for(let item of this.formFilter){
            if(item.value && this.activeQuery.includes(item.name)){
                activeFilter.push(item.dbquery.replace('$',`$${activeFilter.length + 1}`));
                filterValue.push(item.value);
            }
        }
        this.activeFilter = activeFilter;
        this.filterValue = filterValue;
        return this;
    }

    getConstraintQuery(offset){
        this.activeQuery = (this.activeFilter.length) ? ` WHERE ${this.activeFilter.join(' AND ')}` : "";
        this.sql += this.activeQuery;
        this.sql += (this.countTable) ? "" : ` ORDER BY userid LIMIT ${this.limit} OFFSET ${offset}`;
        return this.pool.query(this.sql, this.filterValue);
    }

    getNumofPage(){
        this.sql = `SELECT COUNT(DISTINCT userid) FROM users`;
        this.countTable = true;
        return this;
    }

    static updateOptions(pool, options = []){
        let sqlUpdateOptions = `UPDATE users SET usersopt = $1 WHERE userid = $2`;
        return pool.query(sqlUpdateOptions,options);
    }

}