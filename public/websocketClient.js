function upgradeToWebSocket(url) {
  const ws = new WebSocket('wss://localhost:3000/', ['json'])
  ws.onopen = function () {
    console.log('WebSocket Client Connected')
    var msg = {
      url
    }

    // Send the msg object as a JSON-formatted string.
    ws.send(JSON.stringify(msg))
  }
  ws.onmessage = function (e) {
    const data = JSON.parse(e.data)
    events.emit('cheese', data)
  }
  ws.onerror = function (e) {
    console.log("Received: '" + e + "'")
  }
  // const message = {
  //   type: 'message',
  //   date: Date.now()
  // }
}
