var Restify = require("restify");
var Builder = require("botbuilder");
var Foursquare = (require("foursquarevenues"))(process.env.FS_CLIENTIDKEY, process.env.FS_CLIENTSECRETKEY);

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var Server = Restify.createServer();
Server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log("%s listening to %s", Server.name, Server.url);
});

// Create chat bot
var Connector = new Builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var Bot = new Builder.UniversalBot(Connector);
Server.post("/api/messages", Connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

Bot.dialog("/", function (session) {
    console.log(session);
    session.send(session.message.text);
});
