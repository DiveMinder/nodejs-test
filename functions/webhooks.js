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
    
    const options = {
      hostname: 'tapir-pleasant-airedale.ngrok-free.app',
      port: 443,
      path: '/webhook',
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
    
    // First, call the external service
    console.log('Calling external service...');
    const externalResponse = await makeExternalRequest(
      'https://tapir-pleasant-airedale.ngrok-free.app/webhook',
      { function: 'authme' }
    );
    
    console.log('External service response:', externalResponse);
    
    // Then respond to the original webhook
    res.status(200).json({
      message: 'Successfully Called and Responded',
      timestamp: new Date().toISOString(),
      status: 'success',
      externalCall: {
        status: 'completed',
        response: externalResponse
      }
    });
    
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(500).json({
      message: 'Error processing webhook',
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message
    });
  }
};

module.exports = {
  handleGetFacilitySignups
};
