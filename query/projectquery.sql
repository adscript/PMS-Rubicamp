-- get member fullname for filter selection
SELECT userid, CONCAT(firstname, ' ', lastname) as fullname FROM users

-- get options in project based on userid
SELECT projectopt FROM users WHERE userid = 1

-- get list projects in table
SELECT projects.projectid, projects.name, STRING_AGG(CONCAT(firstname, ' ', lastname), ', ') as fullname 
FROM members 
INNER JOIN projects USING (projectid) 
INNER JOIN users USING (userid)
WHERE users.userid IN (
    -- subquery
	SELECT userid FROM members WHERE projectid IN (
        -- subsubquery
		SELECT projectid FROM members WHERE userid = 2
		)
	)
	AND
	projects.projectid IN (
        -- subsubquery
		SELECT projectid FROM members WHERE userid = 2
	)
GROUP BY projects.projectid
ORDER BY projects.projectid ASC


