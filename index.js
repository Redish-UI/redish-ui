/*
Version: 1.0.0
Last Modified: 10-08-2024
Author: soumitri.pattnaik@gmail.com
*/

const express = require('express');
const { createClient } = require('redis');

const ACTIONS = {
  STRING: {
    READ: 'read',
    WRITE: 'write',
    COPY: 'copy',
    DELETE: 'delete'
  },
  SET: {
    READ: 'read',
    WRITE: 'write',
    COPY: 'copy',
    DELETE_VALUE: 'delete-value',
    DELETE_KEY: 'delete-key'
  }
}

const getRedisClient = async (payloadRedisOptions) => {
  console.log("payloadRedisOptions", payloadRedisOptions);

  const redisOptions = {
    socket: {
      host: payloadRedisOptions.host,
      port: payloadRedisOptions.port,
      tls: payloadRedisOptions.tls,
      connectionTimeout: payloadRedisOptions.timeout,
      reconnectStrategy: false
    }
  }

  if (payloadRedisOptions.tls) {
    redisOptions.socket.rejectUnauthorized = false;
  }

  if (payloadRedisOptions.username) {
    redisOptions.username = payloadRedisOptions.username;
  }

  if (payloadRedisOptions.password) {
    redisOptions.password = payloadRedisOptions.password;
  }

  console.log("redisOptions", redisOptions);

  const client = await createClient(redisOptions)
    .on('error', err => console.error(err))
    .connect();

  return client;

}

const app = express();
app.use(express.json())
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
// app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html 
app.get('/', (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log('auth-header', authHeader);

  // Render home using EJS template engine
  res.render('home', { token: authHeader });
});


/**
 * Body:
{
  redis: {
    host?: "....",
    port?: ...,
    tls?: true/false,
    username?: "...",
    password?: "..."
  },

  sourceRedis?: {
    host?: "....",
    port?: ...,
    tls?: true/false,
    username?: "...",
    password?: "..."
  }

  action: {
    dataType?: "string | set", // default string

    key: "...",
    value: "...",
    ttl: ..., // number
    
    // String
    action: "read | write | delete | copy",
    
    // Set
    action: "read | write | delete-key | delete-value | copy",
  }
}
 * 
 */
