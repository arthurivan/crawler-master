var sampleData = {
  timings:{
    dnsLookup: 9.337165,
    tcpConnection: 7.812277,
    tlsHandshake: 24.731243,
    firstByte: 283.233216,
    contentTransfer: 34.751341,
    total: 359.865242
  }
}
const canvas = document.getElementById('myCanvas')
canvas.setAttribute('display', 'none')
const cx = canvas.getContext('2d')
const canvasWidth = window.innerWidth
const canvasFloor = window.innerHeight - 10
cx.canvas.width = canvasWidth
cx.canvas.height = canvasFloor
const parts = Object.keys(sampleData.timings)
const total = parts.splice(parts.length - 1, 1)
const colors = ['#003D73', '#0878A4', '#1ECFD6', '#EDD170', '#C05640']
const priority = 3
let posX = 5
const cache = []

events.on('cheese', function (data) {
  cache.push(data)
  let pos = canvasFloor
  for (let i = 0; i < parts.length; i++) {
    const stack = parts[(i + priority) % parts.length]
    const stackHeight = data.timings[stack]
    pos = pos - stackHeight
    cx.beginPath()
    cx.rect(posX, pos, ((canvasWidth - 5) / 100) - 2, stackHeight)
    cx.fillStyle = colors[(i + priority) % parts.length]
    cx.fill()
  }
  posX += (canvasWidth - 5) / 100
})

const input = document.getElementsByTagName('input')[0]

// Execute a function when the user releases a key on the keyboard
input.addEventListener('keyup', function (event) {
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Cancel the default action, if needed
    event.preventDefault()
    // Trigger the button element with a click
    document.getElementsByTagName('a')[0].click()
  }
})

var linkEl = document.getElementsByTagName('a')[0]

function isURL(str) {
  var regex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?")
  var result = regex.test(str);
  return result;
}

linkEl.addEventListener('click', (event) => {
  event.preventDefault()
  console.log(input.value)
  if (isURL(input.value)) {
    document.getElementsByClassName('search-box')[0].setAttribute('hidden', 'true')
    canvas.setAttribute('display', 'block')
    upgradeToWebSocket(input.value)
  } else {
    input.value = ''
  }
})

function getMousePos (evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  }
}
function writeMessage (message) {
  cx.clearRect(0, 0, 700, 50)
  cx.clearRect(0, 0, 400, 200)
  cx.font = '18pt Calibri'
  cx.fillStyle = 'black'
  const messagesArray = Object.entries(message.timings)
  cx.fillText(message.url, 10, 25)
  cx.fillText(messagesArray[0].join(' '), 10, 50)
  cx.fillText(messagesArray[1].join(' '), 10, 75)
  cx.fillText(messagesArray[2].join(' '), 10, 100)
  cx.fillText(messagesArray[3].join(' '), 10, 125)
  cx.fillText(messagesArray[4].join(' '), 10, 150)
  cx.fillText(messagesArray[5].join(' '), 10, 175)
}
canvas.addEventListener('mousemove', function (evt) {
  var mousePos = getMousePos(evt)
  var message = Math.floor((mousePos.x - 5) / ((canvasWidth - 5) / 100))
  cx.font = '18pt Calibri'
  cx.fillStyle = 'black'
  writeMessage(cache[message])
}, false)
