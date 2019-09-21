const { Pool } = require('pg');
const connectionString = 'postgresql://adminan:root@localhost:5432/pms'
const pool = new Pool({
  connectionString: connectionString,
})

module.exports = pool;