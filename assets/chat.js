ws = new WebSocket("ws://localhost:8080");
var opts = {
    lines: 11, // The number of lines to draw
    length: 18, // The length of each line
    width: 10, // The line thickness
    radius: 30, // The radius of the inner circle
    corners: 1, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#fff', // #rgb or #rrggbb or array of colors
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: '50%', // Top position relative to parent
    left: '50%' // Left position relative to parent
};
var target = document.getElementById('spinner');
var spinner = new Spinner(opts).spin(target);
var connected = false;
var authed = false;
var channelManager = function(){
    //this.chans = {};
    this.chans = new window.Basil();
    this.currentChannel = false;
    this.addAllChannels = function(){
        var keys = this.chans.keys();
        for (var i = 0; i < keys.length; i++) {
            ws.send(JSON.stringify({
                type: "channel",
                payload: {
                    channel: keys[i],
                    verb: "add"
                }
            }));
        }
    };
    this.renderChannelList = function() {
        var out = '<table class="table table-bordered">';
        var keys = this.chans.keys();
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] == this.currentChannel) {
                out += '<tr class="channel active"><td><span class="channelName">' + keys[i] + '</span><span class="glyphicon glyphicon-remove channelRemove"></span></td></tr>';
            }
            else if (this.chans.get(keys[i]).hasNewMessage) {
                out += '<tr class="channel warning"><td><span class="channelName"> ' + keys[i] + '</span><span class="glyphicon glyphicon-remove channelRemove"></span></td></tr>';
            }
            else {
                out += '<tr class="channel"><td><span class="channelName">' + keys[i] + '</span><span class="glyphicon glyphicon-remove channelRemove"></span></td></tr>';
            }
        }
        out += "</table>";
        $("#channelHolder").html(out);
    };
    this.renderMessageList = function(){
        if(this.currentChannel != false){
            var out = '<table class="table">';
            for(var i = 0; i < this.chans.get(this.currentChannel).messages.length; i++){
                out += '<tr>' + '<td style="width: 85px"><b>' + this.chans.get(this.currentChannel).messages[i].sender + "</b></td> <td>" + this.chans.get(this.currentChannel).messages[i].content + "</td>";
            }
            out += "</table>";
            $("#messageHolder").html(out);
        }
    };
    this.addChannel = function(name){
        if(this.chans.get(name) == null){
            this.chans.set(name, {
                messages: [],
                hasNewMessage: false
            });
        }
    };
    this.removeChannel = function(name){
        this.chans.remove(name);
    };
    this.setCurrentChan = function(name) {
        this.currentChannel = name;
        var chan = this.chans.get(name);
        chan.hasNewMessage = false;
        this.chans.set(name, chan);
        this.renderMessageList();
        this.renderChannelList();
        $("#nameHolder").html(name);
    };
    this.addMessage = function(name, message){
        var chan = this.chans.get(name);
        chan.messages.push(message);
        if(name == this.currentChannel) {
            this.chans.set(name, chan);
            this.renderMessageList();
        }
        else{
            chan.hasNewMessage = true;
            this.chans.set(name, chan);
            this.renderChannelList();
        }
    };
};
var channels = new channelManager();

ws.onopen = function(){
    connected = true;
    ws.send(JSON.stringify({
        type: "auth",
        payload: {
            key: session
        }
    }));
};
ws.onclose = function(){
    connected = false;
};
ws.onmessage = function(evt){
    var json = JSON.parse(evt.data);
    switch(json.type){
        case 'message':
            channels.addMessage(json.payload.channel, json.payload.message);
            break;
        case 'authreply':
            if(json.payload.done == true){
                $(target).hide();
                authed = true;
                channels.addAllChannels();
                channels.renderChannelList();
            }
            break;
        case 'channel':
            if(json.payload.verb == "add") {
                channels.addChannel(json.payload.channel);
                channels.renderChannelList();
            }
            else if(json.payload.verb == "remove"){
                if(json.payload.channel == channels.currentChannel){
                    channels.currentChannel = false;
                }
                channels.removeChannel(json.payload.channel);
                channels.renderChannelList();
            }
            else{
                alert("Channel action failed.");
            }
            break;
        default:
            alert("Unrecognized message received from server.");
            break;
    }
};
$("#sendButton").on("click", function(){
    if(channels.currentChannel != false) {
        channels.addMessage(channels.currentChannel, {
            content: $("#messageInput").val(),
            sender: "<mark>" + session.split("$$")[0] + "</mark>"
        });
        ws.send(JSON.stringify({
            type: "message",
            payload: {
                channel: channels.currentChannel,
                message: $("#messageInput").val()
            }
        }));
        $("#messageInput").val('');
        channels.renderMessageList();
    }
});
$("#addChannelButton").on("click", function(){
    ws.send(JSON.stringify({
        type: "channel",
        payload: {
            channel: $("#channelInput").val(),
            verb: "add"
        }
    }));
    $("#channelInput").val('');
});
$('#channelHolder').on('click', '.channel', function(e){
    if($(e.target).hasClass("channelRemove")){
        ws.send(JSON.stringify({
            type: "channel",
            payload: {
                channel: $(this).find('.channelName').first().html(),
                verb: "remove"
            }
        }));
    }
    else {
        channels.setCurrentChan($(this).find('.channelName').first().html());
    }
});