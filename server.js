const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const redis = require('redis');
const crypto = require('crypto');
const validator = require('validator');
const url = require('url');
const dot = require('dotenv').config()
const {promisify} = require('util');

const app = express();
const server = http.createServer(app);
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

const PORT = process.env.HTTP_PORT || 80;
const DOMAIN_NAME = process.env.DOMAIN_NAME || '127.0.0.1';
const keyPrefix = 'tURL';

var counter = 0; // For making hash more unique

'use strict';
/* 
 * Setting up redis
 */
redisClient.on('error', function(err) {
  console.log('[Redis][Error] ' + err);
});

/* 
 * Setting up express 
 */
app.use(bodyParser.urlencoded({ extended: true }));

app.route('/')
.get(function(req, res) {
  res.sendFile(path.join(__dirname, '/public/index.html'));
})
.post(function(req,res) {
  let input_url;
  let hash;
  let out = {
    'ret': 'ok',
    'status_code': '200',
    'data': null,
    'msg': ''
  }

  inputUrl = req.body.url;

  if (url && validator.isURL(inputUrl)) {
    handleSavePair(inputUrl)
      .then((hash) => {
        out['data']={'url': inputUrl, 'tiny_url': url.resolve(DOMAIN_NAME, hash)};
        res.json(out);
      })
      .catch((times) => {
        out['ret'] = 'error';
        out['status_code'] = '500';
        out['msg'] = 'Exceed Maximum Retry';
        res.json(out);
      });
  }
  else {
    out['ret'] = 'error';
    out['status_code'] = '500';
    out['msg'] = 'Invalid URL';
    res.json(out);
  }
});

app.get('/:hash', function(req, res) {
  let hash = req.params.hash;
  redisClient.get(`${ keyPrefix }:${ hash }`, function(err, data) {
    if (!err && data) {
       res.redirect(301, data);
    }
    else {
       res.status(404).send('404 NOT FOUND');
    }
  });
});

server.listen(PORT, function() {
  console.log('[INFO] Server is listening on port: ', PORT);
});

function getHashString(s) {
  let string62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let hash = crypto.createHash('sha256').update(s + string62[Math.floor(Math.random() * string62.length)]);
  let code = hash.digest('base64').substr(0, 7).replace('/', '').replace('+', '');

  return code
}

function handleSavePair(inputUrl) {
  counter = 0;
  return new Promise(function(resolve, reject) {
    recurSavePair(inputUrl, resolve, reject);
  });
}

function recurSavePair(input, finish, fail) {
 // If depth of recurrence exceed 5, then return error
 if (counter >= 5) {
   return fail(counter);
 }

 let hash = getHashString(input)
 savePair(hash, inputUrl)
   .then(() => {
     finish(hash);
   })
   .catch(() => {
     recurSavePair(inputUrl, finish, fail);
   });     
}

function savePair(hash, inputUrl) {
  console.log("[DEBUG] Try save: ", hash, inputUrl);
  return new Promise(function(resolve, reject) {
    redisClient.get(`${ keyPrefix }:${ hash }`, function(err, data) {
      if (data) {
        console.log('[DEBUG] Key collides!');
        counter += 1;

        return reject();
      }
      else {
        redisClient.set(`${ keyPrefix }:${ hash }`, inputUrl);

        return resolve();
      }
    });
  });
}
