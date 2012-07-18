'use strict'

var EventEmitter = require('events').EventEmitter

function ServerEventSource(option) {

	this.option = Object.create(ServerEventSource.defaultOption)
	if (option) Object.keys(option).forEach(function(k){
		this.option[k] = option[k]
	}, this)
	
	this.events = []
	this.bufferSize = 0
	this.lastEventId = this.option.firstEventId
	this.emitter = new EventEmitter()
}

ServerEventSource.defaultOption = {
	trackEventId: true,
	firstEventId: 10000,
	maxBufferSize: 1000000, // about 2MB
}

ServerEventSource.headers = { 'Content-Type': 'text/event-stream' }

ServerEventSource.prototype.nextEventId = function () {
	return this.option.trackEventId ? ++this.lastEventId : null
}
ServerEventSource.prototype.eventIndexOf = function (id) {
	if (id == null || !this.option.trackEventId) return null
	var i = this.events.length - 1 - this.lastEventId + parseInt(id)
	if (!(i >= 0 && i < this.events.length)) i = -1
}

ServerEventSource.prototype.clear = function (lastEventId) {
	console.log('clear', lastEventId)
	if (lastEventId) {
		var index = this.eventIndexOf(lastEventId) + 1
		this.events.splice(0, index)
	} else {
		this.events = []
	}
}


ServerEventSource.prototype.on = function (event, listener) {
	this.emitter.on(event, listener)
}
ServerEventSource.prototype.once = function (event, listener) {
	this.emitter.once(event, listener)
}
ServerEventSource.prototype.off = function (event, listener) {
	if (listener === undefined)
		this.emitter.removeAllListener(event)
	else
		this.emitter.removeListener(event, listener)
}
ServerEventSource.prototype.fire = function (event, data) {
	var result = this.emitter.emit.apply(this.emitters, arguments)
	
	if (event === 'sse') return
	
	var id = this.nextEventId()
	
	var s = data == null ?
			'' : (data.replace(/^/gm, 'data: ') + '\n')
	if (event !== 'message') s += 'event: ' + event + '\n'
	if (id != null) s += 'id: ' + id + '\n'
	s += '\n'
	
	
	var evt = {
		type: event,
		data: data,
		lastEventId: id,
		timeStamp: Date.now(),
		toString: function() { return s }
	}
	if (this.option.maxBufferSize) {
		this.bufferSize += s.length
		if (this.bufferSize > this.option.maxBufferSize) this.clear()
		this.events.push(evt)
	}
	this.emitter.emit('sse', evt)
}
ServerEventSource.prototype.send = function (data) {
	console.log('send', data)
	this.fire('message', data)
}

ServerEventSource.prototype.addClient = function (request, response, filter) {
	response.writeHead(200, ServerEventSource.headers)
	
	var push = filter == null ?
		function (evt) { response.write(evt.toString()) } :
		function (evt) {
			try {
				if (filter(evt)) {
					response.write(evt.toString())
				}
			} catch(e) {}
		}
	
	var i = this.eventIndexOf(request.headers['Last-Event-ID']) + 1
	while (i < this.events.length) {
		push(this.events[i])
		i++
	}
	
	var evtSrc = this
	evtSrc.on('sse', push)
	response.once('close', function(){
		evtSrc.off('sse', push)
	})	
}


/*
setInterval(function () {
	responses.forEach(function () {
		res.write(':noop\n')
	})
}, 15000)

}*/

exports.ServerEventSource = ServerEventSource
