const express = require('express');
const path = require('path');
const { createClient } = require('redis');

const DATA_TYPES = [ 'string', 'set' ];
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

  const redisOptions = {
    socket: {
      host: payloadRedisOptions.host,
      port: payloadRedisOptions.port,
      tls: payloadRedisOptions.tls
    }
  }

  if(payloadRedisOptions.username && payloadRedisOptions.password) {
    client.username = payloadRedisOptions.username;
    client.password = payloadRedisOptions.password;
  }

  const client = await createClient(redisOptions)
                        .on('error', err => console.error(err)) // TODO: throw error
                        .connect();

  return client;

}


const app = express();
app.use(express.json())
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

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
app.post('/api/process', async (req, res) => {
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
  
  try {

    if(action.dataType == "string") {

      if(action.action === ACTIONS.STRING.READ) {
  
        const keys = await client.keys(action.key);
        console.log(keys);
        const values = [];
        for(const key of keys) {
          const value = await client.get(key);
          console.log(key, value);
          values.push({key, value});
        }
        response.data = values;
  
      } else if(action.action === ACTIONS.STRING.WRITE) {
  
        await client.set(action.key, action.value);
        response.data = {key: action.key, value: await client.get(action.key)};
  
      } else if (action.action === ACTIONS.STRING.COPY) {
  
        const sourceRedisClient = await getRedisClient(payloadSourceRedisOptions);
        const sourceKeys = await sourceRedisClient.keys(action.key);
        const values = [];
        for(const key of sourceKeys) {
          const value = await sourceRedisClient.get(key);
          await client.set(key, value);
          values.push({key, value});
        }
  
        response.data = values;
        await sourceRedisClient.disconnect();
  
      } else if(action.action === ACTIONS.STRING.DELETE) {
        const keys = await client.keys(action.key);
  
        for(const key of keys) {
          await client.del(key);
        }

        response.data = `${keys.length} items deleted. Items: ${keys}`;
  
      } else {
        response.message = "Unsupported action: " + action.action;
      }
  
    } else if(action.dataType === "set") {

      if(action.action === ACTIONS.SET.READ) {
        
        const members = await client.sMembers(action.key);
        response.data = members;

      } else if(action.action === ACTIONS.SET.WRITE) {
        
        await client.sAdd(action.key, action.value);
        const members = await client.sMembers(action.key);
        response.data = members;

      } else if (action.action === ACTIONS.SET.COPY) {

        const sourceRedisClient = await getRedisClient(payloadSourceRedisOptions);
        const sourceMembers = await sourceRedisClient.sMembers(action.key);
        response.data = await client.sAdd(action.key, sourceMembers);
        await sourceRedisClient.disconnect();

      } else if(action.action === ACTIONS.SET.DELETE_VALUE) {
        
        const status = await client.sRem(action.key, action.value);
        response.data = status;

      } else if(action.action === ACTIONS.SET.DELETE_KEY) {
        
        const status = await client.del(action.key);
        response.data = status;

      } else {
        response.message = "Unsupported action: " + action.action;
      }

    } else {
      response.message = "Unsupported dataType: " + action.dataType;
    }

  } catch(err) {
    console.error(err);
    response.error = err;
    response.message = err.message;
  } finally {
    await client.disconnect();
    res.json(response);
  }

});

// Handle all other routes (optional catch-all)
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

// Listen on port from environment or default to 3000
exports.app = app;
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));