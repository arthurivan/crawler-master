const http2 = require('http2')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const chicken = require('./worker')

const HTTP2_PORT = 3000
function generateWebsocketAccept (acceptKey) {
  return crypto
    .createHash('sha1')
    .update(acceptKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64')
}
module.exports = function main (db) {
  var dir = path.join(os.homedir(), '/.cache/http2-push')
  var { key, cert } = {
    key: fs.readFileSync(path.join(dir, 'key.pem')),
    cert: fs.readFileSync(path.join(dir, 'cert.pem'))
  }

  var MDN = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png'
  }
  const getType = function (fileName) {
    const match = /\.[^.\\/:*?"<>|\r\n]+$/.exec(fileName)
    return MDN[match[0]]
  }

  const sendFile = (stream, fileName) => {
    const fd = fs.openSync(fileName, "r")
    const stat = fs.fstatSync(fd)
    const headers = {
      "content-length": stat.size,
      "last-modified": stat.mtime.toUTCString(),
      "content-type": getType(fileName)
    }
    stream.respondWithFD(fd, headers)
    stream.on("close", () => {
      console.log('closing file', fileName)
      fs.closeSync(fd)
    })
    stream.end()
  }

  const pushFile = (stream, path, fileName) => {
    stream.pushStream({ ":path": path }, (err, pushStream) => {
      if (err) {
        throw err
      }
      sendFile(pushStream, fileName)
    })
  }

  const http2Handlers = (req, res) => {
    if (req.url === '/' || req.url === 'index.html') {
      const files = fs.readdirSync(`${__dirname}/public`)
      for (let i = 0; i < files.length; i++) {
        const absolutePath = `${__dirname}/public/` + files[i]
        const relativePath = '/public/' + files[i]
        pushFile(res.stream, relativePath, absolutePath)
      }

      sendFile(res.stream, `${__dirname}/index.html`)
    } else {
      // send empty response for favicon.ico
      if (req.url === '/favicon.ico') {
        res.stream.respond({ ':status': 200 })
        res.stream.end()
      }
    }
  }

  const server = http2.createSecureServer({ key, cert, allowHTTP1: true }, http2Handlers)

  server.listen(HTTP2_PORT, () => {
    console.log('The server is listening on HTTP2_PORT ', HTTP2_PORT)
  })

  const websocketUpgradeHandler = function (req, socket) {
    if (req.headers.upgrade !== 'websocket') {
      socket.end('HTTP/1.1 400 Bad Request')
      return
    }
    // Read the websocket key provided by the client:
    const websocketKey = req.headers['sec-websocket-key']
    // Generate the response value to use in the response:
    const hash = generateWebsocketAccept(websocketKey)
    // Write the HTTP response into an array of response lines:
    const responseHeaders = ['HTTP/1.1 101 Web Socket Protocol Handshake', 'Upgrade: WebSocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${hash}`]
    // Read the subprotocol from the client request headers:
    const protocol = req.headers['sec-websocket-protocol']
    // If provided, they'll be formatted as a comma-delimited string of protocol
    // names that the client supports; we'll need to parse the header value, if
    // provided, and see what options the client is offering:
    const protocols = !protocol ? [] : protocol.split(',').map(s => s.trim())
    // To keep it simple, we'll just see if JSON was an option, and if so, include
    // it in the HTTP response:
    if (protocols.includes('json')) {
      // Tell the client that we agree to communicate with JSON data
      responseHeaders.push('Sec-WebSocket-Protocol: json')
    }
    // Write the response back to the client socket, being sure to append two
    // additional newlines so that the browser recognises the end of the response
    // header and doesn't continue to wait for more header data:
    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n')

    async function craftBulkWrite({ result, base }) {
      let pagesToWrite = Object.values(result).map((page) => (
        {
          updateOne: {
            filter: { url: page.url },
            update: {
              $min: {
                dnsLookup: page.dnsLookup,
                tcpConnection: page.tcpConnection,
                tlsHandshake: page.tlsHandshake,
                firstByte: page.firstByte,
                contentTransfer: page.contentTransfer,
                total: page.contentTransfer,
              },
              $max: {
                spotted: page.spotted
              }
            },
            upsert: true
          }
        }
      ))
      let bulkWriteResponse =  await db.collection(base).bulkWrite(pagesToWrite, { ordered: false })
      let read = await db.collection(base).find({}).toArray();
      return read;
    }
    socket.on('data', buffer => {
      const url = parseMessage(buffer)
      if (url) {
        chicken(socket, constructReply, url).then((pages) => { return craftBulkWrite(pages) })
          .then(response => console.log(response))
          .catch(err => console.log(err))
      } else if (url === null) {
        console.log('WebSocket connection closed by the client.')
      }
    })

    function parseMessage (frame) {
      const firstByteOfFrame = frame.readUInt8(0)
      const opCode = firstByteOfFrame & parseInt(0xF)
      if (opCode === parseInt(0x8)) {
        return null
      }
      if (opCode !== parseInt(0x1)) {
        return
      }
      const secondByteOfFrame = frame.readUInt8(1)
      const isMasked = Boolean((secondByteOfFrame >>> 7) & parseInt(0x1))
      let currentByteOfFrame = 2
      const payloadByteLength = secondByteOfFrame & parseInt(0x7F)
      if (!isMasked) {
        return
      }
      const maskingKey = frame.readUInt32BE(currentByteOfFrame)
      currentByteOfFrame += 4
      const data = Buffer.alloc(payloadByteLength)
      for (let i = 0; i < payloadByteLength; i++) {
        const mask = maskingKey >> (3 - (i % 4) << 3) & parseInt(0xFF)
        const source = frame.readUInt8(currentByteOfFrame++)
        data.writeUInt8(mask ^ source, i)
      }
      const json = data.toString('utf8')
      return JSON.parse(json)
    }

    function constructReply (data) {
      // Convert the data to JSON and copy it into a buffer
      const json = JSON.stringify(data)
      const jsonByteLength = Buffer.byteLength(json)
      // Note: we're not supporting > 65535 byte payloads at this stage
      const lengthByteCount = jsonByteLength < 126 ? 0 : 2;
      const payloadLength = lengthByteCount === 0 ? jsonByteLength : 126
      const buffer = Buffer.alloc(2 + lengthByteCount + jsonByteLength)
      // Write out the first byte, using opcode `1` to indicate that the message
      // payload contains text data
      buffer.writeUInt8(0b10000001, 0)
      buffer.writeUInt8(payloadLength, 1)
      // Write the length of the JSON payload to the second byte
      let payloadOffset = 2
      if (lengthByteCount > 0) {
        buffer.writeUInt16BE(jsonByteLength, 2); payloadOffset += lengthByteCount
      }
      // Write the JSON data to the data buffer
      buffer.write(json, payloadOffset)
      return buffer
    }
  }
  server.on('upgrade', websocketUpgradeHandler)
}
