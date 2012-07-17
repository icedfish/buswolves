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

var bus = []

app.get('/', function (req, res) {
	res.render('viewlog', {bus:bus})
})
app.get('/bus', function (req, res) {
	if (req.accepts('json')) res.send(bus.map(function(_, i){ return '/bus/' + i }))
	res.render('bus', {bus:bus})
})
app.get('/bus/:channel/:filter?', function (req, res) {
	//console.log(req.params.channel, req.params.filter)
	var ch = bus[req.params.channel]
	if (!ch) return res.send('No such channel', 404)
	var filter = req.params.filter
	console.log('filter', filter)
	try {
		var re = new RegExp(filter)
		filter = function(evt){
			return re.test(evt.data)
		}
	} catch(e) {
		filter = null
	}
	ch.addClient(req, res, filter)
})
var server = net.createServer(function(socket){
	//socket.write('Echo server\r\n');
	var channel = new sse.ServerEventSource()
	bus.push(channel)
	socket.setEncoding()
	socket.on('data', function(data){
		var lines = data.split('\n')
		if (lines[lines.length - 1] === '') lines.pop()
		lines.forEach(function(line){
			channel.send(line)
		})
	})
})

app.listen(3000, function(){
	console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
})
server.listen(1095)
