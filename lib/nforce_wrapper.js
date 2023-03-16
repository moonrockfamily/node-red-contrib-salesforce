const nforce8 = require('nforce8-fix');
// Uncomment when nforce8 2.0.8 is available
//const API_VERSION = nforce8.API_VERSION;
const API_VERSION = 'v45.0';

const oAuthMap = {}; // Capture oauth info for reuse

const getOAuth = (orgConfig) => {
  const curUser = orgConfig.userName;
  return oAuthMap[curUser];
};

const getConnection = (orgOptions) => {
  const id = JSON.stringify(orgOptions);
  let connection = oAuthMap[id];
  if (!connection) {
    connection = nforce8.createConnection(orgOptions);
    // remember the connection
    oAuthMap[id] = connection;
  }
  return connection;
}

const setOAuth = (oauth, orgConfig) => {
  const curUser = orgConfig.userName;
  oAuthMap[curUser] = oauth;
};

/**
 *
 * @param {configOptions} configOptionsRaw from setup node
 * @param {msg} msg incoming message that might have overwrites
 * @returns {org} SFDC Org to be able to authenticate
 *
 */
const prepareConnection = (configOptionsRaw, msg) => {
  // Update configOptions from msg if there's incoming credentials
  const configOptions = mergeConfigOptionsWithMsg(configOptionsRaw, msg);

  // Now build the options we use to create the SFDC connection
  const orgOptions = {
    apiVersion: configOptions.apiversion || API_VERSION,
    clientId: configOptions.consumerKey,
    clientSecret: configOptions.consumerSecret,
    environment: configOptions.environment,
    mode: 'multi',
    redirectUri: configOptions.callbackUrl,
    agentOptions: JSON.parse(configOptions.agentOptions)
  };

  // Overwrite the endpoints eventually - access instance directly
  if (configOptions.usePotUrl) {
    orgOptions.authEndpoint = configOptions.poturl;
    orgOptions.testAuthEndpoint = configOptions.poturl;
  }

  
  // Callout to SFDC, getting org object back
  // todo: reuse existing connection for same orgOptions
  const sfdcOrg = getConnection(orgOptions);


  const result = {
    org: sfdcOrg,
    config: configOptions
  };

  return result;
};

/**
 * wrapper around the org.authenticate function
 * @param {org} org  SFDC Org ready to authenticat
 * @param {configOptions} configOptions from config and msg
 */
const authenticate = (org, configOptions, oAuthCandidate) => {
  // Don't reauthenticate if we are still good
  if (oAuthCandidate && isValidOAuth(oAuthCandidate)) {
    return Promise.resolve(oAuthCandidate);
  }

  const authOptions = {
    username: configOptions.userName,
    password: configOptions.passWord
  };

  // Returns a promise
  return org.authenticate(authOptions);
};

// eslint-disable-next-line no-unused-vars
const isValidOAuth = (candidate) => {
  return candidate && candidate.access_token;
};

/**
 * Define config options from msg object
 * @param {configOptions} configOptions the current configuration settings
 * @param {msg} msg the actual incoming message that might contain identity information
 * @returns {configOptions} config options merged with what was found in the msg object
 */
const mergeConfigOptionsWithMsg = (configOptions, msg) => {
  const connectionOptionResult = { ...configOptions };
  //  Credentials from the msg object will always overwrite the stored
  // properties if the configuration allows that. We copy ALL properties
  // from the sf object
  if (connectionOptionResult.allowMsgCredentials && msg && msg.sf) {
    const sfProperties = msg.sf;
    for (let prop in sfProperties) {
      // We need to check for username/password separate
      // since they are camelCase starting v0.7
      if (prop.toLowerCase() === 'username') {
        connectionOptionResult.userName = sfProperties[prop];
      } else if (prop.toLowerCase() === 'password') {
        connectionOptionResult.passWord = sfProperties[prop];
      } else if (sfProperties.hasOwnProperty(prop)) {
        connectionOptionResult[prop] = sfProperties[prop];
      }
    }
  }
  return connectionOptionResult;
};

/**
 * Checks for Salesforce headers in msg object to send back to SF
 * @param {*} payload - the data to be posted
 * @param {*} msg - the incoming message
 */
const extractHeaders = (payload, msg) => {
  if (payload && msg && msg.sf && msg.sf.headers) {
    payload.headers = msg.sf.headers;
  }
};

module.exports = {
  createConnection: prepareConnection,
  authenticate: authenticate,
  force: nforce8,
  getOAuth: getOAuth,
  setOAuth: setOAuth,
  extractHeaders: extractHeaders,
  API_VERSION: API_VERSION
};
