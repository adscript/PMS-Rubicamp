module.exports = class Profile {
    static updateProfile(pool, filterQuery = [], filterValue = [], counter){
        let sqlUpdated = `UPDATE users SET ${filterQuery.join(', ')} WHERE userid = $${counter}`;
        return pool.query(sqlUpdated, filterValue);
    }
}