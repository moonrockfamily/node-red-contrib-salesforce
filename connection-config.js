/**
 * Configuration settings class for all
 * Salesforce related settings including
 * the ability to read data from the environment
 */
const API_VERSION = require('./lib/nforce_wrapper').API_VERSION;

/**
 * Returns a configured value based on a key and
 * the eventual permitted environment value
 *
 * @param {*} config The Node configuration setting
 * @param {*} configName the configuration key
 */
const getConfigValue = (config, configName) => {
  let candidate = config[configName];
  const envName = getEnvKeyName(config.name, configName);
  if (config.useEnvCredentials) {
    candidate = process.env[envName] || candidate;
  }
  return candidate;
};

/**
 * Returns a environment name to lookup. Takes care of first
 * letter to be capital
 *
 * @param {*} nodeName Name of the configuration node
 * @param {*} paramName Name of parameter, starts lowercase
 */
const getEnvKeyName = (nodeName, paramName) => {
  const upperParam = paramName.substr(0, 1).toUpperCase() + paramName.substr(1);
  return nodeName + '_' + upperParam;
};

/**
 * Returns the environment the app is running in
 * @param {*} config The configuration settings
 */
const getEnvironment = (config) => {
  const custom = config.environment.substr(0, 6) === 'custom';
  const envNameCandidate = (custom ? config.environment.substr(6) : config.environment).substr(0, 1).toLowerCase();
  const secondCandidate =
    envNameCandidate === 'e'
      ? (getConfigValue(config, 'environment') || envNameCandidate).substr(0, 1)
      : envNameCandidate;
  const realEnv =
    secondCandidate === 'p'
      ? 'production'
      : secondCandidate === 'm'
      ? 'marketing'
      : secondCandidate === 'c'
      ? 'commerce'
      : 'sandbox';
  const result = { environment: realEnv, usePotUrl: custom };
  return result;
};

module.exports = (RED) => {
  function ConnectionConfig(config) {
    this.apiversion = config.apiversion || API_VERSION;
    const envResult = getEnvironment(config);
    // Configuration settings, eventually from environment
    this.allowMsgCredentials = config.allowMsgCredentials;
    this.callbackUrl = getConfigValue(config, 'callbackUrl');
    this.consumerKey = getConfigValue(config, 'consumerKey');
    this.consumerSecret = getConfigValue(config, 'consumerSecret');
    this.credentialType = getConfigValue(config, 'credentialType');
    this.environment = envResult.environment;
    this.passWord = getConfigValue(config, 'passWord');
    this.poturl = getConfigValue(config, 'poturl');
    this.usePotUrl = envResult.usePotUrl;
    this.userName = getConfigValue(config, 'userName');
    this.agentOptions = getConfigValue(config,'agentOptions');
    // Register the Node
    RED.nodes.createNode(this, config);
  }
  RED.nodes.registerType('connection-config', ConnectionConfig);
};
