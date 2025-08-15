const https = require('https')
const URL = require('url')

const NS_PER_SEC = 1e9
const MS_PER_NS = 1e6

function getHrTimeDurationInMs (startTime, endTime) {
  const secondDiff = endTime[0] - startTime[0]
  const nanoSecondDiff = endTime[1] - startTime[1]
  const diffInNanoSecond = secondDiff * NS_PER_SEC + nanoSecondDiff

  return diffInNanoSecond / MS_PER_NS
}

function getTimings (eventTimes) {
  return {
    dnsLookup: eventTimes.dnsLookupAt !== undefined
      ? getHrTimeDurationInMs(eventTimes.startAt, eventTimes.dnsLookupAt) : undefined,
    tcpConnection: getHrTimeDurationInMs(eventTimes.dnsLookupAt || eventTimes.startAt, eventTimes.tcpConnectionAt),
    // There is no TLS handshake without https
    tlsHandshake: eventTimes.tlsHandshakeAt !== undefined
      ? (getHrTimeDurationInMs(eventTimes.tcpConnectionAt, eventTimes.tlsHandshakeAt)) : undefined,
    firstByte: getHrTimeDurationInMs((eventTimes.tlsHandshakeAt || eventTimes.tcpConnectionAt), eventTimes.firstByteAt),
    contentTransfer: getHrTimeDurationInMs(eventTimes.firstByteAt, eventTimes.endAt),
    total: getHrTimeDurationInMs(eventTimes.startAt, eventTimes.endAt)
  }
}

module.exports = async function crawl (socket, constructReply, urlObj) {
  const base = urlObj.url
  function transform (chunk) {
    const regex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.+?)\1/g
    let m
    const n = []
    while (m = regex.exec(chunk)) {
      const match = m[2]
      if (!match.includes('javascript:') && match !== '#') {
        if (match.charAt(0) === '/') {
          n.push(`${base}${match}`)
        } else if (match.includes(base)) {
          n.push(match)
        }
      }
    }
    return n
  }

  function requestPage (url) {
    return new Promise((resolve, reject) => {
      const myURL = new URL.URL(url)
      // Initialization
      const eventTimes = {
        // use process.hrtime() as it's not subject to clock drift
        startAt: process.hrtime(),
        dnsLookupAt: undefined,
        tcpConnectionAt: undefined,
        tlsHandshakeAt: undefined,
        firstByteAt: undefined,
        endAt: undefined
      }

      const req = https.request({
        hostname: myURL.hostname,
        port: 443,
        path: myURL.pathname,
        method: 'GET'
      }, (res) => {
        res.once('readable', () => {
          eventTimes.firstByteAt = process.hrtime()
        })

        // reject on bad status
        // if (res.statusCode < 200 || res.statusCode > 302) {
        //   reject(new Error('statusCode=' + res.statusCode))
        // }
        const urls = []
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          const transformed = transform(chunk)
          urls.push(transformed)
        })
        // resolve on end
        res.on('end', () => {
          eventTimes.endAt = process.hrtime()
          // var page = {
          //   url,
          //   timings: getTimings(eventTimes),
          //   spotted: 1,
          //   urls: [...new Set([].concat.apply([], urls))]
          // }
          var page = Object.assign({ url, ...getTimings(eventTimes), spotted: 1, urls: [...new Set([].concat.apply([], urls))] })
          resolve(page)
        })
      })
      // Request events
      req.on('socket', (socket) => {
        socket.on('lookup', () => {
          eventTimes.dnsLookupAt = process.hrtime()
        })
        socket.on('connect', () => {
          eventTimes.tcpConnectionAt = process.hrtime()
        })
        socket.on('secureConnect', () => {
          eventTimes.tlsHandshakeAt = process.hrtime()
        })
      })
      // reject on request error
      req.on('error', (err) => {
        // This is not a "Second reject", just a different sort of failure
        reject(err)
      })
      // IMPORTANT
      req.end()
    })
  }
  let pageAllowance = 50
  const concurrencyLimit = 5
  const promises = new Array(concurrencyLimit).fill(Promise.resolve())
  const result = {}
  let pagesToVisit = await requestPage(base).then(({ url, dnsLookup, tcpConnection, tlsHandshake, firstByte, contentTransfer, total, spotted, urls }) => {
    result[url] = {
      url,
      dnsLookup,
      tcpConnection,
      tlsHandshake,
      firstByte,
      contentTransfer,
      total,
      spotted
    }
    return [...new Set([].concat.apply([], urls))]
  })
  function chainNext (p) {
    if (pageAllowance > 0) {
      --pageAllowance
      let page = pagesToVisit.shift()
      while (page in result) {
        // We've already visited this page, so try next
        result[page].spotted += 1
        page = pagesToVisit.shift()
      }
      return p.then(() => {
        const operationPromise = requestPage(page).then( ({ url, dnsLookup, tcpConnection, tlsHandshake, firstByte, contentTransfer, total, spotted, urls }) => {
          result[url] = {
            url,
            dnsLookup,
            tcpConnection,
            tlsHandshake,
            firstByte,
            contentTransfer,
            total,
            spotted
          }
          const timings = { dnsLookup, tcpConnection, tlsHandshake, firstByte, contentTransfer, total }
          socket.write(constructReply({ url, timings }))
          pagesToVisit = [...pagesToVisit, ...new Set([].concat.apply([], urls))]
        })
        return chainNext(operationPromise)
      })
    }
    return p
  }

  await Promise.all(promises.map(chainNext))
  return { result, base }
}
process.on('uncaughtException', function (err) {
  console.log(err)
})
