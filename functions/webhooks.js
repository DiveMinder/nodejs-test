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
    const postData = JSON.stringify(data);
    
    // Parse the URL to get hostname and path
    const urlObj = new URL(url);
    
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
    console.log('Using Facility ID:', process.env.FACILITY_ID);
    
    // First, call the external service
    console.log('Calling external service...');
    const externalResponse = await makeExternalRequest(
      process.env.EXTERNAL_WEBHOOK_URL,
      { 
        function: 'authme',
        facility_id: process.env.FACILITY_ID 
      }
    );
    
    console.log('External service response:', externalResponse);
    
    // Extract the specific data we need
    const cookies = externalResponse.response?.cookies || {};
    const xsrf = externalResponse.response?.xsrf || '';
    
    // Format the curl command
    const curlCommand = `curl "https://portal.tdisdi.com/ajax/get_facility_signups?facility_uuid=${process.env.FACILITY_ID}" \\
  -H "Accept: application/json" \\
  -H "Cookie: ITIAuthToken=${cookies.ITIAuthToken || ''}; PORTALSESSID=${cookies.PORTALSESSID || ''}; SAMLSessionID=${cookies.SAMLSessionID || ''}; SelectedFacility=${process.env.FACILITY_ID}; XSRF-TOKEN=${cookies.XSRF_TOKEN || ''}; tdisdi_portal_session=${cookies.tdisdi_portal_session || ''}"`;
    
    // Return just the curl command
    res.status(200).json({
      status: "success",
      curl_command: curlCommand
    });
    
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

module.exports = {
  handleGetFacilitySignups
};
