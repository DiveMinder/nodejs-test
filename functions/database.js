/**
 * Database functions for PostgreSQL operations
 */
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Insert facility signups data into get_facility_signups table
 * @param {Array} users - Array of user objects from the API response
 * @returns {Promise<Object>} - Result of the database operation
 */
const insertFacilitySignups = async (users) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Prepare the insert statement
    const insertQuery = `
      INSERT INTO get_facility_signups (
        user_id, id, facility_id, user_uuid, username, name, email, 
        email_verified_at, password, remember_token, created_at, updated_at,
        created_user_id, updated_user_id, instance_id, prefix_id, first_name,
        middle_name, last_name, suffix_id, gender, member_number, region_id,
        login_count, login_stamp, status_id, user_level_id, admin_level_id,
        dob, meta_data, external_ids, biometric_key, biometric_expiration,
        reward_program, member_added_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35
      )
      ON CONFLICT (user_id) DO UPDATE SET
        id = EXCLUDED.id,
        facility_id = EXCLUDED.facility_id,
        user_uuid = EXCLUDED.user_uuid,
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        email_verified_at = EXCLUDED.email_verified_at,
        password = EXCLUDED.password,
        remember_token = EXCLUDED.remember_token,
        updated_at = EXCLUDED.updated_at,
        created_user_id = EXCLUDED.created_user_id,
        updated_user_id = EXCLUDED.updated_user_id,
        instance_id = EXCLUDED.instance_id,
        prefix_id = EXCLUDED.prefix_id,
        first_name = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        last_name = EXCLUDED.last_name,
        suffix_id = EXCLUDED.suffix_id,
        gender = EXCLUDED.gender,
        member_number = EXCLUDED.member_number,
        region_id = EXCLUDED.region_id,
        login_count = EXCLUDED.login_count,
        login_stamp = EXCLUDED.login_stamp,
        status_id = EXCLUDED.status_id,
        user_level_id = EXCLUDED.user_level_id,
        admin_level_id = EXCLUDED.admin_level_id,
        dob = EXCLUDED.dob,
        meta_data = EXCLUDED.meta_data,
        external_ids = EXCLUDED.external_ids,
        biometric_key = EXCLUDED.biometric_key,
        biometric_expiration = EXCLUDED.biometric_expiration,
        reward_program = EXCLUDED.reward_program,
        member_added_date = EXCLUDED.member_added_date
      `;
    
    // Insert each user
    for (const user of users) {
      const values = [
        user.user_id, user.id, user.facility_id, user.user_uuid, user.username,
        user.name, user.email, user.email_verified_at, user.password,
        user.remember_token, user.created_at, user.updated_at, user.created_user_id,
        user.updated_user_id, user.instance_id, user.prefix_id, user.first_name,
        user.middle_name, user.last_name, user.suffix_id, user.gender,
        user.member_number, user.region_id, user.login_count, user.login_stamp,
        user.status_id, user.user_level_id, user.admin_level_id, user.dob,
        user.meta_data, user.external_ids, user.biometric_key,
        user.biometric_expiration, user.reward_program, user.member_added_date
      ];
      
      await client.query(insertQuery, values);
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: `Inserted/Updated ${users.length} users`,
      count: users.length
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Insert course information into course_info table
 * @param {Object} courses - Courses object from the API response
 * @returns {Promise<Object>} - Result of the database operation
 */
const insertCourseInfo = async (courses) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Prepare the insert statement
    const insertQuery = `
      INSERT INTO course_info (course_id, agency, agency_id, label)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (course_id) DO UPDATE SET
        agency = EXCLUDED.agency,
        agency_id = EXCLUDED.agency_id,
        label = EXCLUDED.label
    `;
    
    let totalCourses = 0;
    
    // Process each agency's courses
    for (const [agencyName, courseList] of Object.entries(courses)) {
      for (const course of courseList) {
        const values = [
          course.course_id,
          course.agency,
          course.agency_id,
          course.label
        ];
        
        await client.query(insertQuery, values);
        totalCourses++;
      }
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: `Inserted/Updated ${totalCourses} courses`,
      count: totalCourses
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Close the database connection pool
 */
const closePool = async () => {
  await pool.end();
};

module.exports = {
  insertFacilitySignups,
  insertCourseInfo,
  closePool
};
