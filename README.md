imple URL Shortener

## Installation

This app contains a server built with Node.js and Redis as a storage base.

### Install Redis
- Windows: [Here](https://github.com/microsoftarchive/redis)

- Linux: [Here](https://redis.io/download)

Follow the installation guide and successfully start Redis service, Redis server will listen at port 6379.

If you already have a Redis server listening on other host and port, you can simply configure afterwards.

### Install Node.js server

After clone or download from the repository, first install all dependent packages:

```
$ npm install
```
Then create a `.env` file at directory which is same with `server.js` file.

```
$ touch .env
```
Here is the sample of the `.env` file:

```
# .env
HTTP_PORT=9696                  # HTTP server's listening port
DOMAIN_NAME='http://helloworld' # Your domain name for generating tiny url
REDIS_HOST=127.0.0.1            # Redis server's host
REDIS_PORT=6379                 # Redis server's port 
```

If everything has been set up, now we can start our server simply with npm

```
$ npm start
```

## Design Concept

### Goals and basic concept

Our goal is to build up a simple url shortener, which will be given one long url and return a shortened one. 

So the simplest concept and flow is:

1. User send a POST request to server. 

2. Server picks up and uses some algorithm to generate a unique key strnig based on the input url string.

3. Check if the generated key does not collide with the existing key, and then save the unique string and input url as key-value pair to the storage.

4. Response the generated key to user.

5. When users access the short link, redirect them to original url.

### Some cases we should take into consideration

- How long is the life time of short url?

- How is the short url looks like?

- How to generate the unique url, and what if key collision occurs?

- Should the same input url map to the same unique url?

- Whether to save a relation with the short url and user who creates it?

- Datebase traffic issue

### About this app

After thinking and considerng some cases above, I decided to build a http server with Node.js and use Redis to store the data, the reason I choose Redis is that Redis uses key-value pair to store data and in-memory feature can speed up the key validation. But the drawback is that system memory has a maximum. 

Here is the description of what I designed:
 
- The data stored in the system is not permanent, in other words when hit maxmium memory use, Redis will drop some data.

- When given a url, system validates the url string and encrypted with SHA-256 algorithm, and then encodes with base64.

- The short url takes only the first 7 characters of the encoded string, so it is possible that the hash collision occurs. How I handle the collision is to randomly append a base62 character to the end of the given url string.

- When user hit the short url, system query the short url as key and redirect if exists.

- Designed a user-friendly webpage to shorten and pick up.
