/**
 * Webhook functions for the Node.js application
 */
const https = require('https');

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
      xsrf = externalResponse.xsrf || '';
    }
    
    // Now make the actual facility signups API call
    const facilitySignupsResponse = await makeFacilitySignupsRequest(
      process.env.FACILITY_ID,
      cookies,
      xsrf
    );
    
    console.log('Facility signups API response received');
    
    // Return the actual response from the facility signups API
    res.status(200).json({
      status: "success",
      response: facilitySignupsResponse
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

module.exports = {
  handleGetFacilitySignups
};
