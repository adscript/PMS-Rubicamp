module.exports = class Profile {
    static updateProfile(pool, Query = [], arrValue = [], counter){
        let sqlUpdated = `UPDATE users SET ${Query.join(', ')} WHERE userid = $${counter}`;
        console.log(sqlUpdated);
        return pool.query(sqlUpdated, arrValue);
    }
}