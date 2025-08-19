/**
 * Webhook functions for the Node.js application
 */
const https = require('https');
const { insertFacilitySignups, insertCourseInfo, insertElearningCodes } = require('./database');

/**
 * Make HTTP request to external service
 * @param {string} url - The URL to call
 * @param {Object} data - The data to send
 * @returns {Promise<Object>} - The response data
 */
const makeExternalRequest = (url, data) => {
  return new Promise((resolve, reject) => {
    try {
      const postData = JSON.stringify(data);
      
      // Parse the URL to get hostname and path
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (urlError) {
        reject(new Error(`Invalid URL: ${url}. Error: ${urlError.message}`));
        return;
      }
      
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (error) {
            resolve({ raw: responseData });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Handle Get Facility Signups webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleGetFacilitySignups = async (req, res) => {
  try {
    console.log('Webhook received for Get Facility Signups:', req.body);
    
    // Validate environment variables
    if (!process.env.FACILITY_ID) {
      throw new Error('FACILITY_ID environment variable is not set');
    }
    if (!process.env.EXTERNAL_WEBHOOK_URL) {
      throw new Error('EXTERNAL_WEBHOOK_URL environment variable is not set');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('Using Facility ID:', process.env.FACILITY_ID);
    console.log('External Webhook URL:', process.env.EXTERNAL_WEBHOOK_URL);
    
    // First, call the external service to get authentication
    console.log('Calling external service for authentication...');
    const externalResponse = await makeExternalRequest(
      process.env.EXTERNAL_WEBHOOK_URL,
      { 
        function: 'authme',
        facility_id: process.env.FACILITY_ID 
      }
    );
    
    console.log('Authentication received, now calling facility signups API...');
    
    // Extract the authentication data
    let cookies = {};
    let xsrf = '';
    
    if (externalResponse.response && externalResponse.response.cookies) {
      cookies = externalResponse.response.cookies;
      xsrf = externalResponse.response.xsrf || '';
    } else if (externalResponse.cookies) {
      cookies = externalResponse.cookies;
      xsrf = externalResponse.response.xsrf || '';
    }
    
    // Now make the actual facility signups API call
    const facilitySignupsResponse = await makeFacilitySignupsRequest(
      process.env.FACILITY_ID,
      cookies,
      xsrf
    );
    
    console.log('Facility signups API response received');
    
    // Insert data into PostgreSQL database
    console.log('Inserting data into database...');
    console.log('Database URL available:', !!process.env.DATABASE_URL);
    console.log('Response structure:', Object.keys(facilitySignupsResponse));
    
    let dbResults = {};
    
    try {
      // Insert facility signups data
      if (facilitySignupsResponse.data && Array.isArray(facilitySignupsResponse.data)) {
        console.log(`Inserting ${facilitySignupsResponse.data.length} users into database...`);
        console.log('First user sample:', JSON.stringify(facilitySignupsResponse.data[0], null, 2));
        const userResult = await insertFacilitySignups(facilitySignupsResponse.data);
        dbResults.users = userResult;
        console.log('Users inserted successfully:', userResult.message);
      } else {
        console.log('No user data found in response or data is not an array');
        console.log('Data type:', typeof facilitySignupsResponse.data);
        console.log('Data value:', facilitySignupsResponse.data);
      }
      
      // Insert course information
      if (facilitySignupsResponse.courses && typeof facilitySignupsResponse.courses === 'object') {
        console.log('Inserting course information into database...');
        console.log('Courses structure:', Object.keys(facilitySignupsResponse.courses));
        const courseResult = await insertCourseInfo(facilitySignupsResponse.courses);
        dbResults.courses = courseResult;
        console.log('Courses inserted successfully:', courseResult.message);
      } else {
        console.log('No course data found in response or courses is not an object');
        console.log('Courses type:', typeof facilitySignupsResponse.courses);
        console.log('Courses value:', facilitySignupsResponse.courses);
      }
      
    } catch (dbError) {
      console.error('Database insertion error:', dbError);
      console.error('Error stack:', dbError.stack);
      // Continue with the response even if database insertion fails
      dbResults.error = dbError.message;
    }
    
    // Return the actual response from the facility signups API along with database results
    res.status(200).json({
      status: "success",
      response: facilitySignupsResponse,
      database: dbResults
    });
    
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

/**
 * Make HTTP request to facility signups API
 * @param {string} facilityId - The facility ID
 * @param {Object} cookies - Authentication cookies
 * @param {string} xsrf - XSRF token
 * @returns {Promise<Object>} - The response data
 */
const makeFacilitySignupsRequest = (facilityId, cookies, xsrf) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'portal.tdisdi.com',
      port: 443,
      path: `/ajax/get_facility_signups?facility_uuid=${facilityId}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `ITIAuthToken=${cookies.ITIAuthToken || ''}; PORTALSESSID=${cookies.PORTALSESSID || ''}; SAMLSessionID=${cookies.SAMLSessionID || ''}; SelectedFacility=${facilityId}; XSRF-TOKEN=${xsrf || ''}; tdisdi_portal_session=${cookies.tdisdi_portal_session || ''}`,
        'x-csrf-token': xsrf || '',
        'x-requested-with': 'XMLHttpRequest',
        'sec-fetch-mode': 'cors',
        'Referer': 'https://portal.tdisdi.com/'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          resolve({ raw: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

/**
 * Handle Get E-Learning Codes webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleGetElearningCodes = async (req, res) => {
  try {
    console.log('Webhook received for Get E-Learning Codes:', req.body);
    
    // Validate environment variables
    if (!process.env.FACILITY_ID) {
      throw new Error('FACILITY_ID environment variable is not set');
    }
    if (!process.env.EXTERNAL_WEBHOOK_URL) {
      throw new Error('EXTERNAL_WEBHOOK_URL environment variable is not set');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('Using Facility ID:', process.env.FACILITY_ID);
    console.log('External Webhook URL:', process.env.EXTERNAL_WEBHOOK_URL);
    
    // First, call the external service to get authentication
    console.log('Calling external service for authentication...');
    const externalResponse = await makeExternalRequest(
      process.env.EXTERNAL_WEBHOOK_URL,
      { 
        function: 'authme',
        facility_id: process.env.FACILITY_ID 
      }
    );
    
    console.log('Authentication received, now calling e-learning codes API...');
    
    // Extract the authentication data
    let cookies = {};
    let xsrf = '';
    
    if (externalResponse.response && externalResponse.response.cookies) {
      cookies = externalResponse.response.cookies;
      xsrf = externalResponse.response.xsrf || '';
    } else if (externalResponse.cookies) {
      cookies = externalResponse.cookies;
      xsrf = externalResponse.xsrf || '';
    }
    
    // Now make the actual e-learning codes API call
    const elearningCodesResponse = await makeElearningCodesRequest(
      process.env.FACILITY_ID,
      cookies,
      xsrf
    );
    
    console.log('E-learning codes API response received');
    
    // Insert data into PostgreSQL database
    console.log('Inserting e-learning codes data into database...');
    console.log('Database URL available:', !!process.env.DATABASE_URL);
    console.log('Response structure:', Object.keys(elearningCodesResponse));
    
    let dbResults = {};
    
    try {
      // Insert e-learning codes data
      if (elearningCodesResponse.data && Array.isArray(elearningCodesResponse.data)) {
        console.log(`Inserting ${elearningCodesResponse.data.length} e-learning codes into database...`);
        console.log('First e-learning code sample:', JSON.stringify(elearningCodesResponse.data[0], null, 2));
        const elearningResult = await insertElearningCodes(elearningCodesResponse.data);
        dbResults.elearning_codes = elearningResult;
        console.log('E-learning codes inserted successfully:', elearningResult.message);
      } else {
        console.log('No e-learning codes data found in response or data is not an array');
        console.log('Data type:', typeof elearningCodesResponse.data);
        console.log('Data value:', elearningCodesResponse.data);
      }
      
    } catch (dbError) {
      console.error('Database insertion error:', dbError);
      console.error('Error stack:', dbError.stack);
      // Continue with the response even if database insertion fails
      dbResults.error = dbError.message;
    }
    
    // Return the actual response from the e-learning codes API along with database results
    res.status(200).json({
      status: "success",
      response: elearningCodesResponse,
      database: dbResults
    });
    
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

/**
 * Make HTTP request to e-learning codes API
 * @param {string} facilityId - The facility ID
 * @param {Object} cookies - Authentication cookies
 * @param {string} xsrf - XSRF token
 * @returns {Promise<Object>} - The response data
 */
const makeElearningCodesRequest = (facilityId, cookies, xsrf) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'portal.tdisdi.com',
      port: 443,
      path: `/ajax/get_elearning_codes_by_facility?facility_uuid=${facilityId}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `ITIAuthToken=${cookies.ITIAuthToken || ''}; PORTALSESSID=${cookies.PORTALSESSID || ''}; SAMLSessionID=${cookies.SAMLSessionID || ''}; SelectedFacility=${facilityId}; XSRF-TOKEN=${xsrf || ''}; tdisdi_portal_session=${cookies.tdisdi_portal_session || ''}`,
        'x-csrf-token': xsrf || '',
        'x-requested-with': 'XMLHttpRequest',
        'Referer': 'https://portal.tdisdi.com/elearning/manage-codes'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          resolve({ raw: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

module.exports = {
  handleGetFacilitySignups,
  handleGetElearningCodes
};