app.post('/api/v1/process', async (req, res) => {
  // Get request body
  const payload = req.body;
  console.log('payload', payload);
  const payloadRedisOptions = payload.redis;
  const payloadSourceRedisOptions = payload.sourceRedis;
  const action = payload.action;

  const client = await getRedisClient(payloadRedisOptions);
  const response = {
    error: null,
    message: "OK",
    data: null
  };
  const NO_KEYS_MESSAGE = 'No keys found';

  try {

    // This is for the searchTerm
    if (payload.searchTerm) {

      const keys = await client.keys(payload.searchTerm);
      const values = [];

      for (const key of keys) {
        // console.log('key:', key);

        const type = await client.type(key);
        console.log(`${keys.length} keys found.`);
        // console.log(`type: ${type}`);

        if (type === 'string') {
          const value = await client.get(key);
          // console.log(`value: ${value}`);

          try {
            const parsed = JSON.parse(value);
            values.push({ type, key, value: parsed });
          } catch (e) {
            // console.debug(`Unable to parse string value to JSON | error: ${e} | key: ${key} | value: ${value}`);
            values.push({ type, key, value });
          }

        } else if (type === 'set') {
          const value = await client.sMembers(key);
          values.push({ type, key, value });
        } else if (type === 'hash') {
          const value = await client.hGetAll(key);
          values.push({ type, key, value });
        }
      }

      if (values.length > 0)
        response.data = values;
      else
        response.message = NO_KEYS_MESSAGE;

    } else {

      if (action.dataType == "string") {

        if (action.action === ACTIONS.STRING.READ) {

          const keys = await client.keys(action.key);
          const values = [];
          for (const key of keys) {
            console.log('key:', key);

            const type = await client.type(key);
            console.log(`type: ${type}`);

            if (type === 'string') {
              const exists = await client.exists(key);
              console.log("exists", exists);
              const value = await client.get(key);
              console.log(`value: ${value}`);
              values.push({ key, value });
            }
          }

          if (values.length > 0)
            response.data = values;
          else
            response.message = NO_KEYS_MESSAGE;

        } else if (action.action === ACTIONS.STRING.WRITE) {

          await client.set(action.key, action.value);
          response.data = { key: action.key, value: await client.get(action.key) };

        } else if (action.action === ACTIONS.STRING.COPY) {

          const sourceRedisClient = await getRedisClient(payloadSourceRedisOptions);
          const sourceKeys = await sourceRedisClient.keys(action.key);

          const values = [];
          for (const key of sourceKeys) {
            const value = await sourceRedisClient.get(key);
            await client.set(key, value);
            values.push({ key, value });
          }

          await sourceRedisClient.quit();

          if (values && values.length > 0)
            response.data = values;
          else
            response.message = NO_KEYS_MESSAGE;

        } else if (action.action === ACTIONS.STRING.DELETE) {
          const keys = await client.keys(action.key);

          for (const key of keys) {
            await client.del(key);
          }

          if (keys && keys.length > 0)
            response.message = `${keys.length} items deleted.`;
          else
            response.message = NO_KEYS_MESSAGE;

        } else {
          response.message = "Unsupported action: " + action.action;
        }

      } else if (action.dataType === "set") {

        if (action.action === ACTIONS.SET.READ) {

          const keys = await client.keys(action.key);
          const membersList = [];
          for (const key of keys) {
            console.log('key:', key);

            const type = await client.type(key);
            console.log(`type: ${type}`);

            if (type === 'set') {
              const members = await client.sMembers(key);
              console.log(`members: ${members}`);
              membersList.push({ key, members });
            }
          }

          if (membersList && membersList.length > 0)
            response.data = membersList;
          else
            response.message = NO_KEYS_MESSAGE;

        } else if (action.action === ACTIONS.SET.WRITE) {

          await client.sAdd(action.key, action.value);
          const members = await client.sMembers(action.key);
          response.data = members;

        } else if (action.action === ACTIONS.SET.COPY) {

          const sourceRedisClient = await getRedisClient(payloadSourceRedisOptions);
          const sourceMembers = await sourceRedisClient.sMembers(action.key);
          response.data = await client.sAdd(action.key, sourceMembers);
          await sourceRedisClient.quit();

        } else if (action.action === ACTIONS.SET.DELETE_VALUE) {

          const status = await client.sRem(action.key, action.value);
          response.data = status;

        } else if (action.action === ACTIONS.SET.DELETE_KEY) {

          const status = await client.del(action.key);
          response.data = status;

        } else {
          response.message = "Unsupported action: " + action.action;
        }

      } else {
        response.message = "Unsupported dataType: " + action.dataType;
      }

    }

    console.log('response.data:', response.data, 'type:', typeof (response.data), 'length', response.data?.length);

  } catch (err) {
    console.error(err);
    response.error = err;
    response.message = err.message;
  } finally {
    if (client)
      await client.quit();
    res.json(response);
  }

});

app.post('/api/v1/connect', async (req, res) => {

  // Get request body
  const payload = req.body;
  console.log('POST /api/v1/connect', 'payload', payload);

  try {
    const redisClient = await getRedisClient(payload);
    console.log('redisClient', redisClient);

    if (redisClient) {
      res.json({ connected: true, error: null });
    } else {
      res.json({ connected: false, error: new Error('Unable to connect') });
    }
  } catch (err) {
    console.error(err);
    res.json({ connected: false, error: err });
  }

});

// Handle all other routes (optional catch-all)
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

// Listen on port from environment or default to 3000
exports.app = app;
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port localhost:${PORT}`));

