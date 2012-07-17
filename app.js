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

var bus = new sse.ServerEventSource()

app.get('/', function (req, res) {
	res.render('viewlog')
})
app.get('/update-logs', function (req, res) {
	bus.addClient(req, res)
})
var server = net.createServer(function(socket){
	//socket.write('Echo server\r\n');
	socket.setEncoding()
	socket.on('data', function(data){
		var lines = data.split('\n')
		lines.forEach(function(line){
			bus.send(line)
		})
	})
})

app.listen(3000, function(){
	console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
})
server.listen(1095)
