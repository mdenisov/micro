const http = require('http')

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (resp) => {
      let data = ''

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk
      })

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        resolve(true)
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

async function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

async function pingServer(url, retry = 5) {
  let succeed = false

  for (let i = 0; i < retry; i++) {
    try {
      succeed = await request(url)
    } catch (e) {
      await sleep(500)
    }

    if (succeed) return
  }
}

module.exports = pingServer
