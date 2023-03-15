/**
 * Contains common code pattern for Salesforce actions.
 * Used by actual nodes to achieve DRY
 */
const nforce = require('./nforce_wrapper');

const redError = (redNode, msg, err) => {
  redNode.status({ fill: 'red', shape: 'dot', text: 'Error:' + err.message });
  redNode.log(err, msg);
  redNode.error(err, msg);
};

const redConnect = (redNode, text) => {
  redNode.status({ fill: 'green', shape: 'ring', text: text });
};

const redIdle = (redNode) => {
  redNode.status({ fill: 'gray', shape: 'ring', text: 'idle' });
};

const redReceiving = (redNode) => {
  redNode.status({ fill: 'green', shape: 'dot', text: 'Receiving data' });
};

const redSubscribed = (redNode, text) => {
  redNode.status({ fill: 'blue', shape: 'dot', text: text });
};

const inputToSFAction = (node, msg, payloadHelper) => {
  const connection = node.connection;

  // show initial status of progress
  redConnect(node, 'connecting...');

  // create connection object
  const orgResult = nforce.createConnection(connection, msg);
  const org = orgResult.org;
  const orgConfig = orgResult.config;

  // Auth and run the specific action
  nforce
    .authenticate(org, orgConfig, nforce.getOAuth(orgConfig))
    .then((oauth) => {
      nforce.setOAuth(oauth, orgConfig);
      // Elements that we need in all payloads send to nForce
      let rawPayload = {
        oauth: oauth,
        apiVersion: orgConfig.apiversion
      };
      return payloadHelper(org, rawPayload, nforce);
    })
    .then((results) => {
      if (results) {
        msg.payload = results;
        node.send(msg);
        const nodeStatus = Object.assign({}, results ? results.nodeStatus : {});
        node.status(nodeStatus);
      }
    })
    .catch((err) => {
      redError(node, msg, err);
      if (err.statusCode == 401 && nforce.getOAuth(orgConfig)) {
        nforce.setOAuth(undefined, orgConfig);
        inputToSFAction(node,msg,payloadHelper);
      }
    });
};

module.exports = {
  inputToSFAction,
  error: redError,
  connect: redConnect,
  idle: redIdle,
  receiving: redReceiving,
  subscribed: redSubscribed
};
