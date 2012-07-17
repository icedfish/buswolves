var express = require('express'),
	net = require('net'),
	sse = require('./sse')

var app = express.createServer()

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views')
	app.set('view engine', 'jade')
	app.set('view options', { layout: false })
	app.use(express.bodyParser())
	app.use(express.methodOverride())
	app.use(app.router)
	app.use(express.static(__dirname + '/public'))
})
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
})
app.configure('production', function(){
  app.use(express.errorHandler())
})


// Application

var bus = {}

function findChannel(name) {
	if (name in bus)
		return bus[name]
	else
		return bus[name] =
			new sse.ServerEventSource({trackEventId:true, maxBufferSize:1000000})
}
			
function busUrls() {
	return Object.keys(bus).map(function(name){ return '/bus/' + name + '/' })
}

app.get('/', function (req, res) {
	res.render('viewlog', {urls:busUrls()})
})
app.get('/bus', function (req, res) {
	var urls = busUrls()
	if (req.accepts('html'))
		res.render('bus', {urls:urls})
	else if (req.accepts('json'))
		res.send(urls)
})
app.get('/bus/:channel/:filter?', function (req, res) {
	//console.log(req.params.channel, req.params.filter)
	var ch = bus[req.params.channel]
	if (!ch) return res.send('No such channel', 404)
	var filter = req.params.filter
	console.log('filter', filter)
	if (filter) {
		if (/^\s*function\s*/.test(filter)) {
			try {
				filter = new Function('return ' + filter)()
			} catch(e) {}
		}
		if (typeof filter !== 'function')
		try {
			var re = new RegExp(filter)
			filter = function(evt){
				return re.test(evt.data)
			}
		} catch(e) {
			var str = filter
			filter = function(evt){
				return evt.data.indexOf(str) !== -1
			}
		}
	}
	ch.addClient(req, res, filter)
})
var server = net.createServer(function(socket){
	//socket.write('Echo server\r\n');
	socket.setEncoding()
	
	socket.once('data', function(data){
		var channel, i = data.indexOf('\n\n')
		if (i >= 0) {
			var name = data.slice(0, i).split('\n', 1)[0].trim()
			channel = findChannel(name)
			process(data.slice(i + 2))
		} else {
			channel = findChannel('wolves')
			process(data)
		}
		socket.on('data', process)
		
		function process(data){
			var lines = data.split('\n')
			if (lines[lines.length - 1] === '') lines.pop()
			lines.forEach(function(line){
				channel.send(line)
			})
		}
	})	
})

app.listen(3000, function(){
	console.log("Express HTTP server started!");
})
server.listen(1095)
