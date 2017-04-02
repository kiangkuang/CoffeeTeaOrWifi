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
    console.log(JSON.stringify(session.message));

    var params = {
        query: "Coffeeshops with WiFi",
        limit: 5
    };

    if (session.message.attachments.length && session.message.attachments[0].type === "location") {
        var coords = session.message.attachments[0].payload.coordinates;
        params.ll = coords.lat + ", " + coords.long;
    } else {
        params.near = session.message.text;
    }

    Foursquare.exploreVenues(params, function (error, venues) {
        if (error) {
            console.log(JSON.stringify(error));
            session.send("I can't find this location!");
            return;
        }

        console.log(JSON.stringify(venues));

        if (!venues.response.groups[0].items.length) {
            session.send("I can't find anything here!");
            return;
        }

        var places = venues.response.groups[0].items.map(function (element) {
            return {
                name: element.venue.name,
                address: element.venue.location.address
            }
        });

        session.send(FixBotNewLine(JSON.stringify(places, null, "\t")));
    });
});

function FixBotNewLine(string) {
    return string.replace("\n", "\n\n");
}
