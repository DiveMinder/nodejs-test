/**
 * Database functions for PostgreSQL operations
 */
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
  console.log(`Starting database insertion for ${users.length} users`);
  console.log('Database URL available:', !!process.env.DATABASE_URL);
  
  const client = await pool.connect();
  console.log('Database client connected successfully');
  
  try {
    await client.query('BEGIN');
    console.log('Database transaction started');
    
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
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (i === 0) {
        console.log('Processing first user:', user.user_id, user.username);
      }
      
      const values = [
        user.user_id, user.id, user.facility_id, user.user_uuid, user.username,
        user.name, user.email, user.email_verified_at, user.password,
        user.remember_token, user.created_at, 
        user.updated_at || user.created_at, // Use created_at if updated_at is null
        user.created_user_id || 0, user.updated_user_id || 0, user.instance_id || 0, 
        user.prefix_id || 0, user.first_name, user.middle_name, user.last_name, 
        user.suffix_id || 0, user.gender || 0, user.member_number || 0, 
        user.region_id || 0, user.login_count || 0, 
        user.login_stamp || user.created_at, // Use created_at if login_stamp is null
        user.status_id || 1, user.user_level_id || 1, user.admin_level_id || 1, 
        user.dob, user.meta_data, user.external_ids, user.biometric_key,
        user.biometric_expiration, user.reward_program, user.member_added_date
      ];
      
      await client.query(insertQuery, values);
      if (i % 100 === 0) {
        console.log(`Processed ${i + 1} users...`);
      }
    }
    
    await client.query('COMMIT');
    console.log('Database transaction committed successfully');
    
    return {
      success: true,
      message: `Inserted/Updated ${users.length} users`,
      count: users.length
    };
    
  } catch (error) {
    console.error('Database error during user insertion:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    console.log('Database client released');
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
 * Insert e-learning codes data into get_elearning_codes table
 * @param {Array} elearningCodes - Array of e-learning code objects from the API response
 * @returns {Promise<Object>} - Result of the database operation
 */
const insertElearningCodes = async (elearningCodes) => {
  console.log(`Starting database insertion for ${elearningCodes.length} e-learning codes`);
  console.log('Database URL available:', !!process.env.DATABASE_URL);
  
  const client = await pool.connect();
  console.log('Database client connected successfully');
  
  try {
    await client.query('BEGIN');
    console.log('Database transaction started');
    
    // Temporarily disable foreign key constraints
    console.log('Temporarily disabling foreign key constraints...');
    await client.query('SET session_replication_role = replica;');
    
    // Prepare the insert statement
    const insertQuery = `
      INSERT INTO get_elearning_codes (
        id, user_id, course_id, user_name, first_name, middle_name, last_name, dob, email,
        facility_id, facility_name, facility_number, office_id, agency_id, agency,
        course_name, course_meta, moodle_id, instance_id, prefix_id, suffix_id,
        status_id, status_label, signup_code, signup_date, help_date, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        course_id = EXCLUDED.course_id,
        user_name = EXCLUDED.user_name,
        first_name = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        last_name = EXCLUDED.last_name,
        dob = EXCLUDED.dob,
        email = EXCLUDED.email,
        facility_id = EXCLUDED.facility_id,
        facility_name = EXCLUDED.facility_name,
        facility_number = EXCLUDED.facility_number,
        office_id = EXCLUDED.office_id,
        agency_id = EXCLUDED.agency_id,
        agency = EXCLUDED.agency,
        course_name = EXCLUDED.course_name,
        course_meta = EXCLUDED.course_meta,
        moodle_id = EXCLUDED.moodle_id,
        instance_id = EXCLUDED.instance_id,
        prefix_id = EXCLUDED.prefix_id,
        suffix_id = EXCLUDED.suffix_id,
        status_id = EXCLUDED.status_id,
        status_label = EXCLUDED.status_label,
        signup_code = EXCLUDED.signup_code,
        signup_date = EXCLUDED.signup_date,
        help_date = EXCLUDED.help_date,
        updated_at = EXCLUDED.updated_at
      `;
    
    // Insert each e-learning code
    for (let i = 0; i < elearningCodes.length; i++) {
      const code = elearningCodes[i];
      if (i === 0) {
        console.log('Processing first e-learning code:', code.id, code.user_name);
      }
      
      const values = [
        code.id || 0,
        code.user_id || 0,
        code.course_id || 0,
        code.user_name || '',
        code.first_name || '',
        code.middle_name || '',
        code.last_name || '',
        code.dob || null,
        code.email || '',
        code.facility_id || 0,
        code.facility_name || '',
        code.facility_number || 0,
        code.office_id || 0,
        code.agency_id || 0,
        code.agency || '',
        code.course_name || '',
        code.course_meta || null,
        code.moodle_id || 0,
        code.instance_id || 0,
        code.prefix_id || 0,
        code.suffix_id || 0,
        code.status_id || 0,
        code.status_label || '',
        code.signup_code || '',
        code.signup_date || null,
        code.help_date || null,
        code.created_at || new Date().toISOString(),
        code.updated_at || new Date().toISOString()
      ];
      
      await client.query(insertQuery, values);
      if (i % 100 === 0) {
        console.log(`Processed ${i + 1} e-learning codes...`);
      }
    }
    
    // Re-enable foreign key constraints
    console.log('Re-enabling foreign key constraints...');
    await client.query('SET session_replication_role = DEFAULT;');
    
    await client.query('COMMIT');
    console.log('Database transaction committed successfully');
    
    return {
      success: true,
      message: `Inserted/Updated ${elearningCodes.length} e-learning codes`,
      count: elearningCodes.length
    };
    
  } catch (error) {
    console.error('Database error during e-learning codes insertion:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    console.log('Database client released');
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
  insertElearningCodes,
  closePool
};
