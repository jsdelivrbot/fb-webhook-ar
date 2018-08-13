var request = require('request');
var mainFile = require('./index');
var timerDict = {};

module.exports = function (app) {
    //
    // GET /bot
    //
    app.get('/bot', function (request, response) {
        if (request.query['hub.mode'] === 'subscribe' &&
            request.query['hub.verify_token'] === "skyvu_ar") {
            console.log("Validating webhook");
            response.status(200).send(request.query['hub.challenge']);
        } else {
            console.error("Failed validation. Make sure the validation tokens match.");
            response.sendStatus(403);
        }
    });

    app.get('/wake', function (request, response) {
        console.log("WAKE UP!");
    });

    //
    // POST /bot
    //
    app.post('/bot', function (request, response) {
        var data = request.body;
        console.log('received bot webhook');
        // Make sure this is a page subscription
        if (data.object === 'page') {
            console.log('data.object : ' + data.object);
            // Iterate over each entry - there may be multiple if batched
            data.entry.forEach(function (entry) {
                var pageID = entry.id;
                var timeOfEvent = entry.time;
                // Iterate over each messaging event
                entry.messaging.forEach(function (event) {
                    if (event.message) {
                        console.log('received Message');
                        receivedMessage(event);
                    } else if (event.game_play) {
                        console.log('received GamePlay');
                        receivedGameplay(event);
                    } else {
                        console.log("Webhook received unknown event: ", event);
                    }
                });
            });
        }
        response.sendStatus(200);
    });

    //
    // Handle messages sent by player directly to the game bot here
    //
    function receivedMessage(event) {
    }

    //
    // Handle game_play (when player closes game) events here.
    //
    function receivedGameplay(event) {
        // Page-scoped ID of the bot user
        var senderId = event.sender.id;

        // FBInstant player ID
        var playerId = event.game_play.player_id;

        // FBInstant context ID
        var contextId = event.game_play.context_id;

        // Check for payload
        if (event.game_play.payload) {
            //
            // The variable payload here contains data set by
            // FBInstant.setSessionData()
            //
            var payload = JSON.parse(event.game_play.payload);

            // In this example, the bot is just "echoing" the message received
            // immediately. In your game, you'll want to delay the bot messages
            // to remind the user to play 1, 3, 7 days after game play, for example.
            sendMessage(senderId, null, "Message to game client: '" + payload.message + "'", "Play now!", payload, null);
        }
        else {
            console.log(mainFile.News().content + " : " + mainFile.News().title + " : " + mainFile.News().url);
            sendMessage(senderId, null, mainFile.News().content, mainFile.News().title, null, mainFile.News().url);
        }
    }

    //
    // Send bot message
    //
    // player (string) : Page-scoped ID of the message recipient
    // context (string): FBInstant context ID. Opens the bot message in a specific context
    // message (string): Message text
    // cta (string): Button text
    // payload (object): Custom data that will be sent to game session
    //
    function sendMessage(player, context, message, cta, payload, image) {
        var button = {
            type: "game_play",
            title: cta
        };

        if (context) {
            button.context = context;
        }
        if (payload) {
            button.payload = JSON.stringify(payload)
        }
        var messageData = {
            recipient: {
                id: player
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "media",
                        elements: [
                            {
                                media_type: "video",
                                url: image,
                                buttons: [button]
                            }
                        ]
                    }
                }
            }
        };

        callSendAPI(player, messageData);
    }

    function callSendAPI(player, messageData) {
        if (timerDict[player] === null || timerDict[player] === undefined) {
            SetTimer(86400000, messageData, player, false);
            SetTimer(86400000 * 7, messageData, player, false);
            SetTimer(86400000 * 30, messageData, player, false);
        }
        else {
            clearTimeout(timerDict[player]);
            console.log("TIMER RESET");
        }
        timerDict[player] = SetTimer(mainFile.News().loopTime, messageData, player, true);
    }

    function SetTimer(time, messageData, player, loop) {
        var timer = setTimeout(function () {
            //var graphApiUrl = 'https://graph.facebook.com/me/messages?access_token=EAACZC0BT8NbcBAKoZANpXjaI0iZAQ37Eq6w0b0QNRSp39xTtZCGmR2ZCPO87p2GEpZAQbwZCSoSKmniRlaCeIYG5XdVT31cxIYAq1dzbq4eeRKojj2kRj586HtDv3S6upcKmN7sLVZAiqnJ6uUh260nMvIYuaRSG1QvyyQQBqWXwPBhkbksxqmbh'
            var graphApiUrl = 'https://graph.facebook.com/me/messages?access_token=EAAGqhR4rBPABAEa754D3GQEKBzTdf6AkEuH2kHotrh7SRzZBa0gZAUZCwl2ZB2nNiK8FeCeadeutrBfLwB2ZBON5MxXGc1ZB97ytXTFawpWr2SFWVln5iXs5PzaHMa87q1ssmyTxyn9m3GTUtOPeBmpdWY8tGpA1UCc5SJqzrJpgZDZD'
            request({
                url: graphApiUrl,
                method: "POST",
                json: true,
                body: messageData
            }, function (error, response, body) {
                console.error('send api returned', 'error', error, 'status code', response.statusCode, 'body', body);
            });

            if (loop) {
                timerDict[player] = SetTimer(mainFile.News().loopTime, messageData, player, true);
            }
        }, time);

        return timer;
    }
}