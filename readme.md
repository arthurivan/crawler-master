<div align="center">

# 🕷️ Crawler Master

### *Real-time Web Performance Monitoring & Visualization*

![Node.js](https://img.shields.io/badge/node.js-v14+-green.svg)
![HTTP/2](https://img.shields.io/badge/HTTP/2-supported-blue.svg)
![WebSocket](https://img.shields.io/badge/WebSocket-real--time-orange.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)
![License](https://img.shields.io/badge/license-ISC-blue.svg)

A sophisticated web crawler that measures website performance metrics in real-time and visualizes them through interactive charts. Built with modern web technologies including HTTP/2, WebSockets, and MongoDB.

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [API](#-api)

</div>

---

## ✨ Features

- 🚀 **Real-time Performance Monitoring** - Track DNS lookup, TCP connection, TLS handshake, and content transfer times
- 📊 **Interactive Visualizations** - Live charts with hover details using HTML5 Canvas
- 🔄 **WebSocket Integration** - Instant updates without page refresh
- 🕸️ **Intelligent Crawling** - Discovers and crawls linked pages with configurable limits
- 💾 **Data Persistence** - Stores historical performance data in MongoDB
- 🔒 **HTTP/2 Support** - Modern protocol with server push capabilities
- 🎨 **Beautiful UI** - Responsive design with smooth animations
- ⚡ **Concurrent Processing** - Handles multiple URLs simultaneously with controlled concurrency

---

## 📂 Project Structure

```
crawler-master/
├── 📄 index.js              # Application entry point
├── 🖥️  server.js             # HTTP/2 server & WebSocket handler
├── 🔧 worker.js             # Web crawler & performance analyzer
├── 🗄️  db.js                 # MongoDB connection manager
├── 🌐 index.html            # Client-side interface
├── 📦 package.json          # Dependencies & scripts
└── 📁 public/
    ├── 📈 chart.js          # Real-time data visualization
    ├── 🔌 websocketClient.js # WebSocket communication
    ├── 📡 pubsub.js         # Event system
    └── 🎨 style.css         # UI styling
```

---

## ⚙️ Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- SSL certificates for HTTPS

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crawler-master
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure MongoDB**
   - Open `db.js`
   - Replace the MongoDB URI with your connection string:
   ```javascript
   const URI = 'mongodb+srv://username:password@cluster.mongodb.net/crawler?retryWrites=true'
   ```

4. **Generate SSL Certificates**
   ```bash
   # Create certificate directory
   mkdir -p ~/.cache/http2-push
   
   # Generate self-signed certificates (for development)
   openssl req -x509 -newkey rsa:4096 -keyout ~/.cache/http2-push/key.pem -out ~/.cache/http2-push/cert.pem -days 365 -nodes
   ```

---

## 🚀 Usage

### Starting the Server

```bash
node index.js
```

### Accessing the Application

1. Open your browser and navigate to:
   ```
   https://localhost:3000
   ```

2. **Accept the SSL certificate** (for self-signed certificates)

3. **Enter a URL** in the search box (e.g., `https://github.com`)

4. **Press Enter** or click the search button

5. **Watch the magic happen!** 🎉
   - Performance metrics appear in real-time
   - Interactive charts show timing breakdowns
   - Hover over chart bars to see detailed metrics

### Performance Metrics Explained

| Metric | Description |
|--------|-------------|
| 🔍 **DNS Lookup** | Time to resolve domain to IP address |
| 🔌 **TCP Connection** | Time to establish TCP connection |
| 🔒 **TLS Handshake** | Time for SSL/TLS negotiation |
| 📥 **First Byte** | Time to receive first byte of response |
| 📦 **Content Transfer** | Time to download complete response |
| ⏱️ **Total Time** | End-to-end request duration |

---

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    Client["🌐 Web Browser"] --> Server["🖥️ HTTP/2 Server"]
    Server --> Worker["🔧 Web Crawler"]
    Worker --> DB["🗄️ MongoDB"]
    Server --> Client
    
    subgraph "Real-time Communication"
        WS["🔌 WebSocket"]
    end
    
    Server -.-> WS
    WS -.-> Client
```

### Core Components

#### 🖥️ HTTP/2 Server (`server.js`)
- Serves static files with server push
- Handles WebSocket upgrades
- Manages real-time communication
- Implements custom WebSocket protocol

#### 🔧 Web Crawler (`worker.js`)
- Measures detailed performance metrics
- Extracts links from HTML content
- Implements concurrent crawling with limits
- Uses high-resolution timers for accuracy

#### 🗄️ Database Layer (`db.js`)
- MongoDB connection management
- Bulk write operations for performance
- Data aggregation and retrieval

#### 🌐 Client Interface
- **HTML5 Canvas** for real-time charts
- **WebSocket client** for live updates
- **Event-driven architecture** with pub/sub pattern
- **Responsive design** with smooth animations

---

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Override default settings
export HTTP2_PORT=3000
export MONGO_URI="mongodb+srv://..."
export CERT_PATH="~/.cache/http2-push"
```

### Crawler Settings

```javascript
// In worker.js
let pageAllowance = 50        // Maximum pages to crawl
const concurrencyLimit = 5    // Concurrent requests
```

---

## 📊 API Reference

### WebSocket Messages

#### Client → Server
```json
{
  "url": "https://example.com"
}
```

#### Server → Client
```json
{
  "url": "https://example.com/page",
  "timings": {
    "dnsLookup": 12.5,
    "tcpConnection": 25.3,
    "tlsHandshake": 45.7,
    "firstByte": 120.8,
    "contentTransfer": 89.2,
    "total": 293.5
  }
}
```

---

## 🛠️ Development

### Running in Development Mode

```bash
# Start with auto-reload (install nodemon first)
npm install -g nodemon
nodemon index.js
```

### Debug Mode

```bash
# Enable detailed logging
DEBUG=* node index.js
```

### Testing URLs

Try these URLs to see different performance characteristics:
- `https://github.com` - Fast, modern site
- `https://httpbin.org/delay/2` - Simulated latency
- `https://example.com` - Minimal page

---

## 🔍 Troubleshooting

### Common Issues

**SSL Certificate Errors**
```bash
# Regenerate certificates
openssl req -x509 -newkey rsa:4096 -keyout ~/.cache/http2-push/key.pem -out ~/.cache/http2-push/cert.pem -days 365 -nodes
```

**MongoDB Connection Issues**
- Check your connection string in `db.js`
- Verify MongoDB Atlas IP whitelist
- Ensure network connectivity

**WebSocket Connection Failed**
- Verify HTTPS is working first
- Check browser console for errors
- Ensure port 3000 is not blocked

---

## 🚀 Deployment

### Production Considerations

1. **Use valid SSL certificates** (Let's Encrypt recommended)
2. **Configure MongoDB Atlas** with proper security
3. **Set up reverse proxy** (nginx/Apache)
4. **Enable process management** (PM2)
5. **Configure monitoring** and logging

### Example PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'crawler-master',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

---

## 📈 Performance Tips

- **Adjust concurrency** based on your server capacity
- **Monitor MongoDB** performance and scaling
- **Implement rate limiting** for production use
- **Cache static assets** for better performance
- **Use CDN** for global deployment

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by modern web performance monitoring tools like GTmetrix and WebPageTest
- Built with love for the web development community
- Icons provided by [Font Awesome](https://fontawesome.com/)

---

<div align="center">

**Made with ❤️ for web performance enthusiasts**

⭐ Star this repo if you found it helpful!

</div>
